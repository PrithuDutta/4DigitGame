import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  onPlayAgain: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_HEIGHTS = ["h-28", "h-20", "h-14"];
const DISPLAY_ORDER = [1, 0, 2];

export default function Podium({ state, onPlayAgain }: Props) {
  const standings = state.standings;
  const positions = DISPLAY_ORDER.filter((i) => i < standings.length);
  const winner = standings[0];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
      {/* Victory Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          GAME OVER
        </h1>
        <p className="mt-1 text-xs text-amber-400 font-bold">
          WINNER: {winner?.name.toUpperCase()} (🥇 {winner?.score.toFixed(1)} PTS)
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          {state.rounds_per_game} rounds completed
        </p>
      </div>

      {/* Podium Display */}
      <div className="flex items-end justify-center gap-3 w-full max-w-sm my-2">
        {positions.map((rank) => {
          const player = standings[rank];
          const isWinner = rank === 0;

          return (
            <div key={player.player_id} className="flex flex-1 flex-col items-center max-w-[100px]">
              <span className="text-2xl mb-1">{MEDALS[rank]}</span>
              <p className="text-xs font-bold text-white truncate max-w-full">{player.name}</p>
              <p className="font-mono text-xs text-amber-400 font-bold mb-2">
                {player.score.toFixed(1)}
              </p>

              <div
                className={`w-full flex items-center justify-center rounded-t-xl border-t border-x font-mono font-bold text-sm text-slate-400 ${
                  PODIUM_HEIGHTS[rank]
                } ${
                  isWinner
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-[#202738] bg-[#131722]"
                }`}
              >
                #{rank + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Round Breakdown Table */}
      {state.round_history.length > 0 && (
        <div className="w-full max-w-md mt-6 rounded-xl border border-[#202738] bg-[#131722] p-4">
          <p className="mb-2 text-center font-mono text-xs font-bold text-slate-400 uppercase">
            ROUND HISTORY
          </p>

          <div className="max-h-40 overflow-y-auto rounded-lg border border-[#202738] bg-[#0b0d14] p-2 text-xs">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="border-b border-[#202738] text-slate-400">
                  <th className="px-2 py-1 text-left">RND</th>
                  {standings.map((p) => (
                    <th key={p.player_id} className="px-2 py-1 text-right text-slate-200">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202738]/50">
                {state.round_history.map((round) => (
                  <tr key={round.round_number}>
                    <td className="px-2 py-1 text-slate-500">#{round.round_number}</td>
                    {standings.map((p) => {
                      const score = round.scores[p.player_id]?.round_score;
                      return (
                        <td key={p.player_id} className="px-2 py-1 text-right text-emerald-400 font-semibold">
                          {score !== undefined ? `+${score.toFixed(0)}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={onPlayAgain}
        className="mt-6 w-full max-w-md rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
      >
        Play Again
      </button>
    </div>
  );
}
