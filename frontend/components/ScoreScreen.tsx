import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  onOpenAdmin: () => void;
  onChangeMode: () => void;
}

export default function ScoreScreen({ state, onOpenAdmin, onChangeMode }: Props) {
  const enterStatus = state.ready.enter ? "✓ ENTER ready" : "Waiting for ENTER...";
  const shiftStatus = state.ready.shift ? "✓ SHIFT ready" : "Waiting for SHIFT...";
  const p3Status = state.ready.mouse
    ? `✓ ${state.p3_name.toUpperCase()} ready`
    : "Waiting for Click...";

  const scoreLine =
    state.mode === "3p"
      ? `${state.p1_name}: ${state.p1_score}  |  ${state.p2_name}: ${state.p2_score}  |  ${state.p3_name}: ${state.p3_score}`
      : `${state.p1_name}: ${state.p1_score}   |   ${state.p2_name}: ${state.p2_score}`;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-xs flex-col items-center text-center">
        <div className="whitespace-pre-line text-[13px] font-bold leading-6 text-[var(--text-main)]">
          {state.score_message}
          {"\n\n"}
          {`Previous Number: ${state.last_number}`}
          {"\n\n"}
          {scoreLine}
          {"\n\n"}
          {enterStatus}
          {"\n"}
          {shiftStatus}
          {state.mode === "3p" && (
            <>
              {"\n"}
              {p3Status}
            </>
          )}
        </div>

        <p className="mt-4 mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Press ENTER, LMB, and SHIFT to continue
        </p>

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
