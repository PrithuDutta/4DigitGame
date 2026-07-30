import os
import json
import sqlite3

def create_and_populate_db():
    # Base path setup
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "game.db")
    json_path = os.path.join(script_dir, "valid_numbers.json")

    if not os.path.exists(json_path):
        # Fallback if executed from project root or elsewhere
        json_path = os.path.join(os.getcwd(), "backend", "valid_numbers.json")

    # Connect to SQLite database (creates game.db if it doesn't exist)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Enable foreign key enforcement
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Drop existing tables if re-running script for a fresh setup
    cursor.execute("DROP TABLE IF EXISTS valid_pools;")
    cursor.execute("DROP TABLE IF EXISTS game_configs;")

    # 1. Create game_configs table
    cursor.execute("""
        CREATE TABLE game_configs (
            config_id INTEGER PRIMARY KEY,
            digit_count INTEGER NOT NULL,
            target_num INTEGER NOT NULL
        );
    """)

    # 2. Create valid_pools table
    cursor.execute("""
        CREATE TABLE valid_pools (
            pool_id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_id INTEGER NOT NULL,
            number_string TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            FOREIGN KEY (config_id) REFERENCES game_configs(config_id)
        );
    """)

    # Data insertion logic:
    # Insert single configuration row (digit_count=4, target_num=10)
    cursor.execute(
        "INSERT INTO game_configs (digit_count, target_num) VALUES (?, ?);",
        (4, 10)
    )
    config_id = cursor.lastrowid  # Generates config_id = 1

    print(f"Inserted configuration row into game_configs with config_id = {config_id}")

    # Read local valid_numbers.json
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Prepare data for batch insertion into valid_pools
    records = []
    for difficulty in ["easy", "hard"]:
        if difficulty in data:
            for num_str in data[difficulty]:
                # Format number string with spaces between digits (e.g. "0402" -> "0 4 0 2")
                formatted_num = " ".join(num_str)
                records.append((config_id, formatted_num, difficulty))

    # Batch insertion using executemany
    cursor.executemany(
        "INSERT INTO valid_pools (config_id, number_string, difficulty) VALUES (?, ?, ?);",
        records
    )

    # Commit changes and close
    conn.commit()
    print(f"Successfully inserted {len(records)} rows into valid_pools table.")
    conn.close()
    print(f"Database file created at: {db_path}")

if __name__ == "__main__":
    create_and_populate_db()
