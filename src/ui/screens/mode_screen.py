import tkinter as tk
from src.core.config import BG_DARK, BG_CARD, ACCENT_BLUE, ACCENT_BLUE_HOVER, TEXT_MAIN, FONT_FAMILY

class ModeScreen(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_DARK)
        self.controller = controller

        inner = tk.Frame(self, bg=BG_DARK)
        inner.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(
            inner,
            text="SELECT GAME MODE",
            font=(FONT_FAMILY, 16, "bold"),
            fg=TEXT_MAIN,
            bg=BG_DARK,
        ).pack(pady=(0, 20))

        btn_2p = tk.Button(
            inner,
<<<<<<< Updated upstream
            text="2 Players",
            font=("Segoe UI", 10, "bold"),
=======
            text="2 Players (Agam & Prithu)",
            font=(FONT_FAMILY, 10, "bold"),
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            text="3 Players",
            font=("Segoe UI", 10, "bold"),
=======
            text="3 Players (+ Ritvik)",
            font=(FONT_FAMILY, 10, "bold"),
>>>>>>> Stashed changes
            bg=BG_CARD,
            fg="#4f46e5",
            relief="flat",
            activebackground="#e0e7ff",
            activeforeground="#4338ca",
            cursor="hand2",
            padx=20,
            pady=10,
            command=lambda: self.controller.start_game_mode("3p"),
        )
        btn_3p.pack(pady=8, fill="x")
