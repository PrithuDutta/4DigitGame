"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameStateDTO } from "@/lib/api";
import {
  getState,
  postBackToModeSelect,
  postDifficulty,
  postMode,
  postNames,
  postNewNumber,
  postPress,
  postScoreReady,
  postTimeout,
} from "@/lib/api";
import DifficultyScreen from "./DifficultyScreen";
import ModeScreen from "./ModeScreen";
import NameScreen from "./NameScreen";
import RoundScreen from "./RoundScreen";
import ScoreScreen from "./ScoreScreen";
import Podium from "./Podium";
import Sandbox from "./Sandbox";
import AdminDialog from "./AdminDialog";

interface Props {
  onBackToLanding: () => void;
}

export default function GameApp({ onBackToLanding }: Props) {
  const [state, setState] = useState<GameStateDTO | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  // Sandbox is single-player, frontend-only, and orthogonal to the backend's
  // multiplayer phase machine — it's a separate local view, not a phase.
  const [showSandbox, setShowSandbox] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const seqRef = useRef(0);
  const stateRef = useRef<GameStateDTO | null>(null);
  const adminOpenRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    adminOpenRef.current = adminOpen;
  }, [state, adminOpen]);

  const fetchState = useCallback(() => {
    return getState()
      .then((s) => {
        setState(s);
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || "Cannot connect to backend server at http://127.0.0.1:5000.");
      });
  }, []);

  useEffect(() => {
    fetchState();
    const timer = setInterval(() => {
      if (!stateRef.current) {
        fetchState();
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [fetchState]);

  const applyAction = useCallback((action: () => Promise<GameStateDTO>) => {
    const seq = ++seqRef.current;
    action()
      .then((next) => {
        if (seq === seqRef.current) setState(next);
      })
      .catch(() => {});
  }, []);

  // Drive the round countdown and fire the timeout once it elapses.
  useEffect(() => {
    // No explicit reset when not in an active round: RoundScreen only ever
    // displays remainingSeconds while state.round.started is true, so a
    // stale value from a previous round is simply never shown.
    if (!state || state.phase !== "round" || !state.round.started || state.round.deadline_ts === null) {
      return;
    }
    const deadline = state.round.deadline_ts;

    const tick = () => {
      const remaining = deadline - Date.now() / 1000;
      if (remaining <= 0) {
        applyAction(() => postTimeout());
      } else {
        setRemainingSeconds(Math.ceil(remaining));
      }
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [state?.phase, state?.round.started, state?.round.deadline_ts, applyAction]);

  // Global ENTER / SHIFT / SPACE / mouse-click bindings, mirroring the desktop app.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (adminOpenRef.current) return;
      const s = stateRef.current;
      if (!s) return;

      if (e.code === "Space") {
        const anyPressed = s.round.clicks.enter || s.round.clicks.shift || s.round.clicks.mouse;
        if (s.phase === "round" && !anyPressed) applyAction(() => postNewNumber());
        return;
      }

      if (e.key === "Enter") {
        if (s.phase === "score") applyAction(() => postScoreReady("enter"));
        else if (s.phase === "round") applyAction(() => postPress("enter"));
        return;
      }

      if (e.key === "Shift") {
        if (s.phase === "score") applyAction(() => postScoreReady("shift"));
        else if (s.phase === "round") applyAction(() => postPress("shift"));
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (adminOpenRef.current) return;
      const s = stateRef.current;
      if (!s || s.mode !== "3p") return;
      if ((e.target as HTMLElement)?.closest("button")) return;

      if (s.phase === "score") applyAction(() => postScoreReady("mouse"));
      else if (s.phase === "round") applyAction(() => postPress("mouse"));
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleClick);
    };
  }, [applyAction]);

  if (showSandbox) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <Sandbox onExit={() => setShowSandbox(false)} />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-[var(--text-muted)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-blue)] border-t-transparent"></div>
        <p className="text-base font-semibold text-[var(--text-main)]">Connecting to Game Server...</p>
        {fetchError && (
          <p className="max-w-md text-xs text-[var(--color-error)] font-mono bg-red-950/40 p-3 rounded-lg border border-red-800/50">
            {fetchError}
          </p>
        )}
        <button
          onClick={fetchState}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-blue-hover)]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {state.phase === "difficulty_select" && (
        <DifficultyScreen
          onSelect={(diff) => applyAction(() => postDifficulty(diff))}
          onExit={onBackToLanding}
        />
      )}

      {state.phase === "mode_select" && (
        <ModeScreen
          onSelect={(mode) => applyAction(() => postMode(mode))}
          onSandbox={() => setShowSandbox(true)}
          onExit={onBackToLanding}
        />
      )}

      {state.phase === "name_entry" && (
        <NameScreen
          mode={state.mode}
          initialP1={state.p1_name}
          initialP2={state.p2_name}
          initialP3={state.p3_name}
          error={nameError}
          onSubmit={(p1, p2, p3) => {
            setNameError(null);
            postNames(p1, p2, p3)
              .then(setState)
              .catch((e: Error) => setNameError(e.message));
          }}
          onExit={() => {
            setNameError(null);
            applyAction(() => postBackToModeSelect());
          }}
        />
      )}

      {state.phase === "round" && (
        <RoundScreen
          state={state}
          remainingSeconds={remainingSeconds}
          onExit={() => applyAction(() => postBackToModeSelect())}
        />
      )}

      {state.phase === "score" && (
        <ScoreScreen
          state={state}
          onOpenAdmin={() => setAdminOpen(true)}
          onChangeMode={() => applyAction(() => postBackToModeSelect())}
        />
      )}

      {state.phase === "podium" && (
        <Podium state={state} onPlayAgain={() => applyAction(() => postBackToModeSelect())} />
      )}

      {adminOpen && (
        <AdminDialog state={state} onClose={() => setAdminOpen(false)} onScoresUpdated={setState} />
      )}
    </div>
  );
}
