import os

BG_DARK = "#0d0d12"
BG_CARD = "#16161f"
ACCENT_BLUE = "#4f46e5"
ACCENT_BLUE_HOVER = "#6366f1"
TEXT_MAIN = "#f3f4f6"
TEXT_MUTED = "#9ca3af"
TEXT_DIM = "#4b5563"
COLOR_GOLD = "#fbbf24"
COLOR_ERROR = "#f87171"
COLOR_SUCCESS = "#10b981"

ADMIN_PASSWORD = "pqclarp"

FRONTEND_ORIGINS = os.environ.get(
    "FRONTEND_ORIGIN", "http://localhost:3000,http://localhost:3001"
).split(",")
