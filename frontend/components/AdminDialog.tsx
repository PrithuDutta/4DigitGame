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

  const isOnline = Array.isArray((state as any).players);
  const initialScores: Record<string, string> = isOnline
    ? (state as any).players.reduce((acc: Record<string, string>, p: any) => {
        acc[p.player_id || p.slot] = (p.score ?? 0).toFixed(1);
        return acc;
      }, {})
    : {
        p1: state.p1_score.toFixed(1),
        p2: state.p2_score.toFixed(1),
        p3: state.p3_score.toFixed(1),
      };

  const [scoresMap, setScoresMap] = useState<Record<string, string>>(initialScores);

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
    const invalid = Object.values(scoresMap).some((v) => !isNumber(v));
    if (invalid) {
      setError("Scores must be numbers.");
      return;
    }

    if (isOnline) {
      const numScores = Object.entries(scoresMap).reduce((acc: Record<string, number>, [k, v]) => {
        acc[k] = Number(v);
        return acc;
      }, {});
      const next = await onSubmitScores(numScores as any, 0, 0);
      onScoresUpdated(next);
    } else {
      const next = await onSubmitScores(
        Number(scoresMap.p1 ?? 0),
        Number(scoresMap.p2 ?? 0),
        Number(scoresMap.p3 ?? 0)
      );
      onScoresUpdated(next);
    }
    onClose();
  };

  const editList = isOnline
    ? (state as any).players.map((p: any) => ({
        id: p.player_id || p.slot,
        label: p.name,
      }))
    : [
        { id: "p1", label: state.p1_name },
        { id: "p2", label: state.p2_name },
        ...(state.mode === "3p" ? [{ id: "p3", label: state.p3_name }] : []),
      ];

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
              {editList.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-300">
                    {item.label}:
                  </label>
                  <input
                    value={scoresMap[item.id] ?? "0.0"}
                    onChange={(e) =>
                      setScoresMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
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
