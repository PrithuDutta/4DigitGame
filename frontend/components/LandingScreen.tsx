"use client";

interface Props {
  onSelect: (choice: "local" | "online") => void;
}

export default function LandingScreen({ onSelect }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Game Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white">
            4-DIGIT REACTION
          </h1>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Fast mental math reaction challenge
          </p>
        </div>

        {/* Mode Options */}
        <div className="flex w-full flex-col gap-3">
          <button
            onClick={() => onSelect("local")}
            className="group flex w-full flex-col items-start rounded-xl border border-[#202738] bg-[#131722] p-4 text-left transition-colors hover:border-indigo-500 hover:bg-[#1a2030]"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-bold text-white group-hover:text-indigo-400">
                Play Locally
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                1-3 PLAYERS
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Same device with shared keyboard</p>
            <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 border border-slate-700">
                [ENTER]
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 border border-slate-700">
                [SHIFT]
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 border border-slate-700">
                [LMB]
              </span>
            </div>
          </button>

          <button
            onClick={() => onSelect("online")}
            className="group flex w-full flex-col items-start rounded-xl border border-[#202738] bg-[#131722] p-4 text-left transition-colors hover:border-cyan-500 hover:bg-[#1a2030]"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-bold text-white group-hover:text-cyan-400">
                Play Online
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                MULTIPLAYER
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Room code across separate devices</p>
          </button>
        </div>
      </div>
    </div>
  );
}
