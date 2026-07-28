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
  onLeaveRoom,
  onBackToLanding,
}: Props) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  if (!session || !roomState) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xs">
          <h1 className="mb-5 text-center text-base font-bold tracking-wide text-[var(--text-main)]">
            PLAY ONLINE
          </h1>

          <div className="mb-4 rounded p-4" style={{ background: "var(--bg-card)" }}>
            <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">CREATE A ROOM</p>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && createName.trim()) onCreateRoom(createName.trim());
              }}
              placeholder="Your name"
              className="mb-2 w-full rounded px-3 py-2 text-sm text-[var(--text-main)] outline-none"
              style={{ background: "var(--bg-dark)" }}
            />
            <button
              className="w-full rounded px-4 py-2 text-sm font-bold text-white"
              style={{ background: "var(--accent-blue)" }}
              onClick={() => createName.trim() && onCreateRoom(createName.trim())}
            >
              Create Room
            </button>
          </div>

          <div className="mb-3 rounded p-4" style={{ background: "var(--bg-card)" }}>
            <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">JOIN A ROOM</p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              className="mb-2 w-full rounded px-3 py-2 text-center text-sm uppercase tracking-widest text-[var(--text-main)] outline-none"
              style={{ background: "var(--bg-dark)" }}
            />
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && joinCode.trim() && joinName.trim()) {
                  onJoinRoom(joinCode.trim(), joinName.trim());
                }
              }}
              placeholder="Your name"
              className="mb-2 w-full rounded px-3 py-2 text-sm text-[var(--text-main)] outline-none"
              style={{ background: "var(--bg-dark)" }}
            />
            <button
              className="w-full rounded px-4 py-2 text-sm font-bold text-white"
              style={{ background: "var(--accent-blue)" }}
              onClick={() => joinCode.trim() && joinName.trim() && onJoinRoom(joinCode.trim(), joinName.trim())}
            >
              Join Room
            </button>
          </div>

          {error && (
            <p className="mb-3 text-center text-xs" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          )}

          <button
            className="w-full rounded px-5 py-3 text-sm font-bold text-[var(--text-muted)]"
            style={{ background: "var(--bg-card)" }}
            onClick={onBackToLanding}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const requiredCount = roomState.mode === "3p" ? 3 : roomState.mode === "2p" ? 2 : null;
  const joinedCount = roomState.players.length;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-xs text-center">
        <p className="mb-1 text-xs font-bold tracking-wide text-[var(--text-dim)]">ROOM CODE</p>
        <p className="mb-5 font-mono text-4xl font-bold tracking-widest text-[var(--text-main)]">
          {roomState.room_code}
        </p>

        <div className="mb-5 rounded p-3 text-left" style={{ background: "var(--bg-card)" }}>
          {roomState.players.map((p) => (
            <div key={p.slot} className="flex items-center justify-between py-1 text-sm">
              <span className="text-[var(--text-main)]">
                {p.name}
                {p.is_host && <span className="ml-1" style={{ color: "var(--color-gold)" }}>(host)</span>}
              </span>
              <span style={{ color: p.connected ? "var(--color-success)" : "var(--color-error)" }}>
                {p.connected ? "●" : "○"}
              </span>
            </div>
          ))}
        </div>

        {session.is_host && !roomState.mode && (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-xs font-bold text-[var(--text-muted)]">PICK A MODE</p>
            <button
              className="rounded px-4 py-2 text-sm font-bold text-white"
              style={{ background: "var(--accent-blue)" }}
              onClick={() => onSelectMode("2p")}
            >
              2 Players
            </button>
            <button
              className="rounded px-4 py-2 text-sm font-bold text-[#4f46e5]"
              style={{ background: "var(--bg-card)" }}
              onClick={() => onSelectMode("3p")}
            >
              3 Players
            </button>
          </div>
        )}

        {!session.is_host && !roomState.mode && (
          <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
            Waiting for the host to pick a mode...
          </p>
        )}

        {roomState.mode && requiredCount !== null && joinedCount < requiredCount && (
          <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
            Waiting for {requiredCount - joinedCount} more player{requiredCount - joinedCount === 1 ? "" : "s"}...
          </p>
        )}

        {error && (
          <p className="mb-3 text-center text-xs" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        <button
          className="w-full rounded px-5 py-3 text-sm font-bold text-[var(--text-muted)]"
          style={{ background: "var(--bg-card)" }}
          onClick={onLeaveRoom}
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
