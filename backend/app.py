import threading

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import (
    BG_DARK, BG_CARD, ACCENT_BLUE, ACCENT_BLUE_HOVER,
    TEXT_MAIN, TEXT_MUTED, TEXT_DIM, COLOR_GOLD, COLOR_ERROR, COLOR_SUCCESS,
)
from game_state import GameState
from scoring import ROUND_TIME_LIMIT

app = Flask(__name__)
CORS(app)

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
    app.run(debug=True, port=5000)
