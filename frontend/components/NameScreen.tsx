"use client";

import { useEffect, useRef, useState } from "react";
import type { Mode } from "@/lib/api";

interface Props {
  mode: Mode | null;
  initialP1: string;
  initialP2: string;
  initialP3: string;
  onSubmit: (p1: string, p2: string, p3: string) => void;
  onExit: () => void;
  error: string | null;
}

export default function NameScreen({ mode, initialP1, initialP2, initialP3, onSubmit, onExit, error }: Props) {
  const [p1, setP1] = useState(initialP1);
  const [p2, setP2] = useState(initialP2);
  const [p3, setP3] = useState(initialP3);
  const [localError, setLocalError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const submit = () => {
    const t1 = p1.trim();
    const t2 = p2.trim();
    const t3 = p3.trim();

    if (!t1 || !t2 || (mode === "3p" && !t3)) {
      setLocalError("Please enter a name for every player.");
      return;
    }

    setLocalError("");
    onSubmit(t1, t2, t3);
  };

  const renderInputRow = (
    label: string,
    keycap: string,
    value: string,
    setValue: (v: string) => void,
    ref?: React.Ref<HTMLInputElement>
  ) => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
          {keycap}
        </span>
      </div>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="w-full rounded-lg border border-[#202738] bg-[#131722] px-3.5 py-2 text-sm font-semibold text-white outline-none focus:border-indigo-500"
      />
    </div>
  );

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-xs flex-col items-center">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white">ENTER NAMES</h2>
        </div>

        <div className="flex w-full flex-col gap-3">
          {renderInputRow("Player 1", "[ENTER]", p1, setP1, firstInputRef)}
          {renderInputRow("Player 2", "[SHIFT]", p2, setP2)}
          {mode === "3p" && renderInputRow("Player 3", "[LMB]", p3, setP3)}

          {(localError || error) && (
            <p className="text-center text-xs text-rose-400">
              {localError || error}
            </p>
          )}

          <button
            onClick={submit}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
          >
            Start Game
          </button>

          <button
            onClick={onExit}
            className="w-full rounded-xl border border-[#202738] bg-[#131722] py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
