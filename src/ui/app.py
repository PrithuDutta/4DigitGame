import tkinter as tk
from src.core.config import BG_DARK, ROUND_TIME
from src.core.utils import generate_4digit_number
from src.ui.screens.mode_screen import ModeScreen
from src.ui.screens.round_screen import RoundScreen
from src.ui.screens.score_screen import ScoreScreen
from src.ui.dialogs.admin import AdminDialog, ScoreEditorDialog

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Reaction Game")
        self.root.configure(bg=BG_DARK)
        self.root.resizable(True, True)
        self.root.minsize(460, 480)

        w, h = 460, 480
        root.update_idletasks()
        x = (root.winfo_screenwidth() - w) // 2
        y = (root.winfo_screenheight() - h) // 2
        root.geometry(f"{w}x{h}+{x}+{y}")

        self.mode = None
        self.agam = 0
        self.prithu = 0
        self.ritvik = 0

        self.round_started = False
        self.timer = ROUND_TIME
        self.timer_job = None
        
        self.clicks = {"enter": False, "shift": False, "mouse": False}

        self.enter_ready = False
        self.shift_ready = False
        self.ritvik_ready = False
        self.score_message = ""
        self.last_number = ""

        # Initialize screens
        self.mode_screen = ModeScreen(self.root, self)
        self.round_screen = RoundScreen(self.root, self)
        self.score_screen = ScoreScreen(self.root, self)

        self.show_mode_screen()

        # Bindings
        root.bind("<space>", self.space_pressed)
        root.bind("<Return>", self.enter_pressed)
        root.bind("<Shift_L>", self.shift_pressed)
        root.bind("<Shift_R>", self.shift_pressed)
        root.bind("<Button-1>", self.mouse_clicked)

    def show_mode_screen(self):
        self.round_screen.pack_forget()
        self.score_screen.pack_forget()
        self.mode_screen.pack(fill="both", expand=True)

    def start_game_mode(self, mode):
        self.mode = mode
        self.mode_screen.pack_forget()
        self.show_round()

    def show_round(self):
        self.score_screen.pack_forget()
        self.mode_screen.pack_forget()
            
        self.round_screen.pack(fill="both", expand=True)

        self.round_started = False
        self.timer = ROUND_TIME
        self.clicks = {"enter": False, "shift": False, "mouse": False}

        if self.timer_job:
            self.root.after_cancel(self.timer_job)
            self.timer_job = None

        self.round_screen.reset_ui(self.mode)

    def show_score(self, message):
        self.last_number = self.round_screen.get_number()
        self.round_screen.pack_forget()

        self.enter_ready = False
        self.shift_ready = False
        self.ritvik_ready = False
        self.score_message = message

        self.update_score_screen_display()
        self.score_screen.pack(fill="both", expand=True)

    def update_score_screen_display(self):
        enter_status = "✓ ENTER ready" if self.enter_ready else "Waiting for ENTER..."
        shift_status = "✓ SHIFT ready" if self.shift_ready else "Waiting for SHIFT..."
        
        if self.mode == "3p":
            ritvik_status = "✓ RITVIK ready" if self.ritvik_ready else "Waiting for Click..."
            score_text = (
                f"{self.score_message}\n\n"
                f"Previous Number: {self.last_number}\n\n"
                f"Agam: {self.agam}  |  Prithu: {self.prithu}  |  Ritvik: {self.ritvik}\n\n"
                f"{enter_status}\n"
                f"{shift_status}\n"
                f"{ritvik_status}"
            )
        else:
            score_text = (
                f"{self.score_message}\n\n"
                f"Previous Number: {self.last_number}\n\n"
                f"Agam: {self.agam}   |   Prithu: {self.prithu}\n\n"
                f"{enter_status}\n"
                f"{shift_status}"
            )

        self.score_screen.update_score_display(score_text)

    def open_admin(self):
        AdminDialog(self.root, self)

    def open_score_editor(self):
        ScoreEditorDialog(self.root, self)

    def space_pressed(self, event):
        if self.round_screen.winfo_ismapped() and not self.round_started:
            self.round_screen.set_number(generate_4digit_number())

    def enter_pressed(self, event):
        if self.score_screen.winfo_ismapped():
            self.enter_ready = True
            self.check_next_round()
            return

        if self.round_screen.winfo_ismapped():
            self.clicks["enter"] = True
            self.round_screen.agam_ind.config(fg="#10b981")
            self.start_timer()

    def shift_pressed(self, event):
        if self.score_screen.winfo_ismapped():
            self.shift_ready = True
            self.check_next_round()
            return

        if self.round_screen.winfo_ismapped():
            self.clicks["shift"] = True
            self.round_screen.prithu_ind.config(fg="#10b981")
            self.start_timer()

    def mouse_clicked(self, event):
        if self.score_screen.winfo_ismapped():
            if isinstance(event.widget, tk.Button):
                return
            if self.mode == "3p":
                self.ritvik_ready = True
                self.check_next_round()
            return

        if self.round_screen.winfo_ismapped() and self.mode == "3p":
            if isinstance(event.widget, tk.Button):
                return
                
            self.clicks["mouse"] = True
            self.round_screen.ritvik_ind.config(fg="#10b981")
            self.start_timer()

    def start_timer(self):
        if not self.round_started:
            self.round_started = True
            self.timer = ROUND_TIME
            self.update_timer()
        else:
            if self.mode == "3p":
                if self.clicks["enter"] and self.clicks["shift"] and self.clicks["mouse"]:
                    self.finish_round()
            elif self.mode == "2p":
                if self.clicks["enter"] and self.clicks["shift"]:
                    self.finish_round()

    def update_timer(self):
        if self.mode == "3p" and self.clicks["enter"] and self.clicks["shift"] and self.clicks["mouse"]:
            self.finish_round()
            return
        elif self.mode == "2p" and self.clicks["enter"] and self.clicks["shift"]:
            self.finish_round()
            return

        self.round_screen.update_timer(self.timer)

        if self.timer == 0:
            self.finish_round()
            return

        self.timer -= 1
        self.timer_job = self.root.after(1000, self.update_timer)

    def finish_round(self):
        if self.timer_job:
            self.root.after_cancel(self.timer_job)
            self.timer_job = None

        if self.mode == "2p":
            entered = self.clicks["enter"]
            shifted = self.clicks["shift"]
            
            if entered and not shifted:
                self.agam += 1
                self.show_score("POINT: Agam")
            elif shifted and not entered:
                self.prithu += 1
                self.show_score("POINT: Prithu")
            else:
                self.show_score("ROUND NULL")
        else:
            enter_c = self.clicks["enter"]
            shift_c = self.clicks["shift"]
            mouse_c = self.clicks["mouse"]
            
            clicked_count = sum([enter_c, shift_c, mouse_c])

            if clicked_count == 2:
                winners = []
                if enter_c:
                    self.agam += 1
                    winners.append("Agam")
                if shift_c:
                    self.prithu += 1
                    winners.append("Prithu")
                if mouse_c:
                    self.ritvik += 1
                    winners.append("Ritvik")
                
                self.show_score(f"POINTS: {' & '.join(winners)}")
            else:
                self.show_score("ROUND NULL (No Points)")

    def check_next_round(self):
        if self.mode == "3p":
            self.update_score_screen_display()
            if self.enter_ready and self.shift_ready and self.ritvik_ready:
                self.root.after(500, self.show_round)
        else:
            self.update_score_screen_display()
            if self.enter_ready and self.shift_ready:
                self.root.after(500, self.show_round)
