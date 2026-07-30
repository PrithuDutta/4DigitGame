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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-xs rounded-2xl border border-slate-800 bg-[var(--bg-card-solid)] p-6 shadow-2xl"
        onKeyDown={(e) => e.stopPropagation()}
      >
        {stage === "login" ? (
          <>
            <p className="mb-1 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              SECURITY ACCESS
            </p>
            <h3 className="mb-4 text-center text-lg font-extrabold text-white">
              ADMIN CONTROL PANEL
            </h3>

            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") attemptLogin();
              }}
              placeholder="Password"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-center text-sm font-semibold text-white outline-none focus:border-indigo-500"
            />
            {error && (
              <p className="mt-2 text-center text-xs font-semibold text-rose-400">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-center gap-2">
              <button
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg"
                onClick={attemptLogin}
              >
                Unlock
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-bold text-slate-400"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-1 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              OVERRIDE SCORES
            </p>
            <h3 className="mb-4 text-center text-lg font-extrabold text-white">
              EDIT MATCH SCORES
            </h3>

            <div className="flex flex-col gap-3">
              {[
                [state.p1_name, p1, setP1],
                [state.p2_name, p2, setP2],
                ...(state.mode === "3p" ? [[state.p3_name, p3, setP3] as const] : []),
              ].map(([label, value, setValue], i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-300">
                    {label as string}:
                  </label>
                  <input
                    value={value as string}
                    onChange={(e) => (setValue as (v: string) => void)(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveScores();
                    }}
                    className="w-24 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-center font-mono text-sm font-bold text-amber-400 outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-2 text-center text-xs font-semibold text-rose-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-center gap-2">
              <button
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg"
                onClick={saveScores}
              >
                Save
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-bold text-slate-400"
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
