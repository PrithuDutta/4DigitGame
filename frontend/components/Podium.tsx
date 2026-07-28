import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  onPlayAgain: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_HEIGHTS = ["7rem", "5rem", "3.5rem"]; // 1st, 2nd, 3rd
// Display order left-to-right is 2nd, 1st, 3rd (classic podium); this maps
// a standings index (0 = 1st place) to its position in that display order.
const DISPLAY_ORDER = [1, 0, 2];

export default function Podium({ state, onPlayAgain }: Props) {
  const standings = state.standings;
  const positions = DISPLAY_ORDER.filter((i) => i < standings.length);

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-8">
      <h1 className="mb-1 text-center text-lg font-bold tracking-wide text-[var(--text-main)]">
        🏆 GAME OVER
      </h1>
      <p className="mb-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        {state.rounds_per_game} rounds complete
      </p>

      <div className="flex items-end gap-3">
        {positions.map((rank) => {
          const player = standings[rank];
          return (
            <div key={player.player_id} className="flex w-24 flex-col items-center">
              <div className="mb-1 text-2xl">{MEDALS[rank]}</div>
              <div className="mb-1 truncate text-sm font-bold text-[var(--text-main)]">{player.name}</div>
              <div className="mb-2 text-xs font-bold" style={{ color: "var(--color-gold)" }}>
                {player.score.toFixed(1)}
              </div>
              <div
                className="flex w-full items-start justify-center rounded-t border-x border-t pt-1 text-sm font-bold"
                style={{
                  height: PODIUM_HEIGHTS[rank],
                  background: "var(--bg-card)",
                  borderColor: "#272735",
                  color: "var(--text-dim)",
                }}
              >
                {rank + 1}
              </div>
            </div>
          );
        })}
      </div>

      {state.round_history.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <p className="mb-2 text-center text-xs font-bold tracking-wide" style={{ color: "var(--text-dim)" }}>
            ROUND-BY-ROUND
          </p>
          <div
            className="max-h-48 overflow-y-auto rounded border text-xs"
            style={{ background: "var(--bg-card)", borderColor: "#272735" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ color: "var(--text-muted)" }}>
                  <th className="px-2 py-1 text-left font-bold">#</th>
                  {standings.map((p) => (
                    <th key={p.player_id} className="px-2 py-1 text-right font-bold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.round_history.map((round) => (
                  <tr key={round.round_number} style={{ color: "var(--text-main)" }}>
                    <td className="px-2 py-1" style={{ color: "var(--text-dim)" }}>
                      {round.round_number}
                    </td>
                    {standings.map((p) => (
                      <td key={p.player_id} className="px-2 py-1 text-right">
                        {round.scores[p.player_id]?.round_score.toFixed(0) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        className="mt-8 rounded px-6 py-3 text-sm font-bold text-white"
        style={{ background: "var(--accent-blue)" }}
        onClick={onPlayAgain}
      >
        New Game
      </button>
    </div>
  );
}
