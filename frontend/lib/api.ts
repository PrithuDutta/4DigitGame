export type Phase = "difficulty_select" | "mode_select" | "name_entry" | "round" | "score" | "podium";
export type Mode = "2p" | "3p" | null;
export type Difficulty = "easy" | "hard" | null;
export type ClickKey = "enter" | "shift" | "mouse";

export interface Clicks {
  enter: boolean;
  shift: boolean;
  mouse: boolean;
}

export interface RoundScoreBreakdown {
  solve_time: number | null;
  solve_bonus: number;
  speed_bonus: number;
  rank_bonus: number;
  round_score: number;
}

export interface RoundHistoryEntry {
  round_number: number;
  number: string;
  scores: Record<string, RoundScoreBreakdown>;
}

export interface Standing {
  player_id: string;
  name: string;
  score: number;
}

export interface GameStateDTO {
  phase: Phase;
  mode: Mode;
  difficulty: Difficulty;
  round_time: number;
  round_number: number;
  rounds_per_game: number;
  p1_name: string;
  p2_name: string;
  p3_name: string;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  standings: Standing[];
  round: {
    number: string;
    started: boolean;
    clicks: Clicks;
    deadline_ts: number | null;
  };
  score_message: string;
  last_number: string;
  last_round_scores: Record<string, RoundScoreBreakdown>;
  round_history: RoundHistoryEntry[];
  ready: Clicks;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const getState = () => api<GameStateDTO>("/api/state");

export const postDifficulty = (difficulty: "easy" | "hard") =>
  api<GameStateDTO>("/api/difficulty", { method: "POST", body: JSON.stringify({ difficulty }) });

export const postMode = (mode: "2p" | "3p") =>
  api<GameStateDTO>("/api/mode", { method: "POST", body: JSON.stringify({ mode }) });

export const postNames = (p1_name: string, p2_name: string, p3_name: string) =>
  api<GameStateDTO>("/api/names", {
    method: "POST",
    body: JSON.stringify({ p1_name, p2_name, p3_name }),
  });

export const postNewNumber = () =>
  api<GameStateDTO>("/api/round/new-number", { method: "POST" });

export const postPress = (key: ClickKey) =>
  api<GameStateDTO>("/api/round/press", { method: "POST", body: JSON.stringify({ key }) });

export const postTimeout = () =>
  api<GameStateDTO>("/api/round/timeout", { method: "POST" });

export const postScoreReady = (key: ClickKey) =>
  api<GameStateDTO>("/api/score/ready", { method: "POST", body: JSON.stringify({ key }) });

export const postBackToModeSelect = () =>
  api<GameStateDTO>("/api/mode-select", { method: "POST" });

export const getSandboxPuzzle = () =>
  api<{ number: string; digits: number[] }>("/api/sandbox/new-puzzle");

export const postAdminLogin = (password: string) =>
  api<{ ok: boolean }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });

export const postAdminScores = (p1_score: number, p2_score: number, p3_score: number) =>
  api<GameStateDTO>("/api/admin/scores", {
    method: "POST",
    body: JSON.stringify({ p1_score, p2_score, p3_score }),
  });
