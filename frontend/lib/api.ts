export type Mode = "2p" | "3p";
export type Difficulty = "easy" | "hard";
export type Phase = "difficulty_select" | "mode_select" | "name_entry" | "countdown" | "round" | "score" | "podium";
export type PressKey = "enter" | "shift" | "mouse";

export interface RoundScoreDTO {
  solve_time: number | null;
  solve_bonus: number;
  speed_bonus: number;
  rank_bonus: number;
  round_score: number;
}

export interface StandingDTO {
  player_id: string;
  name: string;
  score: number;
}

export interface RoundHistoryEntryDTO {
  round_number: number;
  number: string;
  scores: Record<string, RoundScoreDTO>;
}

export interface GameStateDTO {
  phase: Phase;
  mode: Mode | null;
  difficulty: Difficulty | null;
  round_time: number;
  round_number: number;
  rounds_per_game: number;
  p1_name: string;
  p2_name: string;
  p3_name: string;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  standings: StandingDTO[];
  round: {
    number: string;
    started: boolean;
    clicks: Record<string, boolean>;
    deadline_ts: number | null;
  };
  score_message: string;
  last_number: string;
  last_round_scores: Record<string, RoundScoreDTO>;
  round_history: RoundHistoryEntryDTO[];
  ready: Record<string, boolean>;
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

export function postDifficulty(difficulty: Difficulty) {
  return post<GameStateDTO>("/api/difficulty", { difficulty });
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

export interface SandboxPuzzleDTO {
  number: string;
  digits: number[];
}

export function postAdminScores(p1_score: number, p2_score: number, p3_score: number) {
  return post<GameStateDTO>("/api/admin/scores", { p1_score, p2_score, p3_score });
}

export function getSandboxPuzzle() {
  return get<SandboxPuzzleDTO>("/api/sandbox/new-puzzle");
}

