"use client";

import { useEffect, useRef, useState } from "react";
import type { Mode } from "@/lib/api";

interface Props {
  mode: Mode;
  initialP1: string;
  initialP2: string;
  initialP3: string;
  onSubmit: (p1: string, p2: string, p3: string) => void;
  error: string | null;
}

export default function NameScreen({ mode, initialP1, initialP2, initialP3, onSubmit, error }: Props) {
  const [p1, setP1] = useState(initialP1);
  const [p2, setP2] = useState(initialP2);
  const [p3, setP3] = useState(initialP3);
  const [localError, setLocalError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setP1(initialP1);
    setP2(initialP2);
    setP3(initialP3);
    setLocalError("");
    firstInputRef.current?.focus();
  }, [mode, initialP1, initialP2, initialP3]);

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

  const row = (label: string, value: string, setValue: (v: string) => void, ref?: React.Ref<HTMLInputElement>) => (
    <div className="mb-3 flex items-center">
      <label className="w-36 shrink-0 text-xs font-bold text-[var(--text-muted)]">{label}</label>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="w-full rounded px-3 py-2 text-sm text-[var(--text-main)] outline-none"
        style={{ background: "var(--bg-card)" }}
      />
    </div>
  );

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-xs">
        <h1 className="mb-5 text-center text-base font-bold tracking-wide text-[var(--text-main)]">
          ENTER PLAYER NAMES
        </h1>

        {row("Player 1 [ENTER]", p1, setP1, firstInputRef)}
        {row("Player 2 [SHIFT]", p2, setP2)}
        {mode === "3p" && row("Player 3 [LMB]", p3, setP3)}

        {(localError || error) && (
          <p className="mt-1 text-center text-xs" style={{ color: "var(--color-error)" }}>
            {localError || error}
          </p>
        )}

        <button
          className="mt-4 w-full rounded px-5 py-3 text-sm font-bold text-white"
          style={{ background: "var(--accent-blue)" }}
          onClick={submit}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
