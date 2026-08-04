"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSandboxPuzzle } from "@/lib/api";
import type { BinaryOpKind, UnaryOpKind } from "@/lib/sandboxMath";
import {
  applyBinary,
  applyUnary,
  binarySymbol,
  formatBinaryLabel,
  formatUnaryLabel,
  formatValue,
  isWithinTolerance,
} from "@/lib/sandboxMath";

const DEFAULT_TARGET = 10;
const BINARY_OPS: BinaryOpKind[] = ["+", "-", "*", "/", "^", "root"];
const UNARY_OPS: UnaryOpKind[] = ["sqrt", "!"];
const BUFFER_TIMEOUT_MS = 800;

export interface Tile {
  id: number;
  value: number;
}

export interface BinaryHistoryEntry {
  type: "binary";
  operands: [Tile, Tile];
  result: Tile;
  label: string;
}

export interface UnaryHistoryEntry {
  type: "unary";
  operand: Tile;
  result: Tile;
  label: string;
}

export type HistoryEntry = BinaryHistoryEntry | UnaryHistoryEntry;

// When present, tiles/history/target are server-authoritative (props, not
// local state) and every action is an emit — nothing is computed locally.
// The server independently recomputes and validates every operation, so a
// modified client can't fabricate a solve.
export interface MultiplayerTileProps {
  tiles: Tile[];
  target: number;
  history: HistoryEntry[];
  solved: boolean;
  error: string | null;
  onCommit: (leftId: number, rightId: number, op: BinaryOpKind) => void;
  onUnary: (tileId: number, op: UnaryOpKind) => void;
  onUndo: () => void;
}

interface Props {
  onExit?: () => void;
  multiplayer?: MultiplayerTileProps;
}

export default function Sandbox({ onExit, multiplayer }: Props) {
  const isMultiplayer = !!multiplayer;

  const [localTiles, setLocalTiles] = useState<Tile[]>([]);
  const [localHistory, setLocalHistory] = useState<HistoryEntry[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [initialTiles, setInitialTiles] = useState<Tile[] | null>(null);

  const [selectedTileIds, setSelectedTileIds] = useState<number[]>([]);
  const [activeOp, setActiveOp] = useState<BinaryOpKind | null>(null);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [loading, setLoading] = useState(!isMultiplayer);
  const [loadError, setLoadError] = useState<string | null>(null);

  const nextIdRef = useRef(0);
  const typedBufferRef = useRef("");
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tiles = isMultiplayer ? multiplayer.tiles : localTiles;
  const history = isMultiplayer ? multiplayer.history : localHistory;
  const target = isMultiplayer ? multiplayer.target : DEFAULT_TARGET;
  const error = isMultiplayer ? multiplayer.error : localError;
  const locked = isMultiplayer && multiplayer.solved; // server has this player locked out
  const isWon = isMultiplayer
    ? multiplayer.solved
    : tiles.length === 1 && isWithinTolerance(tiles[0].value, target);

  const setError = useCallback(
    (msg: string | null) => {
      // In multiplayer, errors come from the server via multiplayer.error —
      // there's nothing to set locally, the prop just flows through.
      if (!isMultiplayer) setLocalError(msg);
    },
    [isMultiplayer]
  );

  const clearTypedBuffer = useCallback(() => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    typedBufferRef.current = "";
    setTypedBuffer("");
  }, []);

  // Only ever mutates state inside a promise callback, never synchronously,
  // so this is safe to call from an effect body (unlike setLoading/setLoadError,
  // which are fine from event handlers but not from a mount effect).
  const fetchPuzzleData = useCallback(
    () =>
      getSandboxPuzzle()
        .then((data) => {
          const fresh = data.digits.map((d, i) => ({ id: i, value: d }));
          nextIdRef.current = fresh.length;
          setInitialTiles(fresh);
          setLocalTiles(fresh);
          setLocalHistory([]);
          setSelectedTileIds([]);
          setActiveOp(null);
          setLocalError(null);
        })
        .catch(() => setLoadError("Could not load a puzzle. Try again."))
        .finally(() => setLoading(false)),
    []
  );

  const fetchPuzzle = useCallback(() => {
    if (isMultiplayer) return;
    setLoading(true);
    setLoadError(null);
    clearTypedBuffer();
    fetchPuzzleData();
  }, [isMultiplayer, clearTypedBuffer, fetchPuzzleData]);

  useEffect(() => {
    if (!isMultiplayer) fetchPuzzleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prune (not wipe) the local selection whenever the server hands back a
  // fresh tiles prop — every room_state broadcast reaches every player, so
  // this fires on other players' actions too, not just our own. Only drop
  // ids that the server confirms are actually gone (a commit consumed them),
  // so an in-progress selection survives an unrelated opponent update.
  useEffect(() => {
    if (!isMultiplayer) return;
    const pruneStaleSelection = () => {
      setSelectedTileIds((ids) => ids.filter((id) => tiles.some((t) => t.id === id)));
    };
    pruneStaleSelection();
  }, [tiles, isMultiplayer]);

  useEffect(() => {
    const clearArmedOpIfNothingSelected = () => {
      if (isMultiplayer && selectedTileIds.length === 0) setActiveOp(null);
    };
    clearArmedOpIfNothingSelected();
  }, [selectedTileIds, isMultiplayer]);

  const commitBinary = useCallback(
    (leftTile: Tile, rightTile: Tile, op: BinaryOpKind, currentTiles: Tile[]) => {
      clearTypedBuffer();

      if (isMultiplayer) {
        multiplayer.onCommit(leftTile.id, rightTile.id, op);
        setSelectedTileIds([]);
        setActiveOp(null);
        return;
      }

      const outcome = applyBinary(op, leftTile.value, rightTile.value);
      if (!outcome.ok) {
        setLocalError(outcome.error);
        setSelectedTileIds([]);
        setActiveOp(null);
        return;
      }

      const result: Tile = { id: nextIdRef.current++, value: outcome.value };
      const label = formatBinaryLabel(op, leftTile.value, rightTile.value, outcome.value);

      const leftIndex = currentTiles.findIndex((t) => t.id === leftTile.id);
      const before = currentTiles.slice(0, leftIndex).filter((t) => t.id !== rightTile.id).length;
      const withoutOperands = currentTiles.filter((t) => t.id !== leftTile.id && t.id !== rightTile.id);
      const insertAt = Math.min(before, withoutOperands.length);

      const nextTiles = [
        ...withoutOperands.slice(0, insertAt),
        result,
        ...withoutOperands.slice(insertAt),
      ];

      setLocalTiles(nextTiles);
      setLocalHistory((h) => [...h, { type: "binary", operands: [leftTile, rightTile], result, label }]);
      setSelectedTileIds([]);
      setActiveOp(null);
      setLocalError(null);
    },
    [isMultiplayer, multiplayer, clearTypedBuffer]
  );

  const handleTileTap = useCallback(
    (tile: Tile) => {
      if (locked) return;
      setError(null);

      if (selectedTileIds.includes(tile.id)) {
        setSelectedTileIds((ids) => ids.filter((id) => id !== tile.id));
        return;
      }

      const nextSelectedIds = [...selectedTileIds, tile.id];

      if (nextSelectedIds.length === 2 && activeOp) {
        const left = tiles.find((t) => t.id === nextSelectedIds[0]);
        const right = tiles.find((t) => t.id === nextSelectedIds[1]);
        if (left && right) {
          commitBinary(left, right, activeOp, tiles);
          return;
        }
      }

      if (nextSelectedIds.length > 2) {
        setSelectedTileIds([tile.id]);
      } else {
        setSelectedTileIds(nextSelectedIds);
      }
    },
    [locked, selectedTileIds, activeOp, tiles, commitBinary, setError]
  );

  const flushPendingBuffer = useCallback(() => {
    if (typedBufferRef.current) {
      const currentBuf = typedBufferRef.current;
      clearTypedBuffer();
      const match = tiles.find(
        (t) => !selectedTileIds.includes(t.id) && formatValue(t.value) === currentBuf
      );
      if (match) {
        handleTileTap(match);
      }
    }
  }, [tiles, selectedTileIds, handleTileTap, clearTypedBuffer]);

  const handleBinaryOpTap = useCallback(
    (kind: BinaryOpKind) => {
      if (locked) return;
      flushPendingBuffer();
      setError(null);

      if (activeOp === kind && selectedTileIds.length < 2) {
        setActiveOp(null);
        return;
      }

      if (selectedTileIds.length === 2) {
        const left = tiles.find((t) => t.id === selectedTileIds[0]);
        const right = tiles.find((t) => t.id === selectedTileIds[1]);
        if (left && right) {
          commitBinary(left, right, kind, tiles);
          return;
        }
      }

      setActiveOp(kind);
    },
    [locked, activeOp, selectedTileIds, tiles, commitBinary, flushPendingBuffer, setError]
  );

  const handleUnaryOpTap = useCallback(
    (kind: UnaryOpKind) => {
      if (locked) return;
      flushPendingBuffer();
      setError(null);

      const targetId = selectedTileIds.length > 0 ? selectedTileIds[selectedTileIds.length - 1] : null;
      if (targetId === null) {
        setError("Tap or type a digit tile first to apply " + (kind === "!" ? "factorial (x!)" : "square root (√x)"));
        return;
      }

      const tile = tiles.find((t) => t.id === targetId);
      if (!tile) return;

      if (isMultiplayer) {
        multiplayer.onUnary(tile.id, kind);
        setSelectedTileIds([]);
        setActiveOp(null);
        return;
      }

      const outcome = applyUnary(kind, tile.value);
      if (!outcome.ok) {
        setLocalError(outcome.error);
        return;
      }

      const result: Tile = { id: nextIdRef.current++, value: outcome.value };
      const label = formatUnaryLabel(kind, tile.value, outcome.value);

      setLocalTiles((ts) => ts.map((t) => (t.id === tile.id ? result : t)));
      setLocalHistory((h) => [...h, { type: "unary", operand: tile, result, label }]);
      setSelectedTileIds([]);
      setActiveOp(null);
      setLocalError(null);
    },
    [locked, selectedTileIds, tiles, flushPendingBuffer, isMultiplayer, multiplayer, setError]
  );

  const handleUndo = useCallback(() => {
    if (locked) return;
    clearTypedBuffer();
    setSelectedTileIds([]);
    setActiveOp(null);

    if (isMultiplayer) {
      multiplayer.onUndo();
      return;
    }

    if (localHistory.length === 0) return;
    setLocalError(null);
    const last = localHistory[localHistory.length - 1];
    const idx = localTiles.findIndex((t) => t.id === last.result.id);
    if (idx === -1) return;
    const withoutResult = localTiles.filter((t) => t.id !== last.result.id);
    const restored = last.type === "unary" ? [last.operand] : last.operands;

    setLocalTiles([...withoutResult.slice(0, idx), ...restored, ...withoutResult.slice(idx)]);
    setLocalHistory((h) => h.slice(0, -1));
  }, [locked, isMultiplayer, multiplayer, localHistory, localTiles, clearTypedBuffer]);

  const handleReset = useCallback(() => {
    if (isMultiplayer) return; // no resets mid-race
    clearTypedBuffer();
    if (!initialTiles) return;
    setLocalError(null);
    setLocalTiles(initialTiles);
    setLocalHistory([]);
    setActiveOp(null);
    setSelectedTileIds([]);
  }, [isMultiplayer, initialTiles, clearTypedBuffer]);

  const handleBackspace = useCallback(() => {
    if (locked) return;
    setError(null);
    if (typedBufferRef.current) {
      clearTypedBuffer();
    } else if (selectedTileIds.length > 0) {
      setSelectedTileIds((ids) => ids.slice(0, -1));
    } else if (activeOp !== null) {
      setActiveOp(null);
    }
  }, [locked, selectedTileIds, activeOp, clearTypedBuffer, setError]);

  const matchTypedDigit = useCallback(
    (digitChar: string) => {
      if (locked) return;
      setError(null);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);

      const newBuffer = typedBufferRef.current + digitChar;
      typedBufferRef.current = newBuffer;
      setTypedBuffer(newBuffer);

      const unselectedTiles = tiles.filter((t) => !selectedTileIds.includes(t.id));

      const exactMatch = unselectedTiles.find((t) => formatValue(t.value) === newBuffer);
      const isPrefixOfOther = unselectedTiles.some(
        (t) => formatValue(t.value).startsWith(newBuffer) && formatValue(t.value) !== newBuffer
      );

      if (exactMatch && !isPrefixOfOther) {
        handleTileTap(exactMatch);
        clearTypedBuffer();
      } else if (isPrefixOfOther) {
        bufferTimerRef.current = setTimeout(() => {
          const pendingMatch = unselectedTiles.find(
            (t) => formatValue(t.value) === typedBufferRef.current
          );
          if (pendingMatch) {
            handleTileTap(pendingMatch);
          }
          clearTypedBuffer();
        }, BUFFER_TIMEOUT_MS);
      } else if (exactMatch) {
        handleTileTap(exactMatch);
        clearTypedBuffer();
      } else {
        bufferTimerRef.current = setTimeout(() => {
          clearTypedBuffer();
        }, BUFFER_TIMEOUT_MS);
      }
    },
    [locked, tiles, selectedTileIds, handleTileTap, clearTypedBuffer, setError]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (/^[0-9]$/.test(e.key) || e.key === "." || e.key === ",") {
        matchTypedDigit(e.key === "," ? "." : e.key);
      } else if (e.key === "+" || e.key === "Add") {
        handleBinaryOpTap("+");
      } else if (e.key === "-" || e.key === "Subtract") {
        handleBinaryOpTap("-");
      } else if (e.key === "*" || e.key === "Multiply" || e.key === "x" || e.key === "X") {
        handleBinaryOpTap("*");
      } else if (e.key === "/" || e.key === "Divide") {
        handleBinaryOpTap("/");
      } else if (e.key === "^") {
        handleBinaryOpTap("^");
      } else if (e.key === "!") {
        handleUnaryOpTap("!");
      } else if (e.key === "s" || e.key === "S") {
        handleUnaryOpTap("sqrt");
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "z" || e.key === "Z") {
        handleUndo();
      } else if (!isMultiplayer && (e.key === "Escape" || e.key === "r" || e.key === "R")) {
        handleReset();
      } else if (!isMultiplayer && (e.key === "n" || e.key === "N")) {
        fetchPuzzle();
      } else if (e.key === " " || e.key === "Enter") {
        flushPendingBuffer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    matchTypedDigit,
    handleBinaryOpTap,
    handleUnaryOpTap,
    handleBackspace,
    handleUndo,
    handleReset,
    fetchPuzzle,
    flushPendingBuffer,
    isMultiplayer,
  ]);

  const renderFormulaPreview = () => {
    const firstTile = tiles.find((t) => t.id === selectedTileIds[0]);
    const secondTile = tiles.find((t) => t.id === selectedTileIds[1]);

    if (!firstTile && !activeOp) {
      return (
        <span className="text-slate-500 italic text-xs">
          Tap or type numbers &amp; operators to solve for {target}
        </span>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2 font-mono text-sm font-bold text-white">
        {firstTile ? (
          <span className="rounded bg-indigo-500/20 px-2 py-0.5 border border-indigo-500/40 text-indigo-300">
            {formatValue(firstTile.value)}
          </span>
        ) : (
          <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700 text-slate-500">?</span>
        )}

        <span className="text-cyan-400 font-bold">
          {activeOp === "root" ? "√" : activeOp ? binarySymbol(activeOp) : "?"}
        </span>

        {secondTile ? (
          <span className="rounded bg-indigo-500/20 px-2 py-0.5 border border-indigo-500/40 text-indigo-300">
            {formatValue(secondTile.value)}
          </span>
        ) : (
          <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700 text-slate-500">?</span>
        )}
      </div>
    );
  };

  if (!isMultiplayer && loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Loading puzzle...
      </div>
    );
  }

  if (!isMultiplayer && loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-rose-400">{loadError}</p>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white" onClick={fetchPuzzle}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center p-4 max-w-lg mx-auto w-full">
      {!isMultiplayer && (
        <div className="flex w-full items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            ← Exit
          </button>

          <p className="text-sm font-bold text-white">SOLO SANDBOX</p>

          <div className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            TARGET: {target}
          </div>
        </div>
      )}

      {isWon && (
        <div className="w-full mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="font-mono text-sm font-bold text-emerald-300">
            🎉 Solved! {tiles.length === 1 ? formatValue(tiles[0].value) : formatValue(target)} = {target}
          </p>
          {isMultiplayer && (
            <p className="mt-1 text-xs text-emerald-200/80">Waiting for the other players to finish...</p>
          )}
        </div>
      )}

      {!locked && (
        <div className="w-full rounded-xl border border-[#202738] bg-[#131722] py-2.5 px-4 mb-3 text-center min-h-[42px] flex items-center justify-between">
          <div className="flex-1 flex justify-center">{renderFormulaPreview()}</div>
          {typedBuffer && (
            <span className="font-mono text-[10px] font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 animate-pulse">
              Typed: &quot;{typedBuffer}&quot;
            </span>
          )}
        </div>
      )}

      {!locked && (
        <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-4 mb-3 text-center">
          <p className="mb-2.5 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            TAP OR TYPE DIGIT TILES
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {tiles.map((tile) => {
              const selectedIdx = selectedTileIds.indexOf(tile.id);
              const isSelected = selectedIdx !== -1;

              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileTap(tile)}
                  className={`relative flex h-14 w-14 items-center justify-center rounded-xl font-mono text-lg font-bold border transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : "border-slate-700 bg-slate-900 text-white hover:border-slate-500"
                  }`}
                >
                  {formatValue(tile.value)}
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 font-mono text-[10px] font-bold text-slate-950">
                      {selectedIdx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!locked && (
        <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-3.5 mb-3 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {BINARY_OPS.map((kind) => {
              const isActive = activeOp === kind;
              return (
                <button
                  key={kind}
                  onClick={() => handleBinaryOpTap(kind)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold border transition-all active:scale-95 ${
                    isActive
                      ? "border-indigo-400 bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {kind === "root" ? "ⁿ√" : binarySymbol(kind)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-center gap-2 border-t border-[#202738] pt-3">
            {UNARY_OPS.map((kind) => (
              <button
                key={kind}
                onClick={() => handleUnaryOpTap(kind)}
                className="flex h-9 px-3.5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 font-mono text-xs font-bold text-slate-300 hover:text-purple-300 hover:border-purple-500/40 transition-colors"
              >
                {kind === "!" ? "x! (!)" : "√x (S)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="w-full mb-3 rounded-lg border border-rose-500/30 bg-rose-950/40 p-2 text-center text-xs font-semibold text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {!locked && (
        <div className="flex gap-2 mb-3 w-full max-w-sm justify-center">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex-1 rounded-lg border border-[#202738] bg-[#131722] py-2 font-mono text-xs font-bold text-slate-400 disabled:opacity-30 hover:text-white"
          >
            ↺ Undo (Z)
          </button>
          {!isMultiplayer && (
            <>
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg border border-[#202738] bg-[#131722] py-2 font-mono text-xs font-bold text-slate-400 hover:text-white"
              >
                ⟲ Reset (R)
              </button>
              <button
                onClick={fetchPuzzle}
                className="flex-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-2 font-mono text-xs font-bold text-indigo-300 hover:bg-indigo-500/20"
              >
                ✨ New (N)
              </button>
            </>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="w-full max-w-sm rounded-xl border border-[#202738] bg-[#131722] p-3">
          <p className="mb-1 text-center font-mono text-[10px] font-bold text-slate-500 uppercase">
            CALCULATION HISTORY LOG
          </p>
          <div className="max-h-28 overflow-y-auto font-mono text-xs text-slate-300">
            {history
              .slice()
              .reverse()
              .map((h, i) => (
                <div key={history.length - i} className="py-0.5 text-center">
                  {h.label}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
