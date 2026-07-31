"use client";

import { useState } from "react";
import type { Mode, RoomStateDTO, SessionDTO } from "@/lib/types";

interface Props {
  session: SessionDTO | null;
  roomState: RoomStateDTO | null;
  error: string | null;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  onSelectMode: (mode: Mode) => void;
  onStartGame?: () => void;
  onLeaveRoom: () => void;
  onBackToLanding: () => void;
}

export default function LobbyScreen({
  session,
  roomState,
  error,
  onCreateRoom,
  onJoinRoom,
  onSelectMode,
  onStartGame,
  onLeaveRoom,
  onBackToLanding,
}: Props) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  if (!session || !roomState) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full max-w-sm flex-col items-center">
          <div className="mb-6 text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
              MULTIPLAYER
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-wide text-white">
              ONLINE LOBBY
            </h2>
          </div>

          <div className="w-full flex flex-col gap-4">
            {/* Create Room Card */}
            <div className="rounded-2xl border border-indigo-500/30 bg-[var(--bg-card)] p-5 backdrop-blur-xl">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-indigo-300">
                CREATE A ROOM
              </p>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && createName.trim()) onCreateRoom(createName.trim());
                }}
                placeholder="Enter host display name"
                className="mb-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-indigo-500 focus:bg-slate-950"
              />
              <button
                onClick={() => createName.trim() && onCreateRoom(createName.trim())}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
              >
                Create Room
              </button>
            </div>

            {/* Join Room Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-[var(--bg-card)] p-5 backdrop-blur-xl">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                JOIN A ROOM
              </p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER 4-LETTER CODE"
                className="mb-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-center font-mono text-base font-bold uppercase tracking-widest text-cyan-300 outline-none focus:border-cyan-500 focus:bg-slate-950"
              />
              <input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && joinCode.trim() && joinName.trim()) {
                    onJoinRoom(joinCode.trim(), joinName.trim());
                  }
                }}
                placeholder="Your display name"
                className="mb-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-500 focus:bg-slate-950"
              />
              <button
                onClick={() => joinCode.trim() && joinName.trim() && onJoinRoom(joinCode.trim(), joinName.trim())}
                className="w-full rounded-xl bg-cyan-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 hover:bg-cyan-500 transition-all"
              >
                Join Room
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-2.5 text-center text-xs font-semibold text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={onBackToLanding}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Back to Title
            </button>
          </div>
        </div>
      </div>
    );
  }

  const joinedCount = roomState.players.length;

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        {/* Room Code Display */}
        <div className="w-full rounded-2xl border border-cyan-500/40 bg-slate-950 p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            ROOM PASSCODE
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-extrabold tracking-widest text-cyan-300">
              {roomState.room_code}
            </span>
            <button
              onClick={copyCode}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-500/20"
            >
              {copied ? "Copied! ✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="w-full rounded-2xl border border-slate-800 bg-[var(--bg-card)] p-4 backdrop-blur-xl mb-4 text-left">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            CONNECTED PLAYERS ({joinedCount})
          </p>
          <div className="flex flex-col gap-2">
            {roomState.players.map((p) => (
              <div
                key={p.slot}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.connected ? "bg-emerald-400 animate-ping" : "bg-rose-500"
                    }`}
                  />
                  <span className="font-bold text-white">{p.name}</span>
                  {p.is_host && (
                    <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-400/30">
                      HOST
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {p.connected ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Control for Host */}
        {session.is_host && (
          <div className="w-full rounded-2xl border border-indigo-500/30 bg-[var(--bg-card)] p-4 backdrop-blur-xl mb-4">
            <p className="mb-2 font-mono text-xs font-bold text-indigo-300">HOST CONTROLS</p>
            <button
              disabled={joinedCount < 2}
              onClick={() => (onStartGame ? onStartGame() : onSelectMode("3p"))}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all ${
                joinedCount < 2
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-500"
              }`}
            >
              🚀 Start Game ({joinedCount} Player{joinedCount === 1 ? "" : "s"})
            </button>
            {joinedCount < 2 && (
              <p className="mt-2 text-[11px] text-amber-400/90 font-medium">
                ⏳ Waiting for at least 1 more player to join... (Minimum 2 players)
              </p>
            )}
          </div>
        )}

        {!session.is_host && (
          <div className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400 mb-4">
            ⏳ Waiting for host to start the game...
          </div>
        )}

        {error && (
          <div className="w-full mb-3 rounded-lg border border-rose-500/30 bg-rose-950/40 p-2.5 text-center text-xs font-semibold text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={onLeaveRoom}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
