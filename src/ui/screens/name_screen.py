import tkinter as tk
from src.core.config import BG_DARK, BG_CARD, ACCENT_BLUE, ACCENT_BLUE_HOVER, TEXT_MAIN, TEXT_MUTED, COLOR_ERROR

class NameScreen(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_DARK)
        self.controller = controller

        inner = tk.Frame(self, bg=BG_DARK)
        inner.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(
            inner,
            text="ENTER PLAYER NAMES",
            font=("Segoe UI", 16, "bold"),
            fg=TEXT_MAIN,
            bg=BG_DARK,
        ).pack(pady=(0, 20))

        self.p1_var = tk.StringVar()
        self.p2_var = tk.StringVar()
        self.p3_var = tk.StringVar()

        self.p1_row, self.p1_entry = self._make_row(inner, "Player 1 [ENTER]", self.p1_var)
        self.p2_row, self.p2_entry = self._make_row(inner, "Player 2 [SHIFT]", self.p2_var)
        self.p3_row, self.p3_entry = self._make_row(inner, "Player 3 [LMB]", self.p3_var)

        self.error_label = tk.Label(inner, text="", font=("Segoe UI", 9), bg=BG_DARK, fg=COLOR_ERROR)
        self.error_label.pack(pady=(4, 0))

        start_btn = tk.Button(
            inner,
            text="Start Game",
            font=("Segoe UI", 10, "bold"),
            bg=ACCENT_BLUE,
            fg="white",
            relief="flat",
            activebackground=ACCENT_BLUE_HOVER,
            activeforeground="white",
            cursor="hand2",
            padx=20,
            pady=10,
            command=self.submit,
        )
        start_btn.pack(pady=(16, 0), fill="x")

        for entry in (self.p1_entry, self.p2_entry, self.p3_entry):
            entry.bind("<Return>", lambda e: self.submit())

    def _make_row(self, parent, label_text, var):
        row = tk.Frame(parent, bg=BG_DARK)
        row.pack(pady=6, fill="x")
        tk.Label(row, text=label_text, font=("Segoe UI", 9, "bold"), fg=TEXT_MUTED, bg=BG_DARK, width=14, anchor="w").pack(side="left")
        entry = tk.Entry(row, textvariable=var, font=("Segoe UI", 11), bg=BG_CARD, fg=TEXT_MAIN,
                          insertbackground=TEXT_MAIN, relief="flat", width=16)
        entry.pack(side="left", ipady=5, fill="x", expand=True)
        return row, entry

    def load(self, mode, p1_name, p2_name, p3_name):
        self.error_label.config(text="")
        self.p1_var.set(p1_name)
        self.p2_var.set(p2_name)
        self.p3_var.set(p3_name)

        if mode == "3p":
            self.p3_row.pack(pady=6, fill="x", before=self.error_label)
        else:
            self.p3_row.pack_forget()

        self.p1_entry.focus_set()

    def submit(self):
        p1 = self.p1_var.get().strip()
        p2 = self.p2_var.get().strip()
        p3 = self.p3_var.get().strip()

        if not p1 or not p2 or (self.controller.mode == "3p" and not p3):
            self.error_label.config(text="Please enter a name for every player.")
            return

        self.controller.confirm_names(p1, p2, p3)
