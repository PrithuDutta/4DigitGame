"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminLogin,
  adminScores,
  backToModeSelect,
  createRoom,
  getSocket,
  joinRoom,
  leaveRoom,
  loadStoredSession,
  onError,
  onRoomState,
  onSession,
  press,
  rejoinRoom,
  saveStoredSession,
  scoreReady,
  selectMode,
  timeout as emitTimeout,
} from "@/lib/socket";
import type { GameStateDTO } from "@/lib/api";
import type { Mode, RoomStateDTO, SessionDTO } from "@/lib/types";
import LobbyScreen from "./LobbyScreen";
import RoundScreen from "./RoundScreen";
import ScoreScreen from "./ScoreScreen";
import AdminDialog from "./AdminDialog";
import PressButton from "./PressButton";

const SLOT_TO_KEY = { p1: "enter", p2: "shift", p3: "mouse" } as const;

interface Props {
  onBackToLanding: () => void;
}

export default function OnlineGameApp({ onBackToLanding }: Props) {
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [roomState, setRoomState] = useState<RoomStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const roomStateRef = useRef<RoomStateDTO | null>(null);
  const adminOpenRef = useRef(false);
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);
  useEffect(() => {
    adminOpenRef.current = adminOpen;
  }, [adminOpen]);

  // Connect + subscribe once on mount; attempt a stored-token rejoin so a
  // page refresh mid-game reclaims the same seat instead of dropping it.
  useEffect(() => {
    const socket = getSocket();

    const offSession = onSession((s) => {
      setError(null);
      setSession(s);
      saveStoredSession({ room_code: s.room_code, player_id: s.player_id });
    });
    const offRoomState = onRoomState((s) => setRoomState(s));
    const offErr = onError((e) => {
      setError(e.message);
      if (e.code === "room_not_found" || e.code === "player_not_found") {
        saveStoredSession(null);
        setSession(null);
        setRoomState(null);
      }
    });

    const tryRejoin = () => {
      const stored = loadStoredSession();
      if (stored) rejoinRoom(stored.room_code, stored.player_id);
    };

    if (socket.connected) tryRejoin();
    socket.on("connect", tryRejoin);

    return () => {
      offSession();
      offRoomState();
      offErr();
      socket.off("connect", tryRejoin);
    };
  }, []);

  // Drive the round countdown and fire `timeout` once it elapses — the
  // server runs no clock of its own, mirroring the local/REST GameApp.
  // remainingSeconds is only ever set from inside the interval callback
  // (never synchronously in the effect body) — RoundScreen unmounts outside
  // the round phase, so a stale value between rounds is never displayed.
  useEffect(() => {
    if (
      !roomState ||
      roomState.phase !== "round" ||
      !roomState.round.started ||
      roomState.round.deadline_ts === null
    ) {
      return;
    }
    const deadline = roomState.round.deadline_ts;
    const id = setInterval(() => {
      const remaining = deadline - Date.now() / 1000;
      if (remaining <= 0) {
        emitTimeout();
      } else {
        setRemainingSeconds(Math.ceil(remaining));
      }
    }, 200);
    return () => clearInterval(id);
  }, [roomState?.phase, roomState?.round.started, roomState?.round.deadline_ts]);

  // Enter/Space press the online "my own solve action" shortcut — no
  // ENTER/SHIFT/mouse slot routing needed, identity comes from the socket.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (adminOpenRef.current) return;
      const s = roomStateRef.current;
      if (!s) return;
      if (e.key !== "Enter" && e.code !== "Space") return;

      if (s.phase === "score") scoreReady();
      else if (s.phase === "round") press();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleCreateRoom = useCallback((name: string) => createRoom(name), []);
  const handleJoinRoom = useCallback((roomCode: string, name: string) => joinRoom(roomCode, name), []);
  const handleSelectMode = useCallback((mode: Mode) => selectMode(mode), []);
  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    saveStoredSession(null);
    setSession(null);
    setRoomState(null);
  }, []);

  const onlineLogin = useCallback((password: string) => {
    return new Promise<{ ok: boolean }>((resolve) => {
      const socket = getSocket();
      const handler = (result: { ok: boolean }) => {
        socket.off("admin_login_result", handler);
        resolve(result);
      };
      socket.on("admin_login_result", handler);
      adminLogin(password);
    });
  }, []);

  const onlineSubmitScores = useCallback((p1: number, p2: number, p3: number) => {
    return new Promise<GameStateDTO>((resolve) => {
      const off = onRoomState((state) => {
        off();
        resolve(state);
      });
      adminScores(p1, p2, p3);
    });
  }, []);

  if (!roomState) {
    return (
      <LobbyScreen
        session={session}
        roomState={roomState}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onSelectMode={handleSelectMode}
        onLeaveRoom={handleLeaveRoom}
        onBackToLanding={onBackToLanding}
      />
    );
  }

  const myKey = session ? SLOT_TO_KEY[session.slot] : null;
  const alreadyPressed = myKey !== null && roomState.round.clicks[myKey];
  const alreadyReady = myKey !== null && roomState.ready[myKey];

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {(roomState.phase === "mode_select" || roomState.phase === "name_entry") && (
        <LobbyScreen
          session={session}
          roomState={roomState}
          error={error}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSelectMode={handleSelectMode}
          onLeaveRoom={handleLeaveRoom}
          onBackToLanding={onBackToLanding}
        />
      )}

      {roomState.phase === "round" && (
        <RoundScreen
          state={roomState}
          remainingSeconds={remainingSeconds}
          onExit={handleLeaveRoom}
          actionSlot={<PressButton label="PRESS!" onPress={press} disabled={alreadyPressed} />}
        />
      )}

      {roomState.phase === "score" && (
        <ScoreScreen
          state={roomState}
          onOpenAdmin={() => setAdminOpen(true)}
          onChangeMode={() => backToModeSelect()}
          actionSlot={<PressButton label="READY" onPress={scoreReady} disabled={alreadyReady} />}
        />
      )}

      {adminOpen && (
        <AdminDialog
          state={roomState}
          onClose={() => setAdminOpen(false)}
          onScoresUpdated={(next) => setRoomState(next as RoomStateDTO)}
          onLogin={onlineLogin}
          onSubmitScores={onlineSubmitScores}
        />
      )}
    </div>
  );
}
