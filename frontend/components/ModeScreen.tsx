interface Props {
  onSelect: (mode: "2p" | "3p") => void;
  onSandbox: () => void;
}

export default function ModeScreen({ onSelect, onSandbox }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col">
        <h1 className="mb-5 text-center text-base font-bold tracking-wide text-[var(--text-main)]">
          SELECT PLAYERS
        </h1>

        <button
          className="mb-2 rounded px-5 py-3 text-sm font-bold text-white transition-colors"
          style={{ background: "var(--accent-blue)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-blue-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-blue)")}
          onClick={() => onSelect("2p")}
        >
          2 Players
        </button>

        <button
          className="mb-2 rounded px-5 py-3 text-sm font-bold text-[#818cf8] transition-colors"
          style={{ background: "var(--bg-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#22223b")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
          onClick={() => onSelect("3p")}
        >
          3 Players
        </button>

        <button
          className="rounded px-5 py-3 text-sm font-bold text-[var(--text-muted)] transition-colors"
          style={{ background: "var(--bg-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#22223b")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
          onClick={onSandbox}
        >
          1 Player (Sandbox)
        </button>
      </div>
    </div>
  );
}
