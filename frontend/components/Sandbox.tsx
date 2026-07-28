"use client";

import { useEffect, useRef, useState } from "react";
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
const REQUIRED_SLOTS = 2;

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
  const [activeOp, setActiveOp] = useState<BinaryOpKind | null>(null);
  const [staged, setStaged] = useState<Tile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const nextIdRef = useRef(0);

  // Only ever mutates state inside a promise callback, never synchronously,
  // so this is safe to call from an effect body (unlike setLoading/setLoadError,
  // which are fine from event handlers but not from a mount effect).
  const fetchPuzzle = () =>
    getSandboxPuzzle()
      .then((data) => {
        const fresh = data.digits.map((d, i) => ({ id: i, value: d }));
        nextIdRef.current = fresh.length;
        setInitialTiles(fresh);
        setTiles(fresh);
        setHistory([]);
        setActiveOp(null);
        setStaged([]);
        setSelectedTileId(null);
        setError(null);
      })
      .catch(() => setLoadError("Could not load a puzzle. Try again."))
      .finally(() => setLoading(false));

  const loadPuzzle = () => {
    setLoading(true);
    setLoadError(null);
    fetchPuzzle();
  };

  useEffect(() => {
    fetchPuzzle();
  }, []);

  const isWon = tiles.length === 1 && isWithinTolerance(tiles[0].value, TARGET);
  const availableTiles = tiles.filter((t) => !staged.some((s) => s.id === t.id));

  const handleTileTap = (tile: Tile) => {
    setError(null);
    if (activeOp) {
      if (staged.length >= REQUIRED_SLOTS) return;
      setStaged((s) => [...s, tile]);
    } else {
      setSelectedTileId((cur) => (cur === tile.id ? null : tile.id));
    }
  };

  const handleBinaryOpTap = (kind: BinaryOpKind) => {
    setError(null);
    if (activeOp === kind) {
      setActiveOp(null);
      setStaged([]);
    } else {
      setActiveOp(kind);
      setStaged([]);
      setSelectedTileId(null);
    }
  };

  const handleUnaryOpTap = (kind: UnaryOpKind) => {
    setError(null);
    if (selectedTileId === null) {
      setError("Tap a tile first, then tap this to apply it.");
      return;
    }
    const tile = tiles.find((t) => t.id === selectedTileId);
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
    setSelectedTileId(null);
  };

  const handleCommit = () => {
    if (!activeOp || staged.length !== REQUIRED_SLOTS) return;
    const [left, right] = staged;

    const outcome = applyBinary(activeOp, left.value, right.value);
    if (!outcome.ok) {
      setError(outcome.error);
      setStaged([]);
      return;
    }

    const result: Tile = { id: nextIdRef.current++, value: outcome.value };
    const label = formatBinaryLabel(activeOp, left.value, right.value, outcome.value);

    setTiles((ts) => {
      const leftIndex = ts.findIndex((t) => t.id === left.id);
      const before = ts.slice(0, leftIndex).filter((t) => t.id !== right.id).length;
      const withoutOperands = ts.filter((t) => t.id !== left.id && t.id !== right.id);
      const insertAt = Math.min(before, withoutOperands.length);
      return [...withoutOperands.slice(0, insertAt), result, ...withoutOperands.slice(insertAt)];
    });
    setHistory((h) => [...h, { type: "binary", operands: [left, right], result, label }]);
    setActiveOp(null);
    setStaged([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    setError(null);
    const last = history[history.length - 1];
    const idx = tiles.findIndex((t) => t.id === last.result.id);
    if (idx === -1) return;
    const withoutResult = tiles.filter((t) => t.id !== last.result.id);
    const restored = last.type === "unary" ? [last.operand] : last.operands;

    setTiles([...withoutResult.slice(0, idx), ...restored, ...withoutResult.slice(idx)]);
    setHistory(history.slice(0, -1));
    setActiveOp(null);
    setStaged([]);
    setSelectedTileId(null);
  };

  const handleReset = () => {
    if (!initialTiles) return;
    setError(null);
    setTiles(initialTiles);
    setHistory([]);
    setActiveOp(null);
    setStaged([]);
    setSelectedTileId(null);
  };

  const renderStagingSlot = (index: number) => {
    const tile = staged[index];
    const isNext = staged.length === index;
    return (
      <span
        key={index}
        className="flex h-10 w-10 items-center justify-center rounded border text-sm font-bold"
        style={{
          background: tile ? "var(--bg-card)" : "transparent",
          borderColor: isNext ? "var(--accent-blue)" : "#272735",
          borderStyle: isNext ? "solid" : "dashed",
          color: "var(--text-main)",
        }}
      >
        {tile ? formatValue(tile.value) : ""}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
        Loading puzzle...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          {loadError}
        </p>
        <button
          className="rounded px-4 py-2 text-xs font-bold text-white"
          style={{ background: "var(--accent-blue)" }}
          onClick={loadPuzzle}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-4">
      <button
        className="absolute left-6 top-5 rounded px-3 py-1 text-xs font-bold text-[var(--text-muted)]"
        style={{ background: "var(--bg-card)" }}
        onClick={onExit}
      >
        Exit
      </button>

      <p className="mt-9 mb-1 text-xs font-bold tracking-wide" style={{ color: "var(--text-dim)" }}>
        SANDBOX
      </p>
      <p className="mb-4 text-sm font-bold" style={{ color: "var(--color-gold)" }}>
        Target: {TARGET}
      </p>

      {isWon && (
        <p className="mb-3 text-sm font-bold" style={{ color: "var(--color-success)" }}>
          🎉 Solved! {formatValue(tiles[0].value)} = {TARGET}
        </p>
      )}

      {/* Tiles */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {availableTiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => handleTileTap(tile)}
            className="flex h-14 w-14 items-center justify-center rounded border font-mono text-lg font-bold"
            style={{
              background: selectedTileId === tile.id ? "var(--accent-blue)" : "var(--bg-card)",
              borderColor: selectedTileId === tile.id ? "var(--accent-blue-hover)" : "#272735",
              color: "var(--text-main)",
            }}
          >
            {formatValue(tile.value)}
          </button>
        ))}
      </div>

      {/* Binary operation buttons */}
      <div className="mb-2 flex flex-wrap justify-center gap-1.5">
        {BINARY_OPS.map((kind) => (
          <button
            key={kind}
            onClick={() => handleBinaryOpTap(kind)}
            className="flex h-10 w-10 items-center justify-center rounded text-sm font-bold"
            style={{
              background: activeOp === kind ? "var(--accent-blue)" : "var(--bg-card)",
              color: activeOp === kind ? "white" : "var(--text-main)",
            }}
          >
            {kind === "root" ? "ⁿ√" : binarySymbol(kind)}
          </button>
        ))}
      </div>

      {/* Unary operation buttons */}
      <div className="mb-4 flex justify-center gap-1.5">
        {UNARY_OPS.map((kind) => (
          <button
            key={kind}
            onClick={() => handleUnaryOpTap(kind)}
            className="flex h-9 w-16 items-center justify-center rounded text-xs font-bold"
            style={{ background: "var(--bg-card)", color: "var(--text-main)" }}
          >
            {kind === "!" ? "x!" : "√x"}
          </button>
        ))}
      </div>

      {/* Staging area */}
      {activeOp && (
        <div className="mb-3 flex items-center gap-2 rounded border p-3" style={{ borderColor: "#272735" }}>
          {activeOp === "root" ? (
            <div className="flex items-end gap-1">
              <div className="flex flex-col items-center">
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                  degree
                </span>
                {renderStagingSlot(0)}
              </div>
              <span className="mb-1 text-xl" style={{ color: "var(--text-main)" }}>
                √
              </span>
              <div className="flex flex-col items-center">
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                  radicand
                </span>
                {renderStagingSlot(1)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {renderStagingSlot(0)}
              <span className="text-lg font-bold" style={{ color: "var(--text-main)" }}>
                {binarySymbol(activeOp)}
              </span>
              {renderStagingSlot(1)}
            </div>
          )}

          <button
            onClick={handleCommit}
            disabled={staged.length !== REQUIRED_SLOTS}
            className="ml-2 rounded px-3 py-2 text-xs font-bold text-white disabled:opacity-30"
            style={{ background: "var(--accent-blue)" }}
          >
            Enter
          </button>
        </div>
      )}

      {error && (
        <p className="mb-3 text-xs" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="mb-4 flex gap-1.5">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="rounded px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] disabled:opacity-30"
          style={{ background: "var(--bg-card)" }}
        >
          Undo
        </button>
        <button
          onClick={handleReset}
          className="rounded px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]"
          style={{ background: "var(--bg-card)" }}
        >
          Reset
        </button>
        <button
          onClick={loadPuzzle}
          className="rounded px-3 py-1.5 text-xs font-bold text-[#818cf8]"
          style={{ background: "var(--bg-card)" }}
        >
          New Puzzle
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="mb-1 text-center text-[10px] font-bold tracking-wide" style={{ color: "var(--text-dim)" }}>
            HISTORY
          </p>
          <div
            className="max-h-32 overflow-y-auto rounded border p-2 text-xs"
            style={{ background: "var(--bg-card)", borderColor: "#272735" }}
          >
            {history
              .slice()
              .reverse()
              .map((h, i) => (
                <div key={history.length - i} className="py-0.5 text-center" style={{ color: "var(--text-main)" }}>
                  {h.label}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
