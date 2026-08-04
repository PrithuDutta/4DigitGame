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
  rejoinRoom,
  saveStoredSession,
  scoreReady,
  selectMode,
  startGame,
  tileCommit,
  tileUnary,
  tileUndo,
  timeout as emitTimeout,
} from "@/lib/socket";
import type { GameStateDTO } from "@/lib/api";
import type { BinaryOpKind, UnaryOpKind } from "@/lib/sandboxMath";
import type { Mode, RoomStateDTO, SessionDTO } from "@/lib/types";
import LobbyScreen from "./LobbyScreen";
import MultiplayerRoundScreen from "./MultiplayerRoundScreen";
import ScoreScreen from "./ScoreScreen";
import Podium from "./Podium";
import AdminDialog from "./AdminDialog";
import PressButton from "./PressButton";
import CountdownScreen from "./CountdownScreen";

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

  // Drive the countdown timer for both countdown and round phases
  useEffect(() => {
    if (!roomState) return;

    const deadline =
      roomState.phase === "countdown"
        ? roomState.round?.deadline_ts
        : roomState.phase === "round" && roomState.round?.started
        ? roomState.round?.deadline_ts
        : null;

    if (!deadline) return;

    const id = setInterval(() => {
      const remaining = deadline - Date.now() / 1000;
      if (remaining <= 0) {
        emitTimeout();
      } else {
        setRemainingSeconds(Math.ceil(remaining));
      }
    }, 200);
    return () => clearInterval(id);
  }, [roomState?.phase, roomState?.round?.started, roomState?.round?.deadline_ts]);

  // Enter/Space is the score-screen "ready up" shortcut. The round phase's
  // keyboard handling (digit taps, operator keys, undo) lives entirely
  // inside Sandbox's own listener now — solving isn't a single keypress.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (adminOpenRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const s = roomStateRef.current;
      if (!s || s.phase !== "score") return;

      const isEnterOrSpace =
        e.key === "Enter" || e.key === " " || e.code === "Space" || e.code === "Enter";
      if (!isEnterOrSpace) return;

      e.preventDefault();
      scoreReady();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleCreateRoom = useCallback((name: string) => createRoom(name), []);
  const handleJoinRoom = useCallback((roomCode: string, name: string) => joinRoom(roomCode, name), []);
  const handleSelectMode = useCallback((mode: Mode) => selectMode(mode), []);
  const handleStartGame = useCallback(() => startGame(), []);
  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    saveStoredSession(null);
    setSession(null);
    setRoomState(null);
  }, []);

  // Clear any stale tile-op error the moment the player tries something new
  // — the server's next response (success or a fresh error) supersedes it.
  const handleTileCommit = useCallback((leftId: number, rightId: number, op: BinaryOpKind) => {
    setError(null);
    tileCommit(leftId, rightId, op);
  }, []);
  const handleTileUnary = useCallback((tileId: number, op: UnaryOpKind) => {
    setError(null);
    tileUnary(tileId, op);
  }, []);
  const handleTileUndo = useCallback(() => {
    setError(null);
    tileUndo();
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
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
        onBackToLanding={onBackToLanding}
      />
    );
  }

  const myPlayer = session ? roomState.players.find((p) => p.player_id === session.player_id || p.slot === session.slot) : null;
  const alreadyReady = myPlayer?.ready ?? (session ? Boolean(roomState.ready[session.player_id]) : false);

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
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onBackToLanding={onBackToLanding}
        />
      )}

      {roomState.phase === "countdown" && (
        <CountdownScreen remainingSeconds={remainingSeconds} players={roomState.players} />
      )}

      {roomState.phase === "round" && (
        <MultiplayerRoundScreen
          state={roomState}
          me={myPlayer}
          remainingSeconds={remainingSeconds}
          onExit={handleLeaveRoom}
          onCommit={handleTileCommit}
          onUnary={handleTileUnary}
          onUndo={handleTileUndo}
          tileError={error}
        />
      )}

      {roomState.phase === "score" && (
        <ScoreScreen
          state={roomState}
          onOpenAdmin={() => setAdminOpen(true)}
          onChangeMode={() => backToModeSelect()}
          onExit={handleLeaveRoom}
          actionSlot={<PressButton label="READY" onPress={scoreReady} disabled={alreadyReady} />}
        />
      )}

      {roomState.phase === "podium" && (
        <Podium state={roomState} onPlayAgain={() => backToModeSelect()} onExit={handleLeaveRoom} />
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
