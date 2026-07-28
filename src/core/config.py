import platform

ROUND_TIME = 15

if platform.system() == "Windows":
    FONT_FAMILY = "Segoe UI"
elif platform.system() == "Darwin":
    FONT_FAMILY = "Helvetica Neue"
else:
    FONT_FAMILY = "DejaVu Sans"

# Color Palette
BG_DARK = "#dbeafe"
BG_CARD = "#ffffff"
ACCENT_BLUE = "#4f46e5"
ACCENT_BLUE_HOVER = "#6366f1"
TEXT_MAIN = "#1e293b"
TEXT_MUTED = "#475569"
TEXT_DIM = "#64748b"
COLOR_GOLD = "#fbbf24"
COLOR_ERROR = "#f87171"

ADMIN_PASSWORD = "pqclarp"
