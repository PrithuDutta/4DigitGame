import logging
import os
import sqlite3
from typing import List, Sequence, Union
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

metrics_bp = Blueprint("metrics", __name__)

def get_metrics_db_connection() -> sqlite3.Connection:
    """Returns a connection to the separate user_metrics.db database."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "user_metrics.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@metrics_bp.post("/api/track/visit")
def track_visit():
    """
    POST route handler for /api/track/visit.
    Extracts visitorId from JSON body and inserts a record into the visits table.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {}

    visitor_id = data.get("visitorId") or data.get("visitor_id")

    if not visitor_id or not isinstance(visitor_id, str):
        return jsonify({"error": "Missing or invalid visitorId"}), 400

    conn = None
    try:
        conn = get_metrics_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO visits (visitor_id) VALUES (?)",
            (visitor_id.strip(),)
        )
        conn.commit()
        return jsonify({"status": "success", "visitorId": visitor_id}), 201
    except sqlite3.Error as e:
        logger.error("Error inserting visit into user_metrics.db: %s", e)
        return jsonify({"error": "Database error while tracking visit"}), 500
    finally:
        if conn:
            conn.close()

def log_game_play(game_id: str, participant_visitor_ids: Sequence[str]) -> bool:
    """
    Standalone internal Python function that accepts a game ID and a list of visitor IDs,
    then uses executemany to insert rows into the game_plays table in user_metrics.db.

    :param game_id: Unique string identifier of the game.
    :param participant_visitor_ids: Iterable/List of visitor IDs participating in the game.
    :return: True if insertion succeeded, False on error.
    """
    if not game_id or not participant_visitor_ids:
        return False

    records = [(str(game_id), str(vid)) for vid in participant_visitor_ids if vid]
    if not records:
        return False

    conn = None
    try:
        conn = get_metrics_db_connection()
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO game_plays (game_id, visitor_id) VALUES (?, ?)",
            records,
        )
        conn.commit()
        return True
    except sqlite3.Error as e:
        logger.error("Error inserting game plays into user_metrics.db: %s", e)
        return False
    finally:
        if conn:
            conn.close()
