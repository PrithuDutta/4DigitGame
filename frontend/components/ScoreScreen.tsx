import type { GameStateDTO } from "@/lib/api";
import type { RoomStateDTO } from "@/lib/types";
import { solvePuzzle } from "@/lib/sandboxMath";

interface Props {
  state: GameStateDTO | RoomStateDTO;
  onOpenAdmin: () => void;
  onChangeMode: () => void;
  onExit?: () => void;
  actionSlot?: React.ReactNode;
}

interface RowPlayer {
  id: string;
  name: string;
  keyLabel: string | null;
  ready: boolean;
  total: number;
  solved: boolean;
  solveTime: number | null;
  steps: string[];
}

export default function ScoreScreen({ state, onOpenAdmin, onChangeMode, onExit, actionSlot }: Props) {
  const isFinalRound = state.round_number >= state.rounds_per_game;
  const target = "target" in state && state.target ? state.target : 10;

  const lastDigits = (state.last_number || "")
    .split("")
    .filter((c) => /\d/.test(c))
    .map(Number);
  const sampleSteps = lastDigits.length === 4 ? solvePuzzle(lastDigits, target) : null;

  const rawPlayers: RowPlayer[] = "players" in state
    ? state.players.map((p) => {
        const b = state.last_round_scores[p.player_id || p.slot];
        const solved = p.solved ?? b?.solved ?? false;
        const solveTime = p.solve_time ?? b?.solve_time ?? null;

        let steps: string[] = [];
        if (p.tile_history && p.tile_history.length > 0) {
          steps = p.tile_history.map((h) => h.label);
        } else if (b?.tile_history && b.tile_history.length > 0) {
          steps = b.tile_history.map((h) => h.label);
        } else if (solved && sampleSteps) {
          steps = sampleSteps;
        }

        return {
          id: p.player_id || p.slot,
          name: p.name,
          keyLabel: null,
          ready: Boolean(p.ready),
          total: p.score ?? 0,
          solved,
          solveTime,
          steps,
        };
      })
    : [
        {
          id: "p1",
          name: state.p1_name,
          keyLabel: "ENTER",
          ready: state.ready.enter,
          total: state.p1_score,
          solved: Boolean(state.last_round_scores["p1"]?.solved || state.round.clicks.enter),
          solveTime: state.last_round_scores["p1"]?.solve_time ?? null,
          steps: (state.last_round_scores["p1"]?.solved || state.round.clicks.enter) && sampleSteps ? sampleSteps : [],
        },
        {
          id: "p2",
          name: state.p2_name,
          keyLabel: "SHIFT",
          ready: state.ready.shift,
          total: state.p2_score,
          solved: Boolean(state.last_round_scores["p2"]?.solved || state.round.clicks.shift),
          solveTime: state.last_round_scores["p2"]?.solve_time ?? null,
          steps: (state.last_round_scores["p2"]?.solved || state.round.clicks.shift) && sampleSteps ? sampleSteps : [],
        },
        ...(state.mode === "3p"
          ? [
              {
                id: "p3",
                name: state.p3_name,
                keyLabel: "LMB",
                ready: state.ready.mouse,
                total: state.p3_score,
                solved: Boolean(state.last_round_scores["p3"]?.solved || state.round.clicks.mouse),
                solveTime: state.last_round_scores["p3"]?.solve_time ?? null,
                steps: (state.last_round_scores["p3"]?.solved || state.round.clicks.mouse) && sampleSteps ? sampleSteps : [],
              },
            ]
          : []),
      ];

  // SORT PLAYERS BY TOTAL SCORE DESCENDING (Leader on top!)
  const sortedPlayers = [...rawPlayers].sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
      {/* Round Header & Message */}
      <div className="mb-4 text-center">
        <p className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
          ROUND {state.round_number} OF {state.rounds_per_game}
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">
          {state.score_message}
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Previous puzzle number: <span className="text-cyan-300 font-bold">{state.last_number}</span>
        </p>
      </div>

      {/* Leaderboard Table (Sorted by score so leader is on top!) */}
      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-4 mb-4">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
          CURRENT STANDINGS
        </p>

        <div className="flex flex-col gap-2">
          {sortedPlayers.map((player, rankIndex) => {
            const b = state.last_round_scores[player.id];
            const isLeader = rankIndex === 0;

            return (
              <div
                key={player.id}
                className={`flex flex-col rounded-lg border p-3 ${
                  isLeader
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-[#202738] bg-[#0b0d14]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {isLeader ? "👑 #1" : `#${rankIndex + 1}`}
                    </span>
                    <span className="text-sm font-bold text-white">{player.name}</span>
                    {player.keyLabel && (
                      <span className="font-mono text-[10px] text-slate-500">[{player.keyLabel}]</span>
                    )}
                  </div>

                  <div className="font-mono text-sm font-bold text-amber-400">
                    {player.total.toFixed(1)} <span className="text-[10px] text-slate-500">PTS</span>
                  </div>
                </div>

                {/* Round Breakdown */}
                {b && (
                  <div className="mt-2 grid grid-cols-4 gap-1 border-t border-[#202738] pt-1.5 font-mono text-[11px] text-slate-400">
                    <div>
                      <span className="block text-[9px] text-slate-500">SOLVE</span>
                      <span>{b.solve_bonus > 0 ? `+${b.solve_bonus.toFixed(0)}` : "0"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500">SPEED</span>
                      <span>{b.speed_bonus > 0 ? `+${b.speed_bonus.toFixed(0)}` : "0"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500">RANK</span>
                      <span>{b.rank_bonus > 0 ? `+${b.rank_bonus.toFixed(0)}` : "0"}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-emerald-400">ROUND</span>
                      <span className="font-bold text-emerald-400">+{b.round_score.toFixed(0)}</span>
                    </div>
                  </div>
                )}

                {/* Solution breakdown row */}
                <div className="mt-2 pt-2 border-t border-[#202738]">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <div className="flex items-center gap-1">
                      {player.solved ? (
                        <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          🎯 Solution to {target}:
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          ❌ Did not reach {target}
                        </span>
                      )}
                    </div>

                    {player.solved && player.solveTime !== null && (
                      <span className="font-mono text-[10px] text-slate-400">
                        ⏱ {player.solveTime.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  {player.solved ? (
                    <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                      {player.steps.length > 0 ? (
                        player.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-slate-600 font-bold text-[10px]">➔</span>}
                            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-emerald-300 font-bold">
                              {step}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Solved!</span>
                      )}
                    </div>
                  ) : (
                    sampleSteps && sampleSteps.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-slate-500 mt-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mr-0.5">
                          Sample:
                        </span>
                        {sampleSteps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-slate-700">➔</span>}
                            <span className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-400">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ready Badges */}
      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-3 text-center mb-4">
        <p className="mb-2 text-xs font-semibold text-slate-400">
          {isFinalRound ? "Ready up for final results" : "Ready up for next round"}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {rawPlayers.map((p) => (
            <span
              key={p.id}
              className={`rounded px-2.5 py-1 text-xs font-bold font-mono border ${
                p.ready
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : "border-[#202738] bg-[#0b0d14]"
              }`}
            >
              {p.name}{p.keyLabel ? ` [${p.keyLabel}]` : ""}: {p.ready ? "READY ✓" : "WAITING..."}
            </span>
          ))}
        </div>
      </div>

      {actionSlot && <div className="mb-4 w-full max-w-md">{actionSlot}</div>}

      {/* Action Toolbar */}
      <div className="flex gap-2">
        <button
          onClick={onOpenAdmin}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
        >
          Admin Panel
        </button>
        <button
          onClick={onChangeMode}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          Change Mode
        </button>
        {onExit && (
          <button
            onClick={onExit}
            className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            ← Exit
          </button>
        )}
      </div>
    </div>
  );
}

