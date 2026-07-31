import random
import threading
import time

from game_state import GameState, ROUNDS_PER_GAME, generate_4digit_number
from scoring import PlayerRoundResult, score_round


class RoomError(Exception):
    """Base class for room errors — surfaced to the client as {code, message}."""

    code = "room_error"


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
    __slots__ = ("player_id", "name", "slot", "sid", "connected", "score", "ready", "clicked", "press_time", "is_bot")

    def __init__(self, player_id, name, slot, sid):
        self.player_id = player_id
        self.name = name
        self.slot = slot
        self.sid = sid
        self.connected = True
        self.score = 0.0
        self.ready = False
        self.clicked = False
        self.press_time = None
        self.is_bot = False


class Room(GameState):
    """One online match. Supports unlimited players playing on separate devices."""

    def __init__(self, room_code, host_player_id):
        super().__init__()
        self.room_code = room_code
        self.host_player_id = host_player_id
        self.players: dict[str, Player] = {}
        self.created_ts = time.time()
        self.last_activity_ts = self.created_ts
        self.lock = threading.Lock()
        self.mode = "online"
        self.phase = "mode_select"

    def calculate_bot_delay_ms(self) -> float:
        """Calculate random delay between fastest_time_ms and slowest_time_ms.
        Fallback to a random delay between 5,000ms and 15,000ms if values are None.
        """
        if self.fastest_time_ms is not None and self.slowest_time_ms is not None:
            low = min(self.fastest_time_ms, self.slowest_time_ms)
            high = max(self.fastest_time_ms, self.slowest_time_ms)
            if low == high:
                high = low + 1000.0
            return random.uniform(low, high)
        return random.uniform(5000.0, 15000.0)

    def update_solve_time_stats(self, solve_time_ms: float):
        if solve_time_ms is None or solve_time_ms <= 0:
            return
        if self.fastest_time_ms is None or solve_time_ms < self.fastest_time_ms:
            self.fastest_time_ms = solve_time_ms
        if self.slowest_time_ms is None or solve_time_ms > self.slowest_time_ms:
            self.slowest_time_ms = solve_time_ms

    # --- seating ---

    def add_player(self, player_id, name, sid):
        name = (name or "").strip()
        if not name:
            raise InvalidNameError("Please enter a name.")

        if self.phase not in ("mode_select", "name_entry", "lobby"):
            raise AlreadyStartedError("This game has already started.")

        if player_id in self.players:
            p = self.players[player_id]
            p.name = name
            p.sid = sid
            p.connected = True
            p.is_bot = False
            return p.slot

        slot = f"p{len(self.players) + 1}"
        self.players[player_id] = Player(player_id, name, slot, sid)
        self.last_activity_ts = time.time()
        return slot

    def reconnect(self, player_id, sid):
        player = self.players.get(player_id)
        if player is None:
            raise PlayerNotFoundError("You're not in this room anymore.")
        player.sid = sid
        player.connected = True
        player.is_bot = False
        self.last_activity_ts = time.time()
        return player.slot

    def mark_disconnected(self, player_id):
        player = self.players.get(player_id)
        if player is not None:
            player.is_bot = True
            player.connected = True
            player.sid = None

    def remove_player(self, player_id):
        self.players.pop(player_id, None)
        if player_id == self.host_player_id and self.players:
            self.host_player_id = next(iter(self.players))
        return not self.players

    # --- host actions ---

    def start_game(self, player_id):
        if player_id != self.host_player_id:
            raise NotHostError("Only the host can start the game.")
        if not self.players:
            raise RoomError("Need at least one player to start.")
        if self.phase not in ("mode_select", "name_entry", "lobby"):
            raise AlreadyStartedError("Game has already started.")

        for p in self.players.values():
            p.score = 0.0
            p.ready = False
            p.clicked = False
            p.press_time = None

        self.round_number = 1
        self.round_history = []
        self.game_numbers = [generate_4digit_number(self.difficulty) for _ in range(ROUNDS_PER_GAME)]

        # Start 3-second countdown phase before round 1
        self.phase = "countdown"
        now = time.time()
        self.deadline_ts = now + 3.0
        self.round_started = False

    def select_mode(self, player_id, mode=None):
        # Kept for compatibility — host starting the game is the primary transition now
        if player_id != self.host_player_id:
            raise NotHostError("Only the host can pick a mode.")
        self.start_game(player_id)

    def back_to_mode_select_as_player(self, player_id):
        if player_id != self.host_player_id:
            raise NotHostError("Only the host can do that.")
        self.phase = "mode_select"
        self.round_number = 0
        self.round_history = []
        for p in self.players.values():
            p.ready = False
            p.clicked = False
            p.press_time = None

    # --- game round logic ---

    def _start_round(self):
        self.phase = "round"
        if hasattr(self, "game_numbers") and self.game_numbers and 1 <= self.round_number <= len(self.game_numbers):
            self.number = self.game_numbers[self.round_number - 1]
        else:
            self.number = generate_4digit_number(self.difficulty)

        for p in self.players.values():
            p.clicked = False
            p.press_time = None

        now = time.time()
        self.round_start_ts = now
        self.deadline_ts = now + 90.0
        self.round_started = True

    def press_as_player(self, player_id):
        if self.phase != "round":
            return
        player = self.players.get(player_id)
        if player is None or player.clicked:
            return

        player.clicked = True
        player.press_time = time.time()
        self.last_activity_ts = time.time()
        self._maybe_finish()

    def _maybe_finish(self):
        connected_players = [p for p in self.players.values() if p.connected]
        if connected_players and all(p.clicked for p in connected_players):
            self._finish_round()

    def timeout(self):
        if self.phase == "countdown":
            self._start_round()
        elif self.phase == "round" and self.round_started:
            self._finish_round()

    def _finish_round(self):
        self.deadline_ts = None

        # Build results for all players
        results = []
        solve_times = {}
        sorted_players = sorted(self.players.values(), key=lambda p: p.slot)

        for p in sorted_players:
            solved = p.clicked
            solve_time = (p.press_time - self.round_start_ts) if solved and p.press_time else None
            solve_times[p.player_id] = solve_time
            if solve_time is not None:
                self.update_solve_time_stats(solve_time * 1000.0)
            results.append(PlayerRoundResult(player_id=p.player_id, solved=solved, solve_time=solve_time))

        scores = score_round(results)
        score_by_pid = {s.player_id: s for s in scores}

        self.last_round_scores = {}
        for p in sorted_players:
            s = score_by_pid.get(p.player_id)
            if s:
                p.score += s.round_score
                self.last_round_scores[p.player_id] = {
                    "solve_time": solve_times[p.player_id],
                    "solve_bonus": s.solve_bonus,
                    "speed_bonus": s.speed_bonus,
                    "rank_bonus": s.rank_bonus,
                    "round_score": s.round_score,
                }

        solvers = sorted((p for p in sorted_players if p.clicked), key=lambda p: solve_times[p.player_id] or 999.0)
        if solvers:
            parts = [f"{p.name} +{score_by_pid[p.player_id].round_score:.0f}" for p in solvers]
            self.score_message = "SOLVED: " + ", ".join(parts)
        else:
            self.score_message = "NO SOLVES THIS ROUND"

        self.last_number = self.number
        for p in self.players.values():
            p.ready = False

        self.phase = "score"

        self.round_history.append({
            "round_number": self.round_number,
            "number": self.number,
            "scores": dict(self.last_round_scores),
        })

    def score_ready_as_player(self, player_id):
        if self.phase != "score":
            return
        player = self.players.get(player_id)
        if player is None or player.ready:
            return

        player.ready = True
        self.last_activity_ts = time.time()

        connected_players = [p for p in self.players.values() if p.connected]
        if connected_players and all(p.ready for p in connected_players):
            if self.round_number >= ROUNDS_PER_GAME:
                self.phase = "podium"
            else:
                self.round_number += 1
                self._start_round()

    def admin_set_scores(self, scores_dict_or_p1, p2_score=None, p3_score=None):
        if isinstance(scores_dict_or_p1, dict):
            for pid_or_slot, val in scores_dict_or_p1.items():
                for p in self.players.values():
                    if p.player_id == pid_or_slot or p.slot == pid_or_slot:
                        p.score = float(val)
        else:
            # Fallback legacy p1, p2, p3 positional args
            scores = [scores_dict_or_p1, p2_score, p3_score]
            sorted_players = sorted(self.players.values(), key=lambda p: p.slot)
            for i, p in enumerate(sorted_players):
                if i < len(scores) and scores[i] is not None:
                    p.score = float(scores[i])

    def _standings(self):
        sorted_players = sorted(self.players.values(), key=lambda p: -p.score)
        return [{"player_id": p.player_id, "name": p.name, "score": p.score} for p in sorted_players]

    # --- serialization ---

    def to_dict(self):
        sorted_players = sorted(self.players.values(), key=lambda p: p.slot)
        p1 = sorted_players[0] if len(sorted_players) > 0 else None
        p2 = sorted_players[1] if len(sorted_players) > 1 else None
        p3 = sorted_players[2] if len(sorted_players) > 2 else None

        clicks_dict = {p.player_id: p.clicked for p in sorted_players}
        ready_dict = {p.player_id: p.ready for p in sorted_players}

        return {
            "room_code": self.room_code,
            "phase": self.phase,
            "mode": "online",
            "difficulty": self.difficulty,
            "round_time": 90.0,
            "round_number": self.round_number,
            "rounds_per_game": ROUNDS_PER_GAME,
            "fastest_time_ms": self.fastest_time_ms,
            "slowest_time_ms": self.slowest_time_ms,
            "p1_name": p1.name if p1 else "",
            "p2_name": p2.name if p2 else "",
            "p3_name": p3.name if p3 else "",
            "p1_score": p1.score if p1 else 0.0,
            "p2_score": p2.score if p2 else 0.0,
            "p3_score": p3.score if p3 else 0.0,
            "standings": self._standings(),
            "round": {
                "number": self.number,
                "started": self.round_started,
                "clicks": clicks_dict,
                "deadline_ts": self.deadline_ts,
            },
            "score_message": self.score_message,
            "last_number": self.last_number,
            "last_round_scores": dict(self.last_round_scores),
            "round_history": list(self.round_history),
            "ready": ready_dict,
            "players": [
                {
                    "slot": p.slot,
                    "player_id": p.player_id,
                    "name": p.name,
                    "score": p.score,
                    "connected": p.connected,
                    "is_host": p.player_id == self.host_player_id,
                    "ready": p.ready,
                    "clicked": p.clicked,
                    "is_bot": p.is_bot,
                }
                for p in sorted_players
            ],
        }

