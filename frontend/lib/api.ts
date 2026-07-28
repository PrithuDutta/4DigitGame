export type Mode = "2p" | "3p";
export type Phase = "mode_select" | "name_entry" | "round" | "score";
export type PressKey = "enter" | "shift" | "mouse";

export interface GameStateDTO {
  phase: Phase;
  mode: Mode | null;
  round_time: number;
  p1_name: string;
  p2_name: string;
  p3_name: string;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  round: {
    number: string;
    started: boolean;
    clicks: { enter: boolean; shift: boolean; mouse: boolean };
    deadline_ts: number | null;
  };
  score_message: string;
  last_number: string;
  ready: { enter: boolean; shift: boolean; mouse: boolean };
}

export interface ConfigDTO {
  round_time: number;
  colors: {
    bg_dark: string;
    bg_card: string;
    accent_blue: string;
    accent_blue_hover: string;
    text_main: string;
    text_muted: string;
    text_dim: string;
    color_gold: string;
    color_error: string;
    color_success: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export function getConfig() {
  return get<ConfigDTO>("/api/config");
}

export function getState() {
  return get<GameStateDTO>("/api/state");
}

export function postMode(mode: Mode) {
  return post<GameStateDTO>("/api/mode", { mode });
}

export function postNames(p1_name: string, p2_name: string, p3_name: string) {
  return post<GameStateDTO>("/api/names", { p1_name, p2_name, p3_name });
}

export function postNewNumber() {
  return post<GameStateDTO>("/api/round/new-number");
}

export function postPress(key: PressKey) {
  return post<GameStateDTO>("/api/round/press", { key });
}

export function postTimeout() {
  return post<GameStateDTO>("/api/round/timeout");
}

export function postScoreReady(key: PressKey) {
  return post<GameStateDTO>("/api/score/ready", { key });
}

export function postBackToModeSelect() {
  return post<GameStateDTO>("/api/mode-select");
}

export function postAdminLogin(password: string) {
  return post<{ ok: boolean }>("/api/admin/login", { password });
}

export function postAdminScores(p1_score: number, p2_score: number, p3_score: number) {
  return post<GameStateDTO>("/api/admin/scores", { p1_score, p2_score, p3_score });
}
