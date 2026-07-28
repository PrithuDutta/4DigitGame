import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  onOpenAdmin: () => void;
  onChangeMode: () => void;
  actionSlot?: React.ReactNode;
}

export default function ScoreScreen({ state, onOpenAdmin, onChangeMode, actionSlot }: Props) {
  const enterStatus = state.ready.enter ? "✓ ENTER ready" : "Waiting for ENTER...";
  const shiftStatus = state.ready.shift ? "✓ SHIFT ready" : "Waiting for SHIFT...";
  const p3Status = state.ready.mouse
    ? `✓ ${state.p3_name.toUpperCase()} ready`
    : "Waiting for Click...";

  const isFinalRound = state.round_number >= state.rounds_per_game;
  const players = [
    { id: "p1", name: state.p1_name },
    { id: "p2", name: state.p2_name },
    ...(state.mode === "3p" ? [{ id: "p3", name: state.p3_name }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <p className="mb-1 text-xs font-bold tracking-wide" style={{ color: "var(--text-dim)" }}>
        ROUND {state.round_number} / {state.rounds_per_game}
      </p>
      <p className="mb-4 text-sm font-bold text-[var(--text-main)]">{state.score_message}</p>

      <div
        className="w-full max-w-sm overflow-hidden rounded border text-xs"
        style={{ background: "var(--bg-card)", borderColor: "#272735" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="px-2 py-2 text-left font-bold">Player</th>
              <th className="px-2 py-2 text-right font-bold">Solve</th>
              <th className="px-2 py-2 text-right font-bold">Speed</th>
              <th className="px-2 py-2 text-right font-bold">Rank</th>
              <th className="px-2 py-2 text-right font-bold">Round</th>
              <th className="px-2 py-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map(({ id, name }) => {
              const b = state.last_round_scores[id];
              const total = state[`${id}_score` as "p1_score" | "p2_score" | "p3_score"];
              return (
                <tr key={id} style={{ color: "var(--text-main)" }}>
                  <td className="px-2 py-1.5 font-bold">{name}</td>
                  <td className="px-2 py-1.5 text-right">{b ? b.solve_bonus.toFixed(0) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{b ? b.speed_bonus.toFixed(0) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{b ? b.rank_bonus.toFixed(0) : "—"}</td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: "var(--color-success)" }}>
                    {b ? b.round_score.toFixed(0) : "0"}
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: "var(--color-gold)" }}>
                    {total.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {`Previous Number: ${state.last_number}`}
      </p>

      <div className="mt-4 text-center text-xs font-bold leading-5" style={{ color: "var(--text-main)" }}>
        {enterStatus}
        <br />
        {shiftStatus}
        {state.mode === "3p" && (
          <>
            <br />
            {p3Status}
          </>
        )}
      </div>

      <p className="mt-3 mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {isFinalRound
          ? "Press ENTER, LMB, and SHIFT to see the results"
          : "Press ENTER, LMB, and SHIFT to continue"}
      </p>

        {actionSlot && <div className="mb-3">{actionSlot}</div>}

        <div className="mt-2 flex gap-1">
          <button
            className="rounded px-3 py-1 text-xs font-bold text-[#818cf8]"
            style={{ background: "var(--bg-card)" }}
            onClick={onOpenAdmin}
          >
            Admin Panel
          </button>
          <button
            className="rounded px-3 py-1 text-xs font-bold text-[var(--text-muted)]"
            style={{ background: "var(--bg-card)" }}
            onClick={onChangeMode}
          >
            Change Mode
          </button>
        </div>
      </div>
    </div>
  );
}
