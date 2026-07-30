"use client";

interface Props {
  onSelect: (difficulty: "easy" | "hard") => void;
}

export default function DifficultyScreen({ onSelect }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-xs flex-col items-center">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white">SELECT DIFFICULTY</h2>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            onClick={() => onSelect("easy")}
            className="flex w-full flex-col items-start rounded-xl border border-[#202738] bg-[#131722] p-4 text-left transition-colors hover:border-emerald-500 hover:bg-[#1a2030]"
          >
            <span className="text-sm font-bold text-white">Easy Mode</span>
            <span className="text-xs text-slate-400 mt-0.5">+, -, *, / operations</span>
          </button>

          <button
            onClick={() => onSelect("hard")}
            className="flex w-full flex-col items-start rounded-xl border border-[#202738] bg-[#131722] p-4 text-left transition-colors hover:border-rose-500 hover:bg-[#1a2030]"
          >
            <span className="text-sm font-bold text-white">Hard Mode</span>
            <span className="text-xs text-slate-400 mt-0.5">All operations (factorials, roots, exponents)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
