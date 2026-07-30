import type { GameStateDTO } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  remainingSeconds: number | null;
  onExit: () => void;
  actionSlot?: React.ReactNode;
}

function KeyIndicator({
  label,
  keyBind,
  active,
}: {
  label: string;
  keyBind: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-between rounded-xl border p-3 min-w-[110px] sm:min-w-[120px] transition-colors ${
        active
          ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
          : "border-[#202738] bg-[#131722] text-slate-300"
      }`}
    >
      <span className="text-xs font-bold truncate max-w-[100px] mb-1.5 text-slate-200">
        {label}
      </span>
      <span
        className={`keycap rounded px-2 py-0.5 font-mono text-xs font-bold border ${
          active
            ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
            : "border-slate-700 bg-slate-800 text-slate-400"
        }`}
      >
        {active ? "READY ✓" : keyBind}
      </span>
    </div>
  );
}

export default function RoundScreen({ state, remainingSeconds, onExit, actionSlot }: Props) {
  const { round, mode } = state;
  const isStarted = state.round.started && remainingSeconds !== null;
  const timerPercent = remainingSeconds !== null ? Math.max(0, Math.min(100, (remainingSeconds / 10) * 100)) : 100;

  const timerColor =
    remainingSeconds !== null && remainingSeconds <= 3
      ? "bg-rose-500"
      : remainingSeconds !== null && remainingSeconds <= 5
      ? "bg-amber-400"
      : "bg-indigo-500";

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-6 pb-8 max-w-xl mx-auto w-full">
      {/* Top Header Bar */}
      <div className="flex w-full items-center justify-between mb-4">
        <button
          onClick={onExit}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-white"
        >
          ← Exit
        </button>

        <div className="text-center">
          <p className="text-xs font-bold tracking-wider text-slate-400">
            ROUND {state.round_number} <span className="text-slate-600">/</span> {state.rounds_per_game}
          </p>
        </div>

        <div className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
          ⏱ {isStarted ? `${remainingSeconds}s` : "--"}
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full bg-[#131722] h-1.5 rounded-full overflow-hidden mb-8 border border-[#202738]">
        <div
          className={`h-full transition-all duration-200 rounded-full ${timerColor}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Number Card Display - Guaranteed Single Line */}
      <div className="w-full flex flex-col items-center">
        <p className="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">
          PUZZLE NUMBER
        </p>

        <div className="w-full max-w-md rounded-2xl border border-[#202738] bg-[#131722] py-8 px-4 text-center">
          <span className="font-mono text-5xl sm:text-6xl font-bold tracking-wider text-white whitespace-nowrap inline-block">
            {round.number}
          </span>
        </div>

        {/* Spacebar Prompt */}
        <p className="mt-4 text-xs text-slate-400">
          Press <span className="font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-bold">[ SPACEBAR ]</span> for new number
        </p>
      </div>

      {/* Keybind Indicators */}
      <div className="mt-8 w-full max-w-md">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KeyIndicator
            label={state.p1_name}
            keyBind="ENTER"
            active={round.clicks.enter}
          />
          <KeyIndicator
            label={state.p2_name}
            keyBind="SHIFT"
            active={round.clicks.shift}
          />
          {mode === "3p" && (
            <KeyIndicator
              label={state.p3_name}
              keyBind="LMB"
              active={round.clicks.mouse}
            />
          )}
        </div>
      </div>

      {actionSlot && <div className="mt-6 w-full max-w-md">{actionSlot}</div>}
    </div>
  );
}
