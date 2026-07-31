import uuid
from functools import wraps

from flask import request
from flask_socketio import emit
from flask_socketio import join_room as sio_join_room
from flask_socketio import leave_room as sio_leave_room

import rooms_registry
from extensions import socketio
from room import InvalidScoresError, RoomError

# sid -> (room_code, player_id). The source of truth for "who is this" on
# every gameplay event — never trust a client-supplied player_id except on
# the join/rejoin events, which is how player actions can't be spoofed.
sid_to_player: dict[str, tuple[str, str]] = {}


def _resolve(sid):
    entry = sid_to_player.get(sid)
    if entry is None:
        return None, None
    room_code, player_id = entry
    room = rooms_registry.get_room(room_code)
    if room is None:
        sid_to_player.pop(sid, None)
        return None, None
    return room, player_id


def _emit_error(code, message):
    emit("error", {"code": code, "message": message})


def _emit_session(room, player_id, slot):
    emit("session", {
        "room_code": room.room_code,
        "player_id": player_id,
        "slot": slot,
        "is_host": player_id == room.host_player_id,
    })


def _broadcast_room(room):
    socketio.emit("room_state", room.to_dict(), room=room.room_code)


def _seat_and_announce(room, player_id, slot):
    sio_join_room(room.room_code)
    sid_to_player[request.sid] = (room.room_code, player_id)
    _emit_session(room, player_id, slot)
    _broadcast_room(room)


def _schedule_bot_actions_for_room(room):
    """Inspect room state and spawn non-blocking async background tasks for bot players."""
    with room.lock:
        phase = room.phase
        bots_to_press = []
        bots_to_ready = []

        if phase == "round":
            for p in room.players.values():
                if p.is_bot and not p.clicked:
                    delay_ms = room.calculate_bot_delay_ms()
                    bots_to_press.append((p.player_id, delay_ms / 1000.0))
        elif phase == "score":
            for p in room.players.values():
                if p.is_bot and not p.ready:
                    bots_to_ready.append((p.player_id, 1.5))

    for player_id, delay_sec in bots_to_press:
        _schedule_bot_press(room, player_id, delay_sec)

    for player_id, delay_sec in bots_to_ready:
        _schedule_bot_ready(room, player_id, delay_sec)


def _schedule_bot_press(room, player_id, delay_sec):
    def bot_press_task():
        socketio.sleep(delay_sec)
        with room.lock:
            if room.phase == "round" and player_id in room.players:
                p = room.players[player_id]
                if p.is_bot and not p.clicked:
                    room.press_as_player(player_id)
        _broadcast_room(room)
        _schedule_bot_actions_for_room(room)

    socketio.start_background_task(bot_press_task)


def _schedule_bot_ready(room, player_id, delay_sec):
    def bot_ready_task():
        socketio.sleep(delay_sec)
        with room.lock:
            if room.phase == "score" and player_id in room.players:
                p = room.players[player_id]
                if p.is_bot and not p.ready:
                    room.score_ready_as_player(player_id)
        _broadcast_room(room)
        _schedule_bot_actions_for_room(room)

    socketio.start_background_task(bot_ready_task)


def _with_room(handler):
    """Resolve (room, player_id) for the calling sid, require an active
    room, run `handler` under that room's lock, turn RoomError into a
    targeted `error` event, and broadcast the new state on success."""

    @wraps(handler)
    def wrapper(data=None):
        room, player_id = _resolve(request.sid)
        if room is None:
            _emit_error("not_in_room", "You're not in a room.")
            return
        try:
            with room.lock:
                handler(room, player_id, data or {})
        except RoomError as e:
            _emit_error(e.code, str(e))
            return
        _broadcast_room(room)
        _schedule_bot_actions_for_room(room)

    return wrapper


@socketio.on("disconnect")
def handle_disconnect():
    room, player_id = _resolve(request.sid)
    sid_to_player.pop(request.sid, None)
    if room is None:
        return
    with room.lock:
        player = room.players.get(player_id)
        if player is not None:
            player.is_bot = True
            player.connected = True
            player.sid = None
    _broadcast_room(room)
    _schedule_bot_actions_for_room(room)


@socketio.on("create_room")
def handle_create_room(data=None):
    data = data or {}
    name = (data.get("name") or "").strip()
    if not name:
        _emit_error("invalid_name", "Please enter a name.")
        return

    player_id = str(uuid.uuid4())
    room = rooms_registry.create_room(player_id)
    with room.lock:
        try:
            slot = room.add_player(player_id, name, request.sid)
        except RoomError as e:
            rooms_registry.delete_room(room.room_code)
            _emit_error(e.code, str(e))
            return

    _seat_and_announce(room, player_id, slot)


@socketio.on("join_room")
def handle_join_room(data=None):
    data = data or {}
    room_code = (data.get("room_code") or "").strip().upper()
    name = (data.get("name") or "").strip()

    room = rooms_registry.get_room(room_code)
    if room is None:
        _emit_error("room_not_found", "No room with that code.")
        return

    player_id = str(uuid.uuid4())
    with room.lock:
        try:
            slot = room.add_player(player_id, name, request.sid)
        except RoomError as e:
            _emit_error(e.code, str(e))
            return

    _seat_and_announce(room, player_id, slot)


@socketio.on("rejoin_room")
def handle_rejoin_room(data=None):
    data = data or {}
    room_code = (data.get("room_code") or "").strip().upper()
    player_id = data.get("player_id")

    room = rooms_registry.get_room(room_code)
    if room is None:
        _emit_error("room_not_found", "That room no longer exists.")
        return

    with room.lock:
        try:
            slot = room.reconnect(player_id, request.sid)
        except RoomError as e:
            _emit_error(e.code, str(e))
            return

    _seat_and_announce(room, player_id, slot)


@socketio.on("leave_room")
def handle_leave_room(data=None):
    room, player_id = _resolve(request.sid)
    sid_to_player.pop(request.sid, None)
    if room is None:
        return
    sio_leave_room(room.room_code)
    with room.lock:
        room_now_empty = room.remove_player(player_id)
    if room_now_empty:
        rooms_registry.delete_room(room.room_code)
    else:
        _broadcast_room(room)


@socketio.on("start_game")
@_with_room
def handle_start_game(room, player_id, data):
    room.start_game(player_id)


@socketio.on("select_mode")
@_with_room
def handle_select_mode(room, player_id, data):
    room.select_mode(player_id, data.get("mode"))


@socketio.on("press")
@_with_room
def handle_press(room, player_id, data):
    room.press_as_player(player_id)


@socketio.on("score_ready")
@_with_room
def handle_score_ready(room, player_id, data):
    room.score_ready_as_player(player_id)


@socketio.on("timeout")
@_with_room
def handle_timeout(room, player_id, data):
    # Mirrors the REST /api/round/timeout: the backend runs no clock of its
    # own, so the first client whose local countdown hits 0 (deadline_ts
    # already reflects server time) resolves the round with whoever pressed.
    room.timeout()


@socketio.on("back_to_mode_select")
@_with_room
def handle_back_to_mode_select(room, player_id, data):
    room.back_to_mode_select_as_player(player_id)


@socketio.on("admin_scores")
@_with_room
def handle_admin_scores(room, player_id, data):
    try:
        if "scores" in data and isinstance(data["scores"], dict):
            room.admin_set_scores(data["scores"])
        else:
            room.admin_set_scores(
                data.get("p1_score", 0),
                data.get("p2_score", 0),
                data.get("p3_score", 0),
            )
    except (TypeError, ValueError):
        raise InvalidScoresError("Scores must be numbers.")


@socketio.on("admin_login")
def handle_admin_login(data=None):
    data = data or {}
    room, _player_id = _resolve(request.sid)
    if room is None:
        _emit_error("not_in_room", "You're not in a room.")
        return
    with room.lock:
        ok = room.admin_login(data.get("password", ""))
    emit("admin_login_result", {"ok": ok})
