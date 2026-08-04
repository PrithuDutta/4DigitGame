import { io, Socket } from "socket.io-client";

import type {
  AdminLoginResultDTO,
  Mode,
  RoomStateDTO,
  SessionDTO,
  SocketErrorDTO,
} from "@/lib/types";
import type { BinaryOpKind, UnaryOpKind } from "@/lib/sandboxMath";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";

const STORAGE_KEY = "4digit_online_session";

export interface StoredSession {
  room_code: string;
  player_id: string;
}

// Persisted across page reloads so a refresh mid-game can rejoin the same
// seat instead of landing back on the "choose local/online" screen.
export function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

let socket: Socket | null = null;

// Lazily opens the connection — only once the user picks "Play Online",
// not on every page load (local mode never touches this file at all).
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, { autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// --- emit helpers, matching backend/sockets.py's event contract exactly ---

export function createRoom(name: string) {
  getSocket().emit("create_room", { name });
}

export function joinRoom(roomCode: string, name: string) {
  getSocket().emit("join_room", { room_code: roomCode, name });
}

export function rejoinRoom(roomCode: string, playerId: string) {
  getSocket().emit("rejoin_room", { room_code: roomCode, player_id: playerId });
}

export function startGame() {
  getSocket().emit("start_game", {});
}

export function selectMode(mode: Mode) {
  getSocket().emit("select_mode", { mode });
}

export function tileCommit(leftId: number, rightId: number, op: BinaryOpKind) {
  getSocket().emit("tile_commit", { left_id: leftId, right_id: rightId, op });
}

export function tileUnary(tileId: number, op: UnaryOpKind) {
  getSocket().emit("tile_unary", { tile_id: tileId, op });
}

export function tileUndo() {
  getSocket().emit("tile_undo", {});
}

export function scoreReady() {
  getSocket().emit("score_ready", {});
}

export function timeout() {
  getSocket().emit("timeout", {});
}

export function leaveRoom() {
  getSocket().emit("leave_room", {});
}

export function backToModeSelect() {
  getSocket().emit("back_to_mode_select", {});
}

export function adminLogin(password: string) {
  getSocket().emit("admin_login", { password });
}

export function adminScores(scores: Record<string, number> | number, p2_score?: number, p3_score?: number) {
  if (typeof scores === "object") {
    getSocket().emit("admin_scores", { scores });
  } else {
    getSocket().emit("admin_scores", { p1_score: scores, p2_score, p3_score });
  }
}

// --- subscriptions — each returns an unsubscribe function for useEffect cleanup ---

export function onRoomState(cb: (state: RoomStateDTO) => void) {
  const s = getSocket();
  s.on("room_state", cb);
  return () => {
    s.off("room_state", cb);
  };
}

export function onSession(cb: (session: SessionDTO) => void) {
  const s = getSocket();
  s.on("session", cb);
  return () => {
    s.off("session", cb);
  };
}

export function onError(cb: (error: SocketErrorDTO) => void) {
  const s = getSocket();
  s.on("error", cb);
  return () => {
    s.off("error", cb);
  };
}

export function onAdminLoginResult(cb: (result: AdminLoginResultDTO) => void) {
  const s = getSocket();
  s.on("admin_login_result", cb);
  return () => {
    s.off("admin_login_result", cb);
  };
}

export function onConnect(cb: () => void) {
  const s = getSocket();
  s.on("connect", cb);
  return () => {
    s.off("connect", cb);
  };
}

export function onDisconnect(cb: () => void) {
  const s = getSocket();
  s.on("disconnect", cb);
  return () => {
    s.off("disconnect", cb);
  };
}
