import type { GameStateDTO, Mode } from "@/lib/api";

export type Slot = "p1" | "p2" | "p3";

export interface PlayerDTO {
  slot: Slot;
  name: string;
  connected: boolean;
  is_host: boolean;
}

// Structural superset of GameStateDTO — RoundScreen/ScoreScreen accept this
// wherever they accept GameStateDTO with no type changes needed.
export interface RoomStateDTO extends GameStateDTO {
  room_code: string;
  players: PlayerDTO[];
}

export interface SessionDTO {
  room_code: string;
  player_id: string;
  slot: Slot;
  is_host: boolean;
}

export interface SocketErrorDTO {
  code: string;
  message: string;
}

export interface AdminLoginResultDTO {
  ok: boolean;
}

export type { Mode };
