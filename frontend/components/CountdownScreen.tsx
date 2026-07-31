"use client";

import type { PlayerDTO } from "@/lib/types";

interface Props {
  remainingSeconds: number | null;
  players?: PlayerDTO[];
}

export default function CountdownScreen({ remainingSeconds, players = [] }: Props) {
  const displayCount = remainingSeconds !== null && remainingSeconds > 0 ? remainingSeconds : "GO!";

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 max-w-md mx-auto w-full text-center">
      <div className="w-full rounded-3xl border border-indigo-500/30 bg-[#131722]/90 p-8 shadow-[0_0_50px_rgba(99,102,241,0.25)] backdrop-blur-2xl">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
          MATCH STARTING
        </p>

        {/* Big Glowing Countdown Badge */}
        <div className="my-6 flex items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-indigo-500/50 bg-indigo-950/40 shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-pulse">
            <span className="font-mono text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(165,180,252,0.8)]">
              {displayCount}
            </span>
          </div>
        </div>

        <p className="text-base font-extrabold text-white tracking-wide">
          GET READY!
        </p>
        <p className="mt-1 text-xs text-slate-400">
          The first puzzle is about to appear on screen
        </p>

        {/* Players Joined Preview */}
        {players.length > 0 && (
          <div className="mt-6 border-t border-[#202738] pt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              PLAYERS IN MATCH ({players.length})
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {players.map((p) => (
                <span
                  key={p.slot}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 font-mono text-xs font-bold text-slate-300"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
