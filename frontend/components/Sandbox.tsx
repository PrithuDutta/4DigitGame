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
        className={`flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm font-bold border ${
          tile
            ? "border-indigo-400 bg-indigo-500/20 text-white"
            : isNext
            ? "border-dashed border-cyan-400 bg-cyan-500/10 text-cyan-300"
            : "border-dashed border-slate-700 bg-slate-900 text-slate-600"
        }`}
      >
        {tile ? formatValue(tile.value) : ""}
      </span>
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
          onClick={loadPuzzle}
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
        <div className="w-full mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-center">
          <p className="font-mono text-sm font-bold text-emerald-300">
            🎉 Solved! {formatValue(tiles[0].value)} = {TARGET}
          </p>
        </div>
      )}

      {/* Tiles */}
      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-4 mb-3 text-center">
        <p className="mb-2.5 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          DIGIT TILES
        </p>

        <div className="flex flex-wrap justify-center gap-2.5">
          {availableTiles.map((tile) => {
            const isSelected = selectedTileId === tile.id;
            return (
              <button
                key={tile.id}
                onClick={() => handleTileTap(tile)}
                className={`flex h-12 w-12 items-center justify-center rounded-lg font-mono text-base font-bold border transition-colors ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                    : "border-slate-700 bg-slate-900 text-white hover:border-slate-500"
                }`}
              >
                {formatValue(tile.value)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Binary Ops */}
      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-3.5 mb-3 text-center">
        <div className="flex flex-wrap justify-center gap-1.5">
          {BINARY_OPS.map((kind) => {
            const isActive = activeOp === kind;
            return (
              <button
                key={kind}
                onClick={() => handleBinaryOpTap(kind)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold border ${
                  isActive
                    ? "border-indigo-400 bg-indigo-600 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {kind === "root" ? "ⁿ√" : binarySymbol(kind)}
              </button>
            );
          })}
        </div>

        {/* Unary Ops */}
        <div className="mt-2.5 flex justify-center gap-2 border-t border-[#202738] pt-2.5">
          {UNARY_OPS.map((kind) => (
            <button
              key={kind}
              onClick={() => handleUnaryOpTap(kind)}
              className="flex h-8 px-3 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 font-mono text-xs font-bold text-slate-300 hover:text-white"
            >
              {kind === "!" ? "x!" : "√x"}
            </button>
          ))}
        </div>
      </div>

      {/* Staging */}
      {activeOp && (
        <div className="w-full flex items-center justify-between gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-3 mb-3">
          {activeOp === "root" ? (
            <div className="flex items-end gap-1.5">
              {renderStagingSlot(0)}
              <span className="font-mono text-xl font-bold text-cyan-300">√</span>
              {renderStagingSlot(1)}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {renderStagingSlot(0)}
              <span className="font-mono text-base font-bold text-indigo-400">
                {binarySymbol(activeOp)}
              </span>
              {renderStagingSlot(1)}
            </div>
          )}

          <button
            onClick={handleCommit}
            disabled={staged.length !== REQUIRED_SLOTS}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-mono text-xs font-bold text-white disabled:opacity-30"
          >
            ENTER
          </button>
        </div>
      )}

      {error && (
        <p className="mb-3 text-center text-xs text-rose-400">{error}</p>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 font-mono text-xs font-bold text-slate-400 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 font-mono text-xs font-bold text-slate-400"
        >
          Reset
        </button>
        <button
          onClick={loadPuzzle}
          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 font-mono text-xs font-bold text-indigo-300"
        >
          New Puzzle
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-sm rounded-xl border border-[#202738] bg-[#131722] p-3">
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
