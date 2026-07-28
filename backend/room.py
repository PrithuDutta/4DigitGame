import threading
import time

from game_state import GameState

SLOT_ORDER = ("p1", "p2", "p3")
SLOT_TO_KEY = {"p1": "enter", "p2": "shift", "p3": "mouse"}


class RoomError(Exception):
    """Base class for room errors — surfaced to the client as {code, message}."""

    code = "room_error"


class RoomFullError(RoomError):
    code = "room_full"


class ModeNotSelectedError(RoomError):
    code = "mode_not_selected"


class AlreadyStartedError(RoomError):
    code = "already_started"


class InvalidNameError(RoomError):
    code = "invalid_name"


class NotHostError(RoomError):
    code = "not_host"


class PlayerNotFoundError(RoomError):
    code = "player_not_found"


class InvalidScoresError(RoomError):
    code = "invalid_scores"


class Player:
    __slots__ = ("player_id", "name", "slot", "sid", "connected")

    def __init__(self, player_id, name, slot, sid):
        self.player_id = player_id
        self.name = name
        self.slot = slot
        self.sid = sid
        self.connected = True


class Room(GameState):
    """One online match. Adds room/player bookkeeping on top of GameState's
    unmodified round/score state machine — every phase transition, scoring
    call, and to_dict() field it inherits behaves exactly as it does for the
    local single-device game.
    """

    def __init__(self, room_code, host_player_id):
        super().__init__()
        self.room_code = room_code
        self.host_player_id = host_player_id
        self.players: dict[str, Player] = {}
        self.created_ts = time.time()
        self.last_activity_ts = self.created_ts
        self.lock = threading.Lock()

    # --- seating ---

    def _required_slots(self):
        if self.mode == "3p":
            return SLOT_ORDER
        if self.mode == "2p":
            return SLOT_ORDER[:2]
        return ()

    def _taken_slots(self):
        return {p.slot for p in self.players.values()}

    def _next_open_slot(self):
        taken = self._taken_slots()
        for slot in self._required_slots():
            if slot not in taken:
                return slot
        return None

    def _seats_full(self):
        required = self._required_slots()
        return bool(required) and set(required) <= self._taken_slots()

    def add_player(self, player_id, name, sid):
        name = (name or "").strip()
        if not name:
            raise InvalidNameError("Please enter a name.")

        is_host_seat = player_id == self.host_player_id
        if is_host_seat:
            slot = "p1"
        else:
            if self.mode is None:
                raise ModeNotSelectedError("The host hasn't picked a mode yet.")
            if self.phase not in ("mode_select", "name_entry"):
                raise AlreadyStartedError("This game has already started.")
            slot = self._next_open_slot()
            if slot is None:
                raise RoomFullError("This room is full.")

        self.players[player_id] = Player(player_id, name, slot, sid)
        setattr(self, f"{slot}_name", name)
        self.last_activity_ts = time.time()

        if not is_host_seat and self._seats_full():
            self._start_round()

        return slot

    def reconnect(self, player_id, sid):
        player = self.players.get(player_id)
        if player is None:
            raise PlayerNotFoundError("You're not in this room anymore.")
        player.sid = sid
        player.connected = True
        self.last_activity_ts = time.time()
        return player.slot

    def mark_disconnected(self, player_id):
        player = self.players.get(player_id)
        if player is not None:
            player.connected = False
            player.sid = None

    def remove_player(self, player_id):
        self.players.pop(player_id, None)
        if player_id == self.host_player_id and self.players:
            self.host_player_id = next(iter(self.players))
        return not self.players

    # --- host actions ---

    def select_mode(self, player_id, mode):
        if player_id != self.host_player_id:
            raise NotHostError("Only the host can pick a mode.")
        self.set_mode(mode)
        if self._seats_full():
            self._start_round()

    def back_to_mode_select_as_player(self, player_id):
        if player_id != self.host_player_id:
            raise NotHostError("Only the host can do that.")
        self.back_to_mode_select()

    # --- player actions ---

    def _slot_for(self, player_id):
        player = self.players.get(player_id)
        if player is None:
            raise PlayerNotFoundError("You're not in this room.")
        return player.slot

    def press_as_player(self, player_id):
        self.press(SLOT_TO_KEY[self._slot_for(player_id)])
        self.last_activity_ts = time.time()

    def score_ready_as_player(self, player_id):
        self.score_ready(SLOT_TO_KEY[self._slot_for(player_id)])
        self.last_activity_ts = time.time()

    # --- serialization ---

    def to_dict(self):
        # Deliberately omits player tokens (including host_player_id) — only
        # {slot, name, connected, is_host} goes out over the broadcast, so no
        # client can read another player's token off the wire and hijack
        # their seat via rejoin_room. Each client learns its own token once,
        # via the targeted `session` event.
        data = super().to_dict()
        data["room_code"] = self.room_code
        data["players"] = [
            {
                "slot": p.slot,
                "name": p.name,
                "connected": p.connected,
                "is_host": p.player_id == self.host_player_id,
            }
            for p in sorted(self.players.values(), key=lambda p: p.slot)
        ]
        return data
