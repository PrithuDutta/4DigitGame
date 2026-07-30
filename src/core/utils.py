import secrets
import sqlite3
import os

def generate_4digit_number(difficulty=None):
    """Fetch a random 4-digit number string from game.db (0 0 0 0 - 9 9 9 9)."""
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "game.db"))
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            if difficulty == "easy":
                cursor.execute("SELECT number_string FROM valid_pools WHERE difficulty = 'easy' ORDER BY RANDOM() LIMIT 1;")
            else:
                cursor.execute("SELECT number_string FROM valid_pools ORDER BY RANDOM() LIMIT 1;")
            row = cursor.fetchone()
            conn.close()
            if row and row[0]:
                return row[0]
        except Exception:
            pass

    num = str(secrets.randbelow(10000)).zfill(4)
    return " ".join(num)

