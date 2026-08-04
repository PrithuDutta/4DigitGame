import type { GameStateDTO, Mode } from "@/lib/api";
import type { HistoryEntry, Tile } from "@/components/Sandbox";

export type Slot = string;

export interface PlayerDTO {
  slot: Slot;
  player_id?: string;
  name: string;
  score?: number;
  connected: boolean;
  is_host: boolean;
  ready?: boolean;
  clicked?: boolean;
  solved?: boolean;
  solve_time?: number | null;
  tiles?: Tile[];
  tile_history?: HistoryEntry[];
}

// Structural superset of GameStateDTO — RoundScreen/ScoreScreen accept this
// wherever they accept GameStateDTO with no type changes needed.
export interface RoomStateDTO extends GameStateDTO {
  room_code: string;
  target: number;
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
