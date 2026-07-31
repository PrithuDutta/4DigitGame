import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  onOpenAdmin: () => void;
  onChangeMode: () => void;
  actionSlot?: React.ReactNode;
}

export default function ScoreScreen({ state, onOpenAdmin, onChangeMode, actionSlot }: Props) {
  const isFinalRound = state.round_number >= state.rounds_per_game;

  const isOnline = Array.isArray((state as any).players);
  const rawPlayers = isOnline
    ? (state as any).players.map((p: any) => ({
        id: p.player_id || p.slot,
        name: p.name,
        keyLabel: null,
        ready: Boolean(p.ready || state.ready[p.player_id]),
        total: p.score ?? 0,
      }))
    : [
        { id: "p1", name: state.p1_name, keyLabel: "ENTER", ready: state.ready.enter, total: state.p1_score },
        { id: "p2", name: state.p2_name, keyLabel: "SHIFT", ready: state.ready.shift, total: state.p2_score },
        ...(state.mode === "3p"
          ? [{ id: "p3", name: state.p3_name, keyLabel: "LMB", ready: state.ready.mouse, total: state.p3_score }]
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
          {rawPlayers.map((p: any) => (
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
      </div>
    </div>
  );
}
