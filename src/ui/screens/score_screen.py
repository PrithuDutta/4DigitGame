import tkinter as tk
from src.core.config import BG_DARK, BG_CARD, TEXT_MAIN, TEXT_MUTED

class ScoreScreen(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_DARK)
        self.controller = controller

        inner = tk.Frame(self, bg=BG_DARK)
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
            command=self.controller.open_admin,
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
            command=self.controller.show_mode_screen,
        )
        self.menu_btn.pack(side="left", padx=4)

    def update_score_display(self, score_text):
        self.score_label.config(text=score_text)
