import random
import threading

from room import Room

# Excludes visually ambiguous characters (I, O, 0, 1).
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_CODE_LENGTH = 4

_lock = threading.Lock()
rooms: dict[str, Room] = {}


def generate_room_code():
    """Caller must hold `_lock` — this only checks for collisions, it doesn't
    reserve the code, so generation and insertion have to happen atomically.
    """
    while True:
        code = "".join(random.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))
        if code not in rooms:
            return code


def create_room(host_player_id):
    with _lock:
        code = generate_room_code()
        room = Room(code, host_player_id)
        rooms[code] = room
    return room


def get_room(room_code):
    with _lock:
        return rooms.get(room_code)


def get_all_rooms():
    with _lock:
        return list(rooms.values())


def delete_room(room_code):
    with _lock:
        rooms.pop(room_code, None)
