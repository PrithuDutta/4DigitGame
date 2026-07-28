import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  remainingSeconds: number | null;
  onExit: () => void;
}

function Indicator({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="w-36 text-center text-sm font-bold"
      style={{ color: active ? "var(--color-success)" : "var(--text-muted)" }}
    >
      {label}
    </span>
  );
}

export default function RoundScreen({ state, remainingSeconds, onExit }: Props) {
  const { round, mode } = state;

  return (
    <div className="relative flex flex-1 flex-col items-center px-8 pt-4">
      <button
        className="absolute left-6 top-5 rounded px-3 py-1 text-xs font-bold text-[var(--text-muted)]"
        style={{ background: "var(--bg-card)" }}
        onClick={onExit}
      >
        Exit
      </button>

      <div className="absolute right-6 top-5 text-sm font-bold" style={{ color: "var(--color-gold)" }}>
        {state.round.started && remainingSeconds !== null ? `⏱ ${remainingSeconds}s` : ""}
      </div>

      <p className="mt-9 mb-1 text-xs font-bold tracking-wide" style={{ color: "var(--text-dim)" }}>
        ROUND {state.round_number} / {state.rounds_per_game}
      </p>
      <p className="mb-1 text-xs font-bold tracking-wide" style={{ color: "var(--text-dim)" }}>
        RANDOM NUMBER
      </p>

      <div
        className="w-full max-w-xs rounded border py-5 text-center"
        style={{ background: "var(--bg-card)", borderColor: "#272735" }}
      >
        <span className="font-mono text-6xl font-bold text-[var(--text-main)]">{round.number}</span>
      </div>

      <p className="mt-4 mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
        Press SPACE for new number
      </p>

      <div className="mt-2 flex gap-2">
        <Indicator label={`${state.p1_name} [ENTER]`} active={round.clicks.enter} />
        <Indicator label={`${state.p2_name} [SHIFT]`} active={round.clicks.shift} />
        {mode === "3p" && <Indicator label={`${state.p3_name} [LMB]`} active={round.clicks.mouse} />}
      </div>
    </div>
  );
}
