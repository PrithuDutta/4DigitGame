import secrets
import time
import json
import os
import sqlite3

from config import ADMIN_PASSWORD
from scoring import PlayerRoundResult, ROUND_TIME_LIMIT, score_round

ROUNDS_PER_GAME = 10

def load_valid_numbers_from_db():
    db_path = os.path.join(os.path.dirname(__file__), 'game.db')
    if not os.path.exists(db_path):
        try:
            from create_db import create_and_populate_db
            create_and_populate_db()
        except Exception as e:
            print("Warning: Could not automatically create game.db:", e)
            return {}

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT difficulty, number_string FROM valid_pools;")
        rows = cursor.fetchall()
        conn.close()

        pools = {"easy": [], "hard": []}
        for diff, num_str in rows:
            if diff in pools:
                pools[diff].append(num_str)
        return pools
    except Exception as e:
        print("Warning: Could not load valid numbers from game.db:", e)
        return {}

VALID_NUMBERS = load_valid_numbers_from_db()


def load_target_from_db():
    """Reads game_configs.target_num — already seeded by create_db.py, so
    changing that one column (or adding per-room config later) is all it
    takes to make the sandbox/multiplayer target configurable. Falls back to
    the game's long-standing default of 10 if the DB isn't reachable."""
    db_path = os.path.join(os.path.dirname(__file__), 'game.db')
    if not os.path.exists(db_path):
        return 10
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT target_num FROM game_configs LIMIT 1;")
        row = cursor.fetchone()
        conn.close()
        return int(row[0]) if row and row[0] is not None else 10
    except Exception as e:
        print("Warning: Could not load target_num from game.db:", e)
        return 10

DEFAULT_TARGET = load_target_from_db()

def generate_4digit_number(difficulty):
    if difficulty == "easy" and "easy" in VALID_NUMBERS and VALID_NUMBERS["easy"]:
        pool = VALID_NUMBERS["easy"]
    elif ("easy" in VALID_NUMBERS or "hard" in VALID_NUMBERS) and (VALID_NUMBERS.get("easy") or VALID_NUMBERS.get("hard")):
        pool = VALID_NUMBERS.get("easy", []) + VALID_NUMBERS.get("hard", [])
    else:
        db_path = os.path.join(os.path.dirname(__file__), 'game.db')
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
    return secrets.choice(pool)



class GameState:
    def __init__(self):
        self.mode = None
        self.difficulty = None
        self.phase = "difficulty_select"

        self.p1_name = "Player 1"
        self.p2_name = "Player 2"
        self.p3_name = "Player 3"

        self.p1_score = 0
        self.p2_score = 0
        self.p3_score = 0

        self.number = "0000"
        self.round_started = False
        self.clicks = {"enter": False, "shift": False, "mouse": False}
        self.round_start_ts = None
        self.press_times = {"enter": None, "shift": None, "mouse": None}
        self.deadline_ts = None

        self.score_message = ""
        self.last_number = ""
        self.last_round_scores = {}
        self.ready = {"enter": False, "shift": False, "mouse": False}

        self.fastest_time_ms = None
        self.slowest_time_ms = None

        self.round_number = 0
        self.round_history = []
        self.game_numbers = []

    # --- transitions ---

    def set_difficulty(self, difficulty):
        if difficulty not in ("easy", "hard"):
            raise ValueError("difficulty must be 'easy' or 'hard'")
        self.difficulty = difficulty
        self.phase = "mode_select"

    def set_mode(self, mode):
        if mode not in ("2p", "3p"):
            raise ValueError("mode must be '2p' or '3p'")
        self.mode = mode
        self.phase = "name_entry"

    def confirm_names(self, p1_name, p2_name, p3_name):
        p1_name = p1_name.strip()
        p2_name = p2_name.strip()
        p3_name = p3_name.strip()

        if not p1_name or not p2_name or (self.mode == "3p" and not p3_name):
            raise ValueError("Please enter a name for every player.")

        self.p1_name = p1_name
        self.p2_name = p2_name
        if self.mode == "3p":
            self.p3_name = p3_name

        self.p1_score = 0.0
        self.p2_score = 0.0
        self.p3_score = 0.0
        self.round_number = 1
        self.round_history = []

        # Pre-select 10 numbers for all 10 rounds before the game starts
        self.game_numbers = [generate_4digit_number(self.difficulty) for _ in range(ROUNDS_PER_GAME)]

        self._start_round()

    def _start_round(self):
        self.phase = "round"
        if hasattr(self, "game_numbers") and self.game_numbers and 1 <= self.round_number <= len(self.game_numbers):
            self.number = self.game_numbers[self.round_number - 1]
        else:
            self.number = generate_4digit_number(self.difficulty)
        self.clicks = {"enter": False, "shift": False, "mouse": False}
        self.press_times = {"enter": None, "shift": None, "mouse": None}

        # The 90s clock starts the instant the puzzle is revealed, not on the
        # first press — solve_time has to be measured against a fixed origin
        # or the first presser's own time would trivially be ~0.
        now = time.time()
        self.round_start_ts = now
        self.deadline_ts = now + ROUND_TIME_LIMIT
        self.round_started = True

    def new_number(self):
        if self.phase == "round" and not any(self.clicks.values()):
            new_num = generate_4digit_number(self.difficulty)
            self.number = new_num
            if hasattr(self, "game_numbers") and self.game_numbers and 1 <= self.round_number <= len(self.game_numbers):
                self.game_numbers[self.round_number - 1] = new_num

    def press(self, key):
        if self.phase != "round" or key not in self.clicks or self.clicks[key]:
            return

        self.clicks[key] = True
        self.press_times[key] = time.time()
        self._maybe_finish()

    def timeout(self):
        if self.phase == "round" and self.round_started:
            self._finish_round()

    def _required_keys(self):
        return ("enter", "shift", "mouse") if self.mode == "3p" else ("enter", "shift")

    def _maybe_finish(self):
        if all(self.clicks[k] for k in self._required_keys()):
            self._finish_round()

    def _key_player_pairs(self):
        pairs = [("p1", "enter"), ("p2", "shift")]
        if self.mode == "3p":
            pairs.append(("p3", "mouse"))
        return pairs

    def _finish_round(self):
        self.deadline_ts = None

        results = []
        solve_times = {}
        for player_id, key in self._key_player_pairs():
            solved = self.clicks[key]
            solve_time = (self.press_times[key] - self.round_start_ts) if solved else None
            solve_times[player_id] = solve_time
            results.append(PlayerRoundResult(player_id=player_id, solved=solved, solve_time=solve_time))

        scores = score_round(results)
        names = {"p1": self.p1_name, "p2": self.p2_name, "p3": self.p3_name}

        self.last_round_scores = {}
        for s in scores:
            attr = f"{s.player_id}_score"
            setattr(self, attr, getattr(self, attr) + s.round_score)
            self.last_round_scores[s.player_id] = {
                "solve_time": solve_times[s.player_id],
                "solve_bonus": s.solve_bonus,
                "speed_bonus": s.speed_bonus,
                "rank_bonus": s.rank_bonus,
                "round_score": s.round_score,
                "solved": s.solve_bonus > 0,
            }

        solvers = sorted((s for s in scores if s.solve_bonus > 0), key=lambda s: -s.rank_bonus)
        if solvers:
            parts = [f"{names[s.player_id]} +{s.round_score:.0f}" for s in solvers]
            self.score_message = "SOLVED: " + ", ".join(parts)
        else:
            self.score_message = "NO SOLVES THIS ROUND"

        self.last_number = self.number
        self.ready = {"enter": False, "shift": False, "mouse": False}
        self.phase = "score"

        self.round_history.append({
            "round_number": self.round_number,
            "number": self.number,
            "scores": dict(self.last_round_scores),
        })

    def score_ready(self, key):
        if self.phase != "score" or key not in self.ready:
            return

        self.ready[key] = True

        required = self._required_keys()
        if not all(self.ready[k] for k in required):
            return

        if self.round_number >= ROUNDS_PER_GAME:
            self.phase = "podium"
        else:
            self.round_number += 1
            self._start_round()

    def back_to_mode_select(self):
        self.mode = None
        self.phase = "mode_select"
        self.round_number = 0
        self.round_history = []
        self.difficulty = None
        self.phase = "difficulty_select"

    def admin_login(self, password):
        return password == ADMIN_PASSWORD

    def admin_set_scores(self, p1_score, p2_score, p3_score):
        self.p1_score = float(p1_score)
        self.p2_score = float(p2_score)
        if self.mode == "3p":
            self.p3_score = float(p3_score)

    def _standings(self):
        pairs = [("p1", self.p1_name, self.p1_score), ("p2", self.p2_name, self.p2_score)]
        if self.mode == "3p":
            pairs.append(("p3", self.p3_name, self.p3_score))

        ordered = sorted(pairs, key=lambda pair: -pair[2])
        return [{"player_id": pid, "name": name, "score": score} for pid, name, score in ordered]

    # --- serialization ---

    def to_dict(self):
        return {
            "phase": self.phase,
            "mode": self.mode,
            "difficulty": self.difficulty,
            "round_time": ROUND_TIME_LIMIT,
            "round_number": self.round_number,
            "rounds_per_game": ROUNDS_PER_GAME,
            "p1_name": self.p1_name,
            "p2_name": self.p2_name,
            "p3_name": self.p3_name,
            "p1_score": self.p1_score,
            "p2_score": self.p2_score,
            "p3_score": self.p3_score,
            "standings": self._standings(),
            "round": {
                "number": self.number,
                "started": self.round_started,
                "clicks": dict(self.clicks),
                "deadline_ts": self.deadline_ts,
            },
            "score_message": self.score_message,
            "last_number": self.last_number,
            "last_round_scores": dict(self.last_round_scores),
            "round_history": list(self.round_history),
            "ready": dict(self.ready),
            "fastest_time_ms": self.fastest_time_ms,
            "slowest_time_ms": self.slowest_time_ms,
        }
