import eventlet
eventlet.monkey_patch()

import secrets
import threading

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import (
    BG_DARK, BG_CARD, ACCENT_BLUE, ACCENT_BLUE_HOVER,
    TEXT_MAIN, TEXT_MUTED, TEXT_DIM, COLOR_GOLD, COLOR_ERROR, COLOR_SUCCESS,
    FRONTEND_ORIGINS,
)
from extensions import socketio
from game_state import GameState, generate_4digit_number
from scoring import ROUND_TIME_LIMIT

app = Flask(__name__)
CORS(app, origins=FRONTEND_ORIGINS)
socketio.init_app(app)

import sockets  # noqa: E402 — side-effect import, registers @socketio.on handlers

state = GameState()
lock = threading.Lock()


def state_response():
    return jsonify(state.to_dict())


@app.get("/api/config")
def get_config():
    return jsonify({
        "round_time": ROUND_TIME_LIMIT,
        "colors": {
            "bg_dark": BG_DARK,
            "bg_card": BG_CARD,
            "accent_blue": ACCENT_BLUE,
            "accent_blue_hover": ACCENT_BLUE_HOVER,
            "text_main": TEXT_MAIN,
            "text_muted": TEXT_MUTED,
            "text_dim": TEXT_DIM,
            "color_gold": COLOR_GOLD,
            "color_error": COLOR_ERROR,
            "color_success": COLOR_SUCCESS,
        },
    })


@app.get("/api/state")
def get_state():
    return state_response()


# Sandbox mode is single-player and frontend-only (tile puzzle solving, no
# scoring, no shared session) — this endpoint is deliberately stateless and
# independent of GameState/lock. It exists just so tile values come from a
# proper server-side CSPRNG instead of Math.random(); it's a hook for future
# backend-side sandbox features (e.g. seeded/shareable puzzles, best times),
# not a state machine.
@app.get("/api/sandbox/new-puzzle")
def get_sandbox_puzzle():
    number_str = generate_4digit_number(difficulty=None)
    digits = [int(d) for d in number_str if d.isdigit()]
    return jsonify({"number": number_str, "digits": digits})


@app.post("/api/difficulty")
def post_difficulty():
    data = request.get_json(force=True) or {}
    with lock:
        try:
            state.set_difficulty(data.get("difficulty"))
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
    return state_response()


@app.post("/api/mode")
def post_mode():
    data = request.get_json(force=True) or {}
    with lock:
        try:
            state.set_mode(data.get("mode"))
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
    return state_response()


@app.post("/api/names")
def post_names():
    data = request.get_json(force=True) or {}
    with lock:
        try:
            state.confirm_names(
                data.get("p1_name", ""),
                data.get("p2_name", ""),
                data.get("p3_name", ""),
            )
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
    return state_response()


@app.post("/api/round/new-number")
def post_new_number():
    with lock:
        state.new_number()
    return state_response()


@app.post("/api/round/press")
def post_press():
    data = request.get_json(force=True) or {}
    with lock:
        state.press(data.get("key"))
    return state_response()


@app.post("/api/round/timeout")
def post_timeout():
    with lock:
        state.timeout()
    return state_response()


@app.post("/api/score/ready")
def post_score_ready():
    data = request.get_json(force=True) or {}
    with lock:
        state.score_ready(data.get("key"))
    return state_response()


@app.post("/api/mode-select")
def post_mode_select():
    with lock:
        state.back_to_mode_select()
    return state_response()


@app.post("/api/admin/login")
def post_admin_login():
    data = request.get_json(force=True) or {}
    ok = state.admin_login(data.get("password", ""))
    return jsonify({"ok": ok})


@app.post("/api/admin/scores")
def post_admin_scores():
    data = request.get_json(force=True) or {}
    with lock:
        try:
            state.admin_set_scores(
                data.get("p1_score", 0),
                data.get("p2_score", 0),
                data.get("p3_score", 0),
            )
        except (TypeError, ValueError):
            return jsonify({"error": "Scores must be numbers."}), 400
    return state_response()


if __name__ == "__main__":
    import os

    # socketio.run() starts eventlet's own WSGI server directly — this is
    # the standard way to serve a small Flask-SocketIO app in production
    # too, not just for local dev. Gunicorn's `--worker-class eventlet`
    # looks equivalent but recent gunicorn releases dropped that worker
    # plugin's entry point entirely, so it fails at startup; running
    # eventlet's server directly here sidesteps that gap completely.
    #
    # PORT is set by the hosting platform (e.g. Render) in production;
    # locally it falls back to 5000. FLASK_DEBUG defaults on for local dev
    # convenience — it must be explicitly turned off in production, since
    # Flask's debug mode exposes an interactive Python debugger to anyone
    # who can trigger a server error, which is a serious security hole on
    # a publicly reachable deployment.
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"

    # use_reloader=False: Werkzeug's file-watching auto-restart doesn't mix
    # reliably with eventlet's async WSGI server (the reloader's background
    # thread can starve eventlet's greenthread scheduler and hang all I/O).
    # You need to manually restart after editing backend files locally.
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, use_reloader=False)
