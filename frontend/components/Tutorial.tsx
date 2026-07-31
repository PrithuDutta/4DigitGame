"use client";

import { useCallback, useRef, useState } from "react";
import type { BinaryOpKind } from "@/lib/sandboxMath";
import { applyBinary, binarySymbol, formatBinaryLabel, formatValue } from "@/lib/sandboxMath";

const TARGET = 10;

interface Tile {
  id: number;
  value: number;
}

const INITIAL_TILES: Tile[] = [
  { id: 0, value: 4 },
  { id: 1, value: 8 },
  { id: 2, value: 1 },
  { id: 3, value: 4 },
];

// Solution used to teach the core loop: tap a tile, tap the operator, tap
// the second tile — the second tile tap auto-commits, matching Sandbox.tsx's
// tile→op→tile path (tapping an operator with one tile already selected just
// arms it; the next tile tap fires the calculation).
//   8 ÷ 4 = 2
//   4 + 1 = 5
//   2 × 5 = 10  ✓
type Step =
  | { kind: "tile"; value: number; prompt: string }
  | { kind: "op"; op: BinaryOpKind; prompt: string };

const SCRIPT: Step[] = [
  { kind: "tile", value: 8, prompt: "Tap the 8 tile." },
  { kind: "op", op: "/", prompt: "Now tap ÷." },
  { kind: "tile", value: 4, prompt: "Tap a 4 tile to divide by it." },

  { kind: "tile", value: 4, prompt: "Tap the remaining 4 tile." },
  { kind: "op", op: "+", prompt: "Now tap +." },
  { kind: "tile", value: 1, prompt: "Tap the 1 tile to add it." },

  { kind: "tile", value: 2, prompt: "Tap the 2 you just made." },
  { kind: "op", op: "*", prompt: "Now tap ×." },
  { kind: "tile", value: 5, prompt: "Tap the 5 to multiply — this hits the target!" },
];

const SCRIPT_OPS = Array.from(new Set(SCRIPT.filter((s): s is Extract<Step, { kind: "op" }> => s.kind === "op").map((s) => s.op)));

interface Props {
  onDone: () => void;
}

export default function Tutorial({ onDone }: Props) {
  const [tiles, setTiles] = useState<Tile[]>(INITIAL_TILES);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [activeOp, setActiveOp] = useState<BinaryOpKind | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const nextIdRef = useRef(4);
  const currentStep = SCRIPT[stepIndex];

  const commit = useCallback(
    (left: Tile, right: Tile, op: BinaryOpKind) => {
      const outcome = applyBinary(op, left.value, right.value);
      if (!outcome.ok) return; // scripted path is always valid; defensive no-op

      const result: Tile = { id: nextIdRef.current++, value: outcome.value };
      const label = formatBinaryLabel(op, left.value, right.value, outcome.value);

      setTiles((ts) => {
        const leftIndex = ts.findIndex((t) => t.id === left.id);
        const before = ts.slice(0, leftIndex).filter((t) => t.id !== right.id).length;
        const withoutOperands = ts.filter((t) => t.id !== left.id && t.id !== right.id);
        const insertAt = Math.min(before, withoutOperands.length);
        return [...withoutOperands.slice(0, insertAt), result, ...withoutOperands.slice(insertAt)];
      });

      setSelected(null);
      setActiveOp(null);
      setHint(null);
      setLastResult(label);

      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      if (nextIndex >= SCRIPT.length) setDone(true);
    },
    [stepIndex]
  );

  const handleTileTap = useCallback(
    (tile: Tile) => {
      if (selected?.id === tile.id) return;

      if (!currentStep || currentStep.kind !== "tile") {
        setHint(currentStep ? currentStep.prompt : null);
        return;
      }
      if (Math.abs(tile.value - currentStep.value) > 1e-9) {
        setHint(currentStep.prompt);
        return;
      }

      setHint(null);

      if (!selected) {
        // First tile of this round — just select it, wait for the operator.
        setSelected(tile);
        setStepIndex((i) => i + 1);
        return;
      }

      // Second tile — the operator is already armed (activeOp), so this
      // commits immediately, exactly like Sandbox's tile→op→tile path.
      commit(selected, tile, activeOp as BinaryOpKind);
    },
    [selected, activeOp, currentStep, commit]
  );

  const handleOpTap = useCallback(
    (op: BinaryOpKind) => {
      if (!currentStep || currentStep.kind !== "op") {
        setHint(currentStep ? currentStep.prompt : null);
        return;
      }
      if (op !== currentStep.op) {
        setHint(currentStep.prompt);
        return;
      }

      setHint(null);
      setActiveOp(op);
      setStepIndex((i) => i + 1);
    },
    [currentStep]
  );

  const isWon = tiles.length === 1 && Math.abs(tiles[0].value - TARGET) < 1e-6;

  return (
    <div className="relative flex flex-1 flex-col items-center p-4 max-w-lg mx-auto w-full">
      <div className="flex w-full items-center justify-between mb-4">
        <p className="text-sm font-bold text-white">HOW TO PLAY: SANDBOX</p>
        <button
          onClick={onDone}
          className="rounded-lg border border-[#202738] bg-[#131722] px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          Skip Tutorial
        </button>
      </div>

      {!done ? (
        <>
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Step {stepIndex + 1} of {SCRIPT.length} — Target: {TARGET}
          </p>
          <div className="w-full rounded-xl border border-indigo-500/40 bg-indigo-500/10 py-3 px-4 mb-3 text-center">
            <p className="font-mono text-sm font-bold text-indigo-200">{currentStep.prompt}</p>
            {hint && <p className="mt-1 text-xs text-amber-300">👆 {hint}</p>}
            {!hint && lastResult && <p className="mt-1 text-xs text-emerald-300">✅ {lastResult}</p>}
          </div>
        </>
      ) : (
        <div className="w-full mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
          <p className="font-mono text-sm font-bold text-emerald-300">
            🎉 Solved! {lastResult}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            That&apos;s the whole loop: tap a tile, tap an operator, tap the second tile
            to merge them. Combine all four to hit the target, using each exactly once.
          </p>
        </div>
      )}

      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-4 mb-3 text-center">
        <div className="flex flex-wrap justify-center gap-3">
          {tiles.map((tile) => {
            const isSelected = selected?.id === tile.id;
            const isWinner = isWon && tiles.length === 1;

            return (
              <button
                key={tile.id}
                onClick={() => handleTileTap(tile)}
                className={`relative flex h-14 w-14 items-center justify-center rounded-xl font-mono text-lg font-bold border transition-all duration-150 active:scale-95 ${
                  isWinner
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : isSelected
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                    : "border-slate-700 bg-slate-900 text-white hover:border-slate-500"
                }`}
              >
                {formatValue(tile.value)}
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 font-mono text-[10px] font-bold text-slate-950">
                    1
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full rounded-xl border border-[#202738] bg-[#131722] p-3.5 mb-4 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          {SCRIPT_OPS.map((op) => {
            const isNext = currentStep?.kind === "op" && currentStep.op === op;
            const isArmed = activeOp === op;
            return (
              <button
                key={op}
                onClick={() => handleOpTap(op)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold border transition-all active:scale-95 ${
                  isNext
                    ? "border-indigo-400 bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] animate-pulse"
                    : isArmed
                    ? "border-indigo-400 bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {binarySymbol(op)}
              </button>
            );
          })}
        </div>
      </div>

      {done && (
        <button
          onClick={onDone}
          className="w-full max-w-md rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
        >
          Got it — Start Playing
        </button>
      )}
    </div>
  );
}
