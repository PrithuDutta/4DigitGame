interface Props {
  onSelect: (choice: "local" | "online") => void;
}

export default function LandingScreen({ onSelect }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-xs flex-col">
        <h1 className="mb-1 text-center text-lg font-bold tracking-wide text-[var(--text-main)]">
          4 DIGIT REACTION GAME
        </h1>
        <p className="mb-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Choose how you want to play
        </p>

        <button
          className="mb-2 rounded px-5 py-3 text-sm font-bold text-white transition-colors"
          style={{ background: "var(--accent-blue)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-blue-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-blue)")}
          onClick={() => onSelect("local")}
        >
          Play Locally
          <span className="block text-xs font-normal opacity-80">Same device, shared keyboard</span>
        </button>

        <button
          className="rounded px-5 py-3 text-sm font-bold text-[#818cf8] transition-colors"
          style={{ background: "var(--bg-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#22223b")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
          onClick={() => onSelect("online")}
        >
          Play Online
          <span className="block text-xs font-normal opacity-80">Room code, separate devices</span>
        </button>
      </div>
    </div>
  );
}
