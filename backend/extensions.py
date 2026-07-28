from flask_socketio import SocketIO

from config import FRONTEND_ORIGINS

socketio = SocketIO(cors_allowed_origins=FRONTEND_ORIGINS)
