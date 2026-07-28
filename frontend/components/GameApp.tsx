"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameStateDTO } from "@/lib/api";
import {
  getState,
  postBackToModeSelect,
  postMode,
  postNames,
  postNewNumber,
  postPress,
  postScoreReady,
  postTimeout,
} from "@/lib/api";
import ModeScreen from "./ModeScreen";
import NameScreen from "./NameScreen";
import RoundScreen from "./RoundScreen";
import ScoreScreen from "./ScoreScreen";
import AdminDialog from "./AdminDialog";

export default function GameApp() {
  const [state, setState] = useState<GameStateDTO | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [, forceTick] = useState(0);

  const seqRef = useRef(0);
  const stateRef = useRef<GameStateDTO | null>(null);
  const adminOpenRef = useRef(false);
  stateRef.current = state;
  adminOpenRef.current = adminOpen;

  useEffect(() => {
    getState()
      .then(setState)
      .catch(() => {});
  }, []);

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
    if (!state || state.phase !== "round" || !state.round.started || state.round.deadline_ts === null) {
      return;
    }
    const deadline = state.round.deadline_ts;
    const id = setInterval(() => {
      if (deadline - Date.now() / 1000 <= 0) {
        applyAction(() => postTimeout());
      } else {
        forceTick((t) => t + 1);
      }
    }, 200);
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

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  const remainingSeconds =
    state.phase === "round" && state.round.started && state.round.deadline_ts !== null
      ? Math.max(0, Math.ceil(state.round.deadline_ts - Date.now() / 1000))
      : null;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {state.phase === "mode_select" && (
        <ModeScreen onSelect={(mode) => applyAction(() => postMode(mode))} />
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
        />
      )}

      {state.phase === "round" && <RoundScreen state={state} remainingSeconds={remainingSeconds} />}

      {state.phase === "score" && (
        <ScoreScreen
          state={state}
          onOpenAdmin={() => setAdminOpen(true)}
          onChangeMode={() => applyAction(() => postBackToModeSelect())}
        />
      )}

      {adminOpen && (
        <AdminDialog state={state} onClose={() => setAdminOpen(false)} onScoresUpdated={setState} />
      )}
    </div>
  );
}
