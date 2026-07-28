import tkinter as tk
from src.core.config import BG_DARK, BG_CARD, TEXT_DIM, TEXT_MAIN, TEXT_MUTED, COLOR_GOLD, FONT_FAMILY
from src.core.utils import generate_4digit_number

class RoundScreen(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_DARK)
        self.controller = controller

        self.timer_label = tk.Label(
            self,
            text="",
            font=(FONT_FAMILY, 14, "bold"),
            fg=COLOR_GOLD,
            bg=BG_DARK,
        )
        self.timer_label.place(relx=0.93, rely=0.05, anchor="ne")

        tk.Label(
            self,
            text="RANDOM NUMBER",
            font=(FONT_FAMILY, 9, "bold"),
            fg=TEXT_DIM,
            bg=BG_DARK,
        ).pack(pady=(35, 5))

        card = tk.Frame(self, bg=BG_CARD, highlightbackground="#93c5fd", highlightthickness=1)
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
            self,
            text="Press SPACE for new number",
            font=(FONT_FAMILY, 10),
            fg=TEXT_MUTED,
            bg=BG_DARK,
        )
        self.status.pack(pady=15)

        # --- Key Press Indicators ---
        self.indicators_frame = tk.Frame(self, bg=BG_DARK)
        self.indicators_frame.pack(pady=10)

<<<<<<< Updated upstream
        self.p1_ind = tk.Label(self.indicators_frame, text="", font=("Segoe UI", 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.p1_ind.grid(row=0, column=0, padx=5)

        self.p2_ind = tk.Label(self.indicators_frame, text="", font=("Segoe UI", 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.p2_ind.grid(row=0, column=1, padx=5)

        self.p3_ind = tk.Label(self.indicators_frame, text="", font=("Segoe UI", 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.p3_ind.grid(row=0, column=2, padx=5)
=======
        self.agam_ind = tk.Label(self.indicators_frame, text="Agam [ENTER]", font=(FONT_FAMILY, 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.agam_ind.grid(row=0, column=0, padx=5)

        self.prithu_ind = tk.Label(self.indicators_frame, text="Prithu [SHIFT]", font=(FONT_FAMILY, 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.prithu_ind.grid(row=0, column=1, padx=5)

        self.ritvik_ind = tk.Label(self.indicators_frame, text="Ritvik [LMB]", font=(FONT_FAMILY, 10, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=15)
        self.ritvik_ind.grid(row=0, column=2, padx=5)
>>>>>>> Stashed changes

    def reset_ui(self, mode):
        self.timer_label.config(text="")
        self.status.config(text="Press SPACE for new number")
        self.number.config(text=generate_4digit_number())

        self.p1_ind.config(text=f"{self.controller.p1_name} [ENTER]", fg=TEXT_MUTED)
        self.p2_ind.config(text=f"{self.controller.p2_name} [SHIFT]", fg=TEXT_MUTED)

        if mode == "3p":
            self.p3_ind.grid(row=0, column=2, padx=5)
            self.p3_ind.config(text=f"{self.controller.p3_name} [LMB]", fg=TEXT_MUTED)
        else:
            self.p3_ind.grid_forget()

    def update_timer(self, timer_val):
        self.timer_label.config(text=f"⏱ {timer_val}s")
        
    def get_number(self):
        return self.number.cget("text")

    def set_number(self, val):
        self.number.config(text=val)
