import tkinter as tk
import sys
import os

# Add project root to python path to allow imports from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.ui.app import App

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()
