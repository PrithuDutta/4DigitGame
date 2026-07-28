import tkinter as tk
from src.core.config import BG_DARK, BG_CARD, ACCENT_BLUE, ACCENT_BLUE_HOVER, TEXT_MAIN

class ModeScreen(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_DARK)
        self.controller = controller

        inner = tk.Frame(self, bg=BG_DARK)
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
            text="2 Players",
            font=("Segoe UI", 10, "bold"),
            bg=ACCENT_BLUE,
            fg="white",
            relief="flat",
            activebackground=ACCENT_BLUE_HOVER,
            activeforeground="white",
            cursor="hand2",
            padx=20,
            pady=10,
            command=lambda: self.controller.start_game_mode("2p"),
        )
        btn_2p.pack(pady=8, fill="x")

        btn_3p = tk.Button(
            inner,
            text="3 Players",
            font=("Segoe UI", 10, "bold"),
            bg=BG_CARD,
            fg="#818cf8",
            relief="flat",
            activebackground="#22223b",
            activeforeground="#a5b4fc",
            cursor="hand2",
            padx=20,
            pady=10,
            command=lambda: self.controller.start_game_mode("3p"),
        )
        btn_3p.pack(pady=8, fill="x")
