interface Props {
  onSelect: (difficulty: "easy" | "hard") => void;
}

export default function DifficultyScreen({ onSelect }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col">
        <h1 className="mb-5 text-center text-base font-bold tracking-wide text-[var(--text-main)]">
          SELECT GAME MODE
        </h1>

        <button
          className="mb-2 rounded px-5 py-3 text-sm font-bold text-white transition-colors flex flex-col items-center"
          style={{ background: "var(--accent-blue)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-blue-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-blue)")}
          onClick={() => onSelect("easy")}
        >
          <span>Easy Mode</span>
          <span className="text-xs font-normal opacity-80 mt-1">+, -, *, / only</span>
        </button>

        <button
          className="rounded px-5 py-3 text-sm font-bold text-[#818cf8] transition-colors flex flex-col items-center"
          style={{ background: "var(--bg-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#22223b")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
          onClick={() => onSelect("hard")}
        >
          <span>Hard Mode</span>
          <span className="text-xs font-normal opacity-80 mt-1">All operations</span>
        </button>
      </div>
    </div>
  );
}
