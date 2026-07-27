import secrets
import tkinter as tk

ROUND_TIME = 15

# Color Palette
BG_DARK = "#0d0d12"
BG_CARD = "#16161f"
ACCENT_BLUE = "#4f46e5"
ACCENT_BLUE_HOVER = "#6366f1"
TEXT_MAIN = "#f3f4f6"
TEXT_MUTED = "#9ca3af"
TEXT_DIM = "#4b5563"
COLOR_GOLD = "#fbbf24"
COLOR_ERROR = "#f87171"


def generate_4digit_number():
    """Generate a truly random 4-digit number (0000-9999)."""
    return str(secrets.randbelow(10000)).zfill(4)


class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Reaction Game")
        self.root.configure(bg=BG_DARK)
        self.root.resizable(True, True)
        self.root.minsize(460, 480) # Increased min-height slightly for indicators

        w, h = 460, 480
        root.update_idletasks()
        x = (root.winfo_screenwidth() - w) // 2
        y = (root.winfo_screenheight() - h) // 2
        root.geometry(f"{w}x{h}+{x}+{y}")

        # Game Mode State ("2p" or "3p")
        self.mode = None

        # Scores
        self.agam = 0
        self.prithu = 0
        self.ritvik = 0

        # Round state
        self.round_started = False
        self.timer = ROUND_TIME
        self.timer_job = None
        
        # Track who has clicked in the current round
        self.clicks = {"enter": False, "shift": False, "mouse": False}

        # Score screen state
        self.enter_ready = False
        self.shift_ready = False
        self.ritvik_ready = False
        self.score_message = ""
        self.last_number = ""

        # Build all screens
        self.make_mode_screen()
        self.make_round_screen()
        self.make_score_screen()

        self.show_mode_screen()

        # Global Key/Mouse bindings
        root.bind("<space>", self.space_pressed)
        root.bind("<Return>", self.enter_pressed)
        root.bind("<Shift_L>", self.shift_pressed)
        root.bind("<Shift_R>", self.shift_pressed)
        root.bind("<Button-1>", self.mouse_clicked)

    # --------------------------------------------------
    # MODE SELECTION SCREEN
    # --------------------------------------------------

    def make_mode_screen(self):
        self.mode_frame = tk.Frame(self.root, bg=BG_DARK)

        inner = tk.Frame(self.mode_frame, bg=BG_DARK)
        inner.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(
            inner,
            text="SELECT GAME MODE",
            font=("Segoe UI", 16, "bold"),
            fg=TEXT_MAIN,
            bg=BG_DARK,
        ).pack(pady=(0, 20))

        btn_2p = tk.Button(
            inner,
            text="2 Players (Agam & Prithu)",
            font=("Segoe UI", 10, "bold"),
            bg=ACCENT_BLUE,
            fg="white",
            relief="flat",
            activebackground=ACCENT_BLUE_HOVER,
            activeforeground="white",
            cursor="hand2",
            padx=20,
            pady=10,
            command=lambda: self.start_game_mode("2p"),
        )
        btn_2p.pack(pady=8, fill="x")

        btn_3p = tk.Button(
            inner,
            text="3 Players (+ Ritvik)",
            font=("Segoe UI", 10, "bold"),
            bg=BG_CARD,
            fg="#818cf8",
            relief="flat",
            activebackground="#22223b",
            activeforeground="#a5b4fc",
            cursor="hand2",
            padx=20,
            pady=10,
            command=lambda: self.start_game_mode("3p"),
        )
        btn_3p.pack(pady=8, fill="x")

    def show_mode_screen(self):
        if hasattr(self, "round"):
            self.round.pack_forget()
        if hasattr(self, "score"):
            self.score.pack_forget()
        self.mode_frame.pack(fill="both", expand=True)

    def start_game_mode(self, mode):
        self.mode = mode
        self.mode_frame.pack_forget()
        self.show_round()

    # --------------------------------------------------
    # ROUND SCREEN
    # --------------------------------------------------

    def make_round_screen(self):
        self.round = tk.Frame(self.root, bg=BG_DARK)

        self.timer_label = tk.Label(
            self.round,
            text="",
            font=("Segoe UI", 14, "bold"),
            fg=COLOR_GOLD,
            bg=BG_DARK,
        )
        self.timer_label.place(relx=0.93, rely=0.05, anchor="ne")

        tk.Label(
            self.round,
            text="RANDOM NUMBER",
            font=("Segoe UI", 9, "bold"),
            fg=TEXT_DIM,
            bg=BG_DARK,
        ).pack(pady=(35, 5))

        card = tk.Frame(self.round, bg=BG_CARD, highlightbackground="#272735", highlightthickness=1)
        card.pack(pady=10, padx=30, fill="x")

        self.number = tk.Label(
            card,
            text="0000",
            font=("Courier New", 64, "bold"),
            fg=TEXT_MAIN,
            bg=BG_CARD,
        )
        self.number.pack(pady=20)

        self.status = tk.Label(
            self.round,
            text="Press SPACE for new number",
            font=("Segoe UI", 10),
            fg=TEXT_MUTED,
            bg=BG_DARK,
        )
        self.status.pack(pady=15)

        # --- Key Press Indicators ---
        self.indicators_frame = tk.Frame(self.round, bg=BG_DARK)
        self.indicators_frame.pack(pady=10)

        self.agam_ind = tk.Label(self.indicators_frame, text="Agam [ENTER]", font=("Segoe UI", 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.agam_ind.grid(row=0, column=0, padx=5)

        self.prithu_ind = tk.Label(self.indicators_frame, text="Prithu [SHIFT]", font=("Segoe UI", 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.prithu_ind.grid(row=0, column=1, padx=5)

        self.ritvik_ind = tk.Label(self.indicators_frame, text="Ritvik [LMB]", font=("Segoe UI", 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.ritvik_ind.grid(row=0, column=2, padx=5)

    def show_round(self):
        if hasattr(self, "score"):
            self.score.pack_forget()
        if hasattr(self, "mode_frame"):
            self.mode_frame.pack_forget()
            
        self.round.pack(fill="both", expand=True)

        self.round_started = False
        self.timer = ROUND_TIME
        self.clicks = {"enter": False, "shift": False, "mouse": False}

        if self.timer_job:
            self.root.after_cancel(self.timer_job)
            self.timer_job = None

        self.timer_label.config(text="")
        self.status.config(text="Press SPACE for new number")
        self.number.config(text=generate_4digit_number())

        # --- Reset Indicators ---
        self.agam_ind.config(fg=TEXT_MUTED)
        self.prithu_ind.config(fg=TEXT_MUTED)
        
        if self.mode == "3p":
            self.ritvik_ind.grid(row=0, column=2, padx=5)
            self.ritvik_ind.config(fg=TEXT_MUTED)
        else:
            self.ritvik_ind.grid_forget()

    # --------------------------------------------------
    # SCORE SCREEN
    # --------------------------------------------------

    def make_score_screen(self):
        self.score = tk.Frame(self.root, bg=BG_DARK)

        inner = tk.Frame(self.score, bg=BG_DARK)
        inner.place(relx=0.5, rely=0.5, anchor="center")

        self.score_label = tk.Label(
            inner,
            font=("Segoe UI", 13, "bold"),
            fg=TEXT_MAIN,
            bg=BG_DARK,
            justify="center",
        )
        self.score_label.pack()

        self.score_hint = tk.Label(
            inner,
            text="Press ENTER, LMB, and SHIFT to continue",
            font=("Segoe UI", 9),
            fg=TEXT_MUTED,
            bg=BG_DARK,
        )
        self.score_hint.pack(pady=(16, 8))

        btn_frame = tk.Frame(inner, bg=BG_DARK)
        btn_frame.pack()

        self.admin_btn = tk.Button(
            btn_frame,
            text="Admin Panel",
            font=("Segoe UI", 9, "bold"),
            bg=BG_CARD,
            fg="#818cf8",
            relief="flat",
            activebackground="#22223b",
            activeforeground="#a5b4fc",
            cursor="hand2",
            padx=12,
            pady=4,
            command=self.open_admin,
        )
        self.admin_btn.pack(side="left", padx=4)

        self.menu_btn = tk.Button(
            btn_frame,
            text="Change Mode",
            font=("Segoe UI", 9, "bold"),
            bg=BG_CARD,
            fg=TEXT_MUTED,
            relief="flat",
            activebackground="#22223b",
            activeforeground=TEXT_MAIN,
            cursor="hand2",
            padx=12,
            pady=4,
            command=self.show_mode_screen,
        )
        self.menu_btn.pack(side="left", padx=4)

    def show_score(self, message):
        self.last_number = self.number.cget("text")
        self.round.pack_forget()

        self.enter_ready = False
        self.shift_ready = False
        self.ritvik_ready = False
        self.score_message = message

        self.update_score_display()
        self.score.pack(fill="both", expand=True)

    def update_score_display(self):
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

        self.score_label.config(text=score_text)

    # --------------------------------------------------
    # ADMIN
    # --------------------------------------------------

    ADMIN_PASSWORD = "pqclarp"

    def open_admin(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Admin Login")
        dlg.configure(bg=BG_DARK)
        dlg.resizable(False, False)
        dlg.grab_set()

        dlg.update_idletasks()
        dw, dh = 300, 170
        rx = self.root.winfo_x() + (self.root.winfo_width() - dw) // 2
        ry = self.root.winfo_y() + (self.root.winfo_height() - dh) // 2
        dlg.geometry(f"{dw}x{dh}+{rx}+{ry}")

        tk.Label(dlg, text="Enter Admin Password",
                 font=("Segoe UI", 10, "bold"), bg=BG_DARK, fg=TEXT_MUTED).pack(pady=(20, 8))

        pw_var = tk.StringVar()
        entry = tk.Entry(dlg, textvariable=pw_var, show="•",
                         font=("Segoe UI", 12), bg=BG_CARD, fg=TEXT_MAIN,
                         insertbackground=TEXT_MAIN, relief="flat", width=18, justify="center")
        entry.pack(ipady=6)
        entry.focus_set()

        error_label = tk.Label(dlg, text="", font=("Segoe UI", 9),
                               bg=BG_DARK, fg=COLOR_ERROR)
        error_label.pack(pady=(4, 0))

        def attempt(_event=None):
            if pw_var.get() == self.ADMIN_PASSWORD:
                dlg.destroy()
                self.open_score_editor()
            else:
                error_label.config(text="Incorrect password.")
                entry.delete(0, "end")

        entry.bind("<Return>", attempt)
        
        btn = tk.Button(dlg, text="Unlock", command=attempt,
                  font=("Segoe UI", 9, "bold"), bg=ACCENT_BLUE, fg="white",
                  relief="flat", padx=16, pady=6, cursor="hand2",
                  activebackground=ACCENT_BLUE_HOVER, activeforeground="white")
        btn.pack(pady=(8, 0))

    def open_score_editor(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Edit Scores")
        dlg.configure(bg=BG_DARK)
        dlg.resizable(False, False)
        dlg.grab_set()

        dh = 260 if self.mode == "3p" else 210
        dw = 300
        rx = self.root.winfo_x() + (self.root.winfo_width() - dw) // 2
        ry = self.root.winfo_y() + (self.root.winfo_height() - dh) // 2
        dlg.geometry(f"{dw}x{dh}+{rx}+{ry}")

        tk.Label(dlg, text="EDIT SCORES", font=("Segoe UI", 10, "bold"),
                 bg=BG_DARK, fg=TEXT_MUTED).pack(pady=(20, 12))

        fields = tk.Frame(dlg, bg=BG_DARK)
        fields.pack()

        agam_var = tk.StringVar(value=str(self.agam))
        prithu_var = tk.StringVar(value=str(self.prithu))
        ritvik_var = tk.StringVar(value=str(self.ritvik))

        score_rows = [("Agam", agam_var), ("Prithu", prithu_var)]
        if self.mode == "3p":
            score_rows.append(("Ritvik", ritvik_var))

        for row, (name, var) in enumerate(score_rows):
            tk.Label(fields, text=f"{name}:", font=("Segoe UI", 10, "bold"),
                     bg=BG_DARK, fg=TEXT_MUTED, width=8, anchor="e").grid(
                         row=row, column=0, padx=(0, 8), pady=6)
            tk.Entry(fields, textvariable=var, font=("Segoe UI", 11),
                     bg=BG_CARD, fg=TEXT_MAIN, insertbackground=TEXT_MAIN,
                     relief="flat", width=8, justify="center").grid(
                         row=row, column=1, ipady=5)

        error_label = tk.Label(dlg, text="", font=("Segoe UI", 9),
                               bg=BG_DARK, fg=COLOR_ERROR)
        error_label.pack(pady=(4, 0))

        def save(_event=None):
            try:
                self.agam = int(agam_var.get())
                self.prithu = int(prithu_var.get())
                if self.mode == "3p":
                    self.ritvik = int(ritvik_var.get())
                self.update_score_display()
                dlg.destroy()
            except ValueError:
                error_label.config(text="Scores must be whole numbers.")

        tk.Button(dlg, text="Save Changes", command=save,
                  font=("Segoe UI", 9, "bold"), bg=ACCENT_BLUE, fg="white",
                  relief="flat", padx=16, pady=6, cursor="hand2",
                  activebackground=ACCENT_BLUE_HOVER, activeforeground="white").pack(pady=(4, 0))

    # --------------------------------------------------
    # EVENTS
    # --------------------------------------------------

    def space_pressed(self, event):
        if self.round.winfo_ismapped() and not self.round_started:
            self.number.config(text=generate_4digit_number())

    def enter_pressed(self, event):
        if self.score.winfo_ismapped():
            self.enter_ready = True
            self.check_next_round()
            return

        if self.round.winfo_ismapped():
            # In 2p mode, keep the lockout so only the first click registers
            if self.mode == "2p" and self.round_started:
                return 
            
            self.clicks["enter"] = True
            self.agam_ind.config(fg="#10b981") # Turns green on press
            self.start_timer()

    def shift_pressed(self, event):
        if self.score.winfo_ismapped():
            self.shift_ready = True
            self.check_next_round()
            return

        if self.round.winfo_ismapped():
            if self.mode == "2p" and self.round_started:
                return
                
            self.clicks["shift"] = True
            self.prithu_ind.config(fg="#10b981") # Turns green on press
            self.start_timer()

    def mouse_clicked(self, event):
        if self.score.winfo_ismapped():
            if isinstance(event.widget, tk.Button):
                return
            # Allow Ritvik to ready up on the score screen
            if self.mode == "3p":
                self.ritvik_ready = True
                self.check_next_round()
            return

        if self.round.winfo_ismapped() and self.mode == "3p":
            if isinstance(event.widget, tk.Button):
                return
                
            self.clicks["mouse"] = True
            self.ritvik_ind.config(fg="#10b981") # Turns green on press
            self.start_timer()

    # --------------------------------------------------
    # TIMER & LOGIC
    # --------------------------------------------------

    def start_timer(self):
        if not self.round_started:
            self.round_started = True
            self.timer = ROUND_TIME
            self.update_timer()
        else:
            # If the round has already started, check if all 3 players have now clicked
            if self.mode == "3p":
                if self.clicks["enter"] and self.clicks["shift"] and self.clicks["mouse"]:
                    self.finish_round()

    def update_timer(self):
        # Check immediately if 3p mode condition is met right as timer starts
        if self.mode == "3p" and self.clicks["enter"] and self.clicks["shift"] and self.clicks["mouse"]:
            self.finish_round()
            return

        self.timer_label.config(text=f"⏱ {self.timer}s")

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

    # --------------------------------------------------
    # NEXT ROUND
    # --------------------------------------------------

    def check_next_round(self):
        if self.mode == "3p":
            self.update_score_display()
            if self.enter_ready and self.shift_ready and self.ritvik_ready:
                self.root.after(500, self.show_round)
        else:
            self.update_score_display()
            if self.enter_ready and self.shift_ready:
                self.root.after(500, self.show_round)


# ------------------------------------------------------
# Main
# ------------------------------------------------------

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()