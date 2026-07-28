import secrets
import time

from config import ROUND_TIME, ADMIN_PASSWORD


def generate_4digit_number():
    return str(secrets.randbelow(10000)).zfill(4)


class GameState:
    def __init__(self):
        self.mode = None
        self.phase = "mode_select"

        self.p1_name = "Player 1"
        self.p2_name = "Player 2"
        self.p3_name = "Player 3"

        self.p1_score = 0
        self.p2_score = 0
        self.p3_score = 0

        self.number = "0000"
        self.round_started = False
        self.clicks = {"enter": False, "shift": False, "mouse": False}
        self.deadline_ts = None

        self.score_message = ""
        self.last_number = ""
        self.ready = {"enter": False, "shift": False, "mouse": False}

    # --- transitions ---

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

        self._start_round()

    def _start_round(self):
        self.phase = "round"
        self.number = generate_4digit_number()
        self.round_started = False
        self.clicks = {"enter": False, "shift": False, "mouse": False}
        self.deadline_ts = None

    def new_number(self):
        if self.phase == "round" and not self.round_started:
            self.number = generate_4digit_number()

    def press(self, key):
        if self.phase != "round" or key not in self.clicks:
            return

        self.clicks[key] = True

        if not self.round_started:
            self.round_started = True
            self.deadline_ts = time.time() + ROUND_TIME
        else:
            self._maybe_finish()

    def timeout(self):
        if self.phase == "round" and self.round_started:
            self._finish_round()

    def _required_keys(self):
        return ("enter", "shift", "mouse") if self.mode == "3p" else ("enter", "shift")

    def _maybe_finish(self):
        if all(self.clicks[k] for k in self._required_keys()):
            self._finish_round()

    def _finish_round(self):
        self.deadline_ts = None

        if self.mode == "2p":
            entered = self.clicks["enter"]
            shifted = self.clicks["shift"]

            if entered and not shifted:
                self.p1_score += 1
                self.score_message = f"POINT: {self.p1_name}"
            elif shifted and not entered:
                self.p2_score += 1
                self.score_message = f"POINT: {self.p2_name}"
            else:
                self.score_message = "ROUND NULL"
        else:
            enter_c = self.clicks["enter"]
            shift_c = self.clicks["shift"]
            mouse_c = self.clicks["mouse"]
            clicked_count = sum([enter_c, shift_c, mouse_c])

            if clicked_count == 2:
                winners = []
                if enter_c:
                    self.p1_score += 1
                    winners.append(self.p1_name)
                if shift_c:
                    self.p2_score += 1
                    winners.append(self.p2_name)
                if mouse_c:
                    self.p3_score += 1
                    winners.append(self.p3_name)
                self.score_message = f"POINTS: {' & '.join(winners)}"
            else:
                self.score_message = "ROUND NULL (No Points)"

        self.last_number = self.number
        self.ready = {"enter": False, "shift": False, "mouse": False}
        self.phase = "score"

    def score_ready(self, key):
        if self.phase != "score" or key not in self.ready:
            return

        self.ready[key] = True

        required = self._required_keys()
        if all(self.ready[k] for k in required):
            self._start_round()

    def back_to_mode_select(self):
        self.mode = None
        self.phase = "mode_select"

    def admin_login(self, password):
        return password == ADMIN_PASSWORD

    def admin_set_scores(self, p1_score, p2_score, p3_score):
        self.p1_score = int(p1_score)
        self.p2_score = int(p2_score)
        if self.mode == "3p":
            self.p3_score = int(p3_score)

    # --- serialization ---

    def to_dict(self):
        return {
            "phase": self.phase,
            "mode": self.mode,
            "round_time": ROUND_TIME,
            "p1_name": self.p1_name,
            "p2_name": self.p2_name,
            "p3_name": self.p3_name,
            "p1_score": self.p1_score,
            "p2_score": self.p2_score,
            "p3_score": self.p3_score,
            "round": {
                "number": self.number,
                "started": self.round_started,
                "clicks": dict(self.clicks),
                "deadline_ts": self.deadline_ts,
            },
            "score_message": self.score_message,
            "last_number": self.last_number,
            "ready": dict(self.ready),
        }
