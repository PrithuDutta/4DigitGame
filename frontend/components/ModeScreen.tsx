"use client";

interface Props {
  onSelect: (mode: "2p" | "3p") => void;
  onSandbox: () => void;
}

export default function ModeScreen({ onSelect, onSandbox }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-xs flex-col items-center">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white">SELECT PLAYERS</h2>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <button
            onClick={() => onSelect("2p")}
            className="flex w-full items-center justify-between rounded-xl border border-[#202738] bg-[#131722] p-3.5 text-sm font-bold text-white transition-colors hover:border-indigo-500 hover:bg-[#1a2030]"
          >
            <span>2 Players</span>
            <div className="flex gap-1 font-mono text-[10px] text-slate-400">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">[ENTER]</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">[SHIFT]</span>
            </div>
          </button>

          <button
            onClick={() => onSelect("3p")}
            className="flex w-full items-center justify-between rounded-xl border border-[#202738] bg-[#131722] p-3.5 text-sm font-bold text-white transition-colors hover:border-cyan-500 hover:bg-[#1a2030]"
          >
            <span>3 Players</span>
            <div className="flex gap-1 font-mono text-[10px] text-slate-400">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">[ENTER]</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">[SHIFT]</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">[LMB]</span>
            </div>
          </button>

          <button
            onClick={onSandbox}
            className="flex w-full items-center justify-between rounded-xl border border-[#202738] bg-[#131722] p-3.5 text-sm font-bold text-slate-300 transition-colors hover:border-purple-500 hover:bg-[#1a2030]"
          >
            <span>1 Player (Sandbox)</span>
            <span className="font-mono text-[10px] text-purple-400">SOLO</span>
          </button>
        </div>
      </div>
    </div>
  );
}
