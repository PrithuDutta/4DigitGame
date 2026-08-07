import os
import sqlite3

def get_metrics_db_path() -> str:
    """Returns the absolute path to user_metrics.db within the backend directory."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "user_metrics.db")

def init_metrics_db(db_path: str = None) -> str:
    """
    Initializes the user_metrics.db SQLite database with visits and game_plays tables
    and visitor_id indexes.
    """
    if db_path is None:
        db_path = get_metrics_db_path()

    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()

        # 1. Visits table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                visitor_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Game plays table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_plays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT NOT NULL,
                visitor_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Indexes for fast lookup on visitor_id
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_game_plays_visitor_id ON game_plays(visitor_id);
        """)

        conn.commit()
        print(f"Successfully initialized metrics database at: {db_path}")
        return db_path
    finally:
        conn.close()

if __name__ == "__main__":
    init_metrics_db()
