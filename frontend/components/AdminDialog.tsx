"use client";

import { useState } from "react";
import type { GameStateDTO } from "@/lib/api";
import { postAdminLogin, postAdminScores } from "@/lib/api";

interface Props {
  state: GameStateDTO;
  onClose: () => void;
  onScoresUpdated: (next: GameStateDTO) => void;
  onLogin?: (password: string) => Promise<{ ok: boolean }>;
  onSubmitScores?: (p1: number, p2: number, p3: number) => Promise<GameStateDTO>;
}

export default function AdminDialog({
  state,
  onClose,
  onScoresUpdated,
  onLogin = postAdminLogin,
  onSubmitScores = postAdminScores,
}: Props) {
  const [stage, setStage] = useState<"login" | "edit">("login");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [p1, setP1] = useState(state.p1_score.toFixed(1));
  const [p2, setP2] = useState(state.p2_score.toFixed(1));
  const [p3, setP3] = useState(state.p3_score.toFixed(1));

  const attemptLogin = async () => {
    const { ok } = await onLogin(password);
    if (ok) {
      setError("");
      setStage("edit");
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
  };

  const saveScores = async () => {
    const isNumber = (v: string) => v.trim() !== "" && !Number.isNaN(Number(v));
    if (!isNumber(p1) || !isNumber(p2) || (state.mode === "3p" && !isNumber(p3))) {
      setError("Scores must be numbers.");
      return;
    }
    const next = await onSubmitScores(Number(p1), Number(p2), Number(p3));
    onScoresUpdated(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-72 rounded p-6"
        style={{ background: "var(--bg-dark)" }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {stage === "login" ? (
          <>
            <p className="mb-4 text-center text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              Enter Admin Password
            </p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") attemptLogin();
              }}
              className="w-full rounded px-3 py-2 text-center text-sm text-[var(--text-main)] outline-none"
              style={{ background: "var(--bg-card)" }}
            />
            {error && (
              <p className="mt-2 text-center text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <button
                className="rounded px-4 py-2 text-xs font-bold text-white"
                style={{ background: "var(--accent-blue)" }}
                onClick={attemptLogin}
              >
                Unlock
              </button>
              <button
                className="rounded px-4 py-2 text-xs font-bold text-[var(--text-muted)]"
                style={{ background: "var(--bg-card)" }}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-center text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              EDIT SCORES
            </p>

            {[
              [state.p1_name, p1, setP1],
              [state.p2_name, p2, setP2],
              ...(state.mode === "3p" ? [[state.p3_name, p3, setP3] as const] : []),
            ].map(([label, value, setValue], i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <label className="w-20 shrink-0 text-right text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                  {label as string}:
                </label>
                <input
                  value={value as string}
                  onChange={(e) => (setValue as (v: string) => void)(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveScores();
                  }}
                  className="w-20 rounded px-2 py-1 text-center text-sm text-[var(--text-main)] outline-none"
                  style={{ background: "var(--bg-card)" }}
                />
              </div>
            ))}

            {error && (
              <p className="mt-2 text-center text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-center gap-2">
              <button
                className="rounded px-4 py-2 text-xs font-bold text-white"
                style={{ background: "var(--accent-blue)" }}
                onClick={saveScores}
              >
                Save Changes
              </button>
              <button
                className="rounded px-4 py-2 text-xs font-bold text-[var(--text-muted)]"
                style={{ background: "var(--bg-card)" }}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
