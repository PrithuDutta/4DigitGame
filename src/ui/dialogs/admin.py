import tkinter as tk
from src.core.config import BG_DARK, BG_CARD, ACCENT_BLUE, ACCENT_BLUE_HOVER, TEXT_MAIN, TEXT_MUTED, COLOR_ERROR, ADMIN_PASSWORD, FONT_FAMILY

class AdminDialog(tk.Toplevel):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller
        
        self.title("Admin Login")
        self.configure(bg=BG_DARK)
        self.resizable(False, False)
        self.grab_set()

        self.update_idletasks()
        dw, dh = 300, 170
        rx = parent.winfo_x() + (parent.winfo_width() - dw) // 2
        ry = parent.winfo_y() + (parent.winfo_height() - dh) // 2
        self.geometry(f"{dw}x{dh}+{rx}+{ry}")

        tk.Label(self, text="Enter Admin Password",
                 font=(FONT_FAMILY, 10, "bold"), bg=BG_DARK, fg=TEXT_MUTED).pack(pady=(20, 8))

        self.pw_var = tk.StringVar()
        entry = tk.Entry(self, textvariable=self.pw_var, show="•",
                         font=(FONT_FAMILY, 12), bg=BG_CARD, fg=TEXT_MAIN,
                         insertbackground=TEXT_MAIN, relief="flat", width=18, justify="center")
        entry.pack(ipady=6)
        entry.focus_set()

        self.error_label = tk.Label(self, text="", font=(FONT_FAMILY, 9),
                               bg=BG_DARK, fg=COLOR_ERROR)
        self.error_label.pack(pady=(4, 0))

        entry.bind("<Return>", self.attempt)
        
        btn = tk.Button(self, text="Unlock", command=self.attempt,
                  font=(FONT_FAMILY, 9, "bold"), bg=ACCENT_BLUE, fg="white",
                  relief="flat", padx=16, pady=6, cursor="hand2",
                  activebackground=ACCENT_BLUE_HOVER, activeforeground="white")
        btn.pack(pady=(8, 0))

    def attempt(self, _event=None):
        if self.pw_var.get() == ADMIN_PASSWORD:
            self.destroy()
            self.controller.open_score_editor()
        else:
            self.error_label.config(text="Incorrect password.")
            self.winfo_children()[1].delete(0, "end") # entry widget

class ScoreEditorDialog(tk.Toplevel):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        self.title("Edit Scores")
        self.configure(bg=BG_DARK)
        self.resizable(False, False)
        self.grab_set()

        dh = 260 if self.controller.mode == "3p" else 210
        dw = 300
        rx = parent.winfo_x() + (parent.winfo_width() - dw) // 2
        ry = parent.winfo_y() + (parent.winfo_height() - dh) // 2
        self.geometry(f"{dw}x{dh}+{rx}+{ry}")

        tk.Label(self, text="EDIT SCORES", font=(FONT_FAMILY, 10, "bold"),
                 bg=BG_DARK, fg=TEXT_MUTED).pack(pady=(20, 12))

        fields = tk.Frame(self, bg=BG_DARK)
        fields.pack()

        self.p1_var = tk.StringVar(value=str(self.controller.p1_score))
        self.p2_var = tk.StringVar(value=str(self.controller.p2_score))
        self.p3_var = tk.StringVar(value=str(self.controller.p3_score))

        score_rows = [(self.controller.p1_name, self.p1_var), (self.controller.p2_name, self.p2_var)]
        if self.controller.mode == "3p":
            score_rows.append((self.controller.p3_name, self.p3_var))

        for row, (name, var) in enumerate(score_rows):
            tk.Label(fields, text=f"{name}:", font=(FONT_FAMILY, 10, "bold"),
                     bg=BG_DARK, fg=TEXT_MUTED, width=8, anchor="e").grid(
                         row=row, column=0, padx=(0, 8), pady=6)
            tk.Entry(fields, textvariable=var, font=(FONT_FAMILY, 11),
                     bg=BG_CARD, fg=TEXT_MAIN, insertbackground=TEXT_MAIN,
                     relief="flat", width=8, justify="center").grid(
                         row=row, column=1, ipady=5)

        self.error_label = tk.Label(self, text="", font=(FONT_FAMILY, 9),
                               bg=BG_DARK, fg=COLOR_ERROR)
        self.error_label.pack(pady=(4, 0))

        tk.Button(self, text="Save Changes", command=self.save,
                  font=(FONT_FAMILY, 9, "bold"), bg=ACCENT_BLUE, fg="white",
                  relief="flat", padx=16, pady=6, cursor="hand2",
                  activebackground=ACCENT_BLUE_HOVER, activeforeground="white").pack(pady=(4, 0))

    def save(self, _event=None):
        try:
            self.controller.p1_score = int(self.p1_var.get())
            self.controller.p2_score = int(self.p2_var.get())
            if self.controller.mode == "3p":
                self.controller.p3_score = int(self.p3_var.get())
            
            # Request app to update score display
            if hasattr(self.controller, 'update_score_screen_display'):
                self.controller.update_score_screen_display()
            self.destroy()
        except ValueError:
            self.error_label.config(text="Scores must be whole numbers.")
