"use client";

import type { BinaryOpKind, UnaryOpKind } from "@/lib/sandboxMath";
import type { PlayerDTO, RoomStateDTO } from "@/lib/types";
import Sandbox from "./Sandbox";

interface Props {
  state: RoomStateDTO;
  me: PlayerDTO | null | undefined;
  remainingSeconds: number | null;
  onExit: () => void;
  onCommit: (leftId: number, rightId: number, op: BinaryOpKind) => void;
  onUnary: (tileId: number, op: UnaryOpKind) => void;
  onUndo: () => void;
  tileError: string | null;
}

export default function MultiplayerRoundScreen({
  state,
  me,
  remainingSeconds,
  onExit,
  onCommit,
  onUnary,
  onUndo,
  tileError,
}: Props) {
  const isStarted = state.round.started && remainingSeconds !== null;
  const timerPercent = remainingSeconds !== null ? Math.max(0, Math.min(100, (remainingSeconds / 90) * 100)) : 100;
  const timerColor =
    remainingSeconds !== null && remainingSeconds <= 10
      ? "bg-rose-500"
      : remainingSeconds !== null && remainingSeconds <= 30
      ? "bg-amber-400"
      : "bg-indigo-500";

  const others = state.players.filter(
    (p) => (p.player_id ?? p.slot) !== (me?.player_id ?? me?.slot)
  );

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-6 pb-8 max-w-xl mx-auto w-full">
      <div className="flex w-full items-center justify-between mb-4">
        <button
          onClick={onExit}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-white"
        >
          ← Exit
        </button>

        <p className="text-xs font-bold tracking-wider text-slate-400">
          ROUND {state.round_number} <span className="text-slate-600">/</span> {state.rounds_per_game}
        </p>

        <div className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
          ⏱ {isStarted ? `${remainingSeconds}s` : "--"}
        </div>
      </div>

      <div className="w-full bg-[#131722] h-1.5 rounded-full overflow-hidden mb-4 border border-[#202738]">
        <div
          className={`h-full transition-all duration-200 rounded-full ${timerColor}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {others.length > 0 && (
        <div className="w-full mb-3 flex flex-wrap justify-center gap-2">
          {others.map((p) => {
            const tilesLeft = p.tiles?.length ?? 4;
            return (
              <span
                key={p.player_id ?? p.slot}
                className={`rounded px-2.5 py-1 text-xs font-bold font-mono border ${
                  p.solved
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                    : "border-[#202738] bg-[#0b0d14] text-slate-400"
                }`}
              >
                {p.name}: {p.solved ? "SOLVED ✓" : `${tilesLeft} tile${tilesLeft === 1 ? "" : "s"} left`}
              </span>
            );
          })}
        </div>
      )}

      <Sandbox
        multiplayer={{
          tiles: me?.tiles ?? [],
          target: state.target,
          history: me?.tile_history ?? [],
          solved: me?.solved ?? false,
          error: tileError,
          onCommit,
          onUnary,
          onUndo,
        }}
      />
    </div>
  );
}
