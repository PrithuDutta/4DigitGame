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

const TARGET = 10;
const BINARY_OPS: BinaryOpKind[] = ["+", "-", "*", "/", "^", "root"];
const UNARY_OPS: UnaryOpKind[] = ["sqrt", "!"];
const BUFFER_TIMEOUT_MS = 800;

interface Tile {
  id: number;
  value: number;
}

interface BinaryHistoryEntry {
  type: "binary";
  operands: [Tile, Tile];
  result: Tile;
  label: string;
}

interface UnaryHistoryEntry {
  type: "unary";
  operand: Tile;
  result: Tile;
  label: string;
}

type HistoryEntry = BinaryHistoryEntry | UnaryHistoryEntry;

interface Props {
  onExit: () => void;
}

export default function Sandbox({ onExit }: Props) {
  const [initialTiles, setInitialTiles] = useState<Tile[] | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedTileIds, setSelectedTileIds] = useState<number[]>([]);
  const [activeOp, setActiveOp] = useState<BinaryOpKind | null>(null);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const nextIdRef = useRef(0);
  const typedBufferRef = useRef("");
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTypedBuffer = useCallback(() => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    typedBufferRef.current = "";
    setTypedBuffer("");
  }, []);

  const fetchPuzzle = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    clearTypedBuffer();
    getSandboxPuzzle()
      .then((data) => {
        const fresh = data.digits.map((d, i) => ({ id: i, value: d }));
        nextIdRef.current = fresh.length;
        setInitialTiles(fresh);
        setTiles(fresh);
        setHistory([]);
        setSelectedTileIds([]);
        setActiveOp(null);
        setError(null);
      })
      .catch(() => setLoadError("Could not load a puzzle. Try again."))
      .finally(() => setLoading(false));
  }, [clearTypedBuffer]);

  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  const isWon = tiles.length === 1 && isWithinTolerance(tiles[0].value, TARGET);

  // Helper to execute a binary calculation between two tiles
  const commitBinary = useCallback(
    (leftTile: Tile, rightTile: Tile, op: BinaryOpKind, currentTiles: Tile[]) => {
      clearTypedBuffer();
      const outcome = applyBinary(op, leftTile.value, rightTile.value);
      if (!outcome.ok) {
        setError(outcome.error);
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

      setTiles(nextTiles);
      setHistory((h) => [...h, { type: "binary", operands: [leftTile, rightTile], result, label }]);
      setSelectedTileIds([]);
      setActiveOp(null);
      setError(null);
    },
    [clearTypedBuffer]
  );

  // Tap handler for tiles
  const handleTileTap = useCallback(
    (tile: Tile) => {
      setError(null);

      // Deselect if already selected
      if (selectedTileIds.includes(tile.id)) {
        setSelectedTileIds((ids) => ids.filter((id) => id !== tile.id));
        return;
      }

      const nextSelectedIds = [...selectedTileIds, tile.id];

      // If we now have 2 selected tiles AND an active binary operation -> AUTO-COMMIT IMMEDIATELY!
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
    [selectedTileIds, activeOp, tiles, commitBinary]
  );

  // Commit any pending buffer if operator is pressed
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

  // Tap handler for binary operations (+, -, *, /, ^, root)
  const handleBinaryOpTap = useCallback(
    (kind: BinaryOpKind) => {
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
    [activeOp, selectedTileIds, tiles, commitBinary, flushPendingBuffer]
  );

  // Tap handler for unary operations (x!, sqrt)
  const handleUnaryOpTap = useCallback(
    (kind: UnaryOpKind) => {
      flushPendingBuffer();
      setError(null);

      const targetId = selectedTileIds.length > 0 ? selectedTileIds[selectedTileIds.length - 1] : null;
      if (targetId === null) {
        setError("Tap or type a digit tile first to apply " + (kind === "!" ? "factorial (x!)" : "square root (√x)"));
        return;
      }

      const tile = tiles.find((t) => t.id === targetId);
      if (!tile) return;

      const outcome = applyUnary(kind, tile.value);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      const result: Tile = { id: nextIdRef.current++, value: outcome.value };
      const label = formatUnaryLabel(kind, tile.value, outcome.value);

      setTiles((ts) => ts.map((t) => (t.id === tile.id ? result : t)));
      setHistory((h) => [...h, { type: "unary", operand: tile, result, label }]);
      setSelectedTileIds([]);
      setActiveOp(null);
      setError(null);
    },
    [selectedTileIds, tiles, flushPendingBuffer]
  );

  const handleUndo = useCallback(() => {
    clearTypedBuffer();
    if (history.length === 0) return;
    setError(null);
    const last = history[history.length - 1];
    const idx = tiles.findIndex((t) => t.id === last.result.id);
    if (idx === -1) return;
    const withoutResult = tiles.filter((t) => t.id !== last.result.id);
    const restored = last.type === "unary" ? [last.operand] : last.operands;

    setTiles([...withoutResult.slice(0, idx), ...restored, ...withoutResult.slice(idx)]);
    setHistory((h) => h.slice(0, -1));
    setActiveOp(null);
    setSelectedTileIds([]);
  }, [history, tiles, clearTypedBuffer]);

  const handleReset = useCallback(() => {
    clearTypedBuffer();
    if (!initialTiles) return;
    setError(null);
    setTiles(initialTiles);
    setHistory([]);
    setActiveOp(null);
    setSelectedTileIds([]);
  }, [initialTiles, clearTypedBuffer]);

  // Backspace deletes typed buffer or pops last selected tile
  const handleBackspace = useCallback(() => {
    setError(null);
    if (typedBufferRef.current) {
      clearTypedBuffer();
    } else if (selectedTileIds.length > 0) {
      setSelectedTileIds((ids) => ids.slice(0, -1));
    } else if (activeOp !== null) {
      setActiveOp(null);
    }
  }, [selectedTileIds, activeOp, clearTypedBuffer]);

  // Precise digit matcher: holds buffer open if prefix for larger tiles (e.g. 3 vs 35)
  const matchTypedDigit = useCallback(
    (digitChar: string) => {
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
        // Unambiguous exact match (e.g. typed "35" or typed "7" when no "7x" tiles exist)
        handleTileTap(exactMatch);
        clearTypedBuffer();
      } else if (isPrefixOfOther) {
        // Ambiguous prefix (e.g. typed "3" when tile "35" exists)
        // DO NOT select exactMatch yet! Wait for next digit or 800ms timeout.
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
        // Invalid sequence -> auto clear buffer
        bufferTimerRef.current = setTimeout(() => {
          clearTypedBuffer();
        }, BUFFER_TIMEOUT_MS);
      }
    },
    [tiles, selectedTileIds, handleTileTap, clearTypedBuffer]
  );

  // Keyboard shortcut listener
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
      } else if (e.key === "Escape" || e.key === "r" || e.key === "R") {
        handleReset();
      } else if (e.key === "n" || e.key === "N") {
        fetchPuzzle();
      } else if (e.key === " " || e.key === "Enter") {
        flushPendingBuffer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchTypedDigit, handleBinaryOpTap, handleUnaryOpTap, handleBackspace, handleUndo, handleReset, fetchPuzzle, flushPendingBuffer]);

  // Staged formula preview string
  const renderFormulaPreview = () => {
    const firstTile = tiles.find((t) => t.id === selectedTileIds[0]);
    const secondTile = tiles.find((t) => t.id === selectedTileIds[1]);

    if (!firstTile && !activeOp) {
      return (
        <span className="text-slate-500 italic text-xs">
          Tap or type numbers & operators to solve for {TARGET}
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Loading puzzle...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-rose-400">{loadError}</p>
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
          onClick={fetchPuzzle}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center p-4 max-w-lg mx-auto w-full">
      {/* Top Header */}
      <div className="flex w-full items-center justify-between mb-4">
        <button
          onClick={onExit}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          ← Exit
        </button>

        <p className="text-sm font-bold text-white">SOLO SANDBOX</p>

        <div className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
          TARGET: {TARGET}
        </div>
      </div>

      {isWon && (
        <div className="w-full mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="font-mono text-sm font-bold text-emerald-300">
            🎉 Solved! {formatValue(tiles[0].value)} = {TARGET}
          </p>
        </div>
      )}

      {/* Formula Preview Bar & Typed Buffer Indicator */}
      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] py-2.5 px-4 mb-3 text-center min-h-[42px] flex items-center justify-between">
        <div className="flex-1 flex justify-center">{renderFormulaPreview()}</div>
        {typedBuffer && (
          <span className="font-mono text-[10px] font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 animate-pulse">
            Typed: &quot;{typedBuffer}&quot;
          </span>
        )}
      </div>

      {/* Digit Tiles Grid */}
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

      {/* Binary Operators Toolbar */}
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

        {/* Unary Operators Toolbar */}
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

      {error && (
        <div className="w-full mb-3 rounded-lg border border-rose-500/30 bg-rose-950/40 p-2 text-center text-xs font-semibold text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {/* Action Controls */}
      <div className="flex gap-2 mb-3 w-full max-w-sm justify-center">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="flex-1 rounded-lg border border-[#202738] bg-[#131722] py-2 font-mono text-xs font-bold text-slate-400 disabled:opacity-30 hover:text-white"
        >
          ↺ Undo (Z)
        </button>
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
      </div>

      {/* Step History */}
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
