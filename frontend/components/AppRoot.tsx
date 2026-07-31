"use client";

import { useState, useSyncExternalStore } from "react";
import { loadStoredSession } from "@/lib/socket";
import GameApp from "./GameApp";
import LandingScreen from "./LandingScreen";
import OnlineGameApp from "./OnlineGameApp";

type Choice = "landing" | "local" | "online";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getHasStoredSession() {
  return loadStoredSession() !== null;
}

function getHasStoredSessionServer() {
  return false;
}

export default function AppRoot() {
  const hasStoredSession = useSyncExternalStore(
    subscribeToStorage,
    getHasStoredSession,
    getHasStoredSessionServer,
  );

  const [explicitChoice, setExplicitChoice] = useState<Choice | null>(null);
  const choice: Choice = explicitChoice ?? (hasStoredSession ? "online" : "landing");

  let content: React.ReactNode;
  if (choice === "local") {
    content = <GameApp onBackToLanding={() => setExplicitChoice("landing")} />;
  } else if (choice === "online") {
    content = <OnlineGameApp onBackToLanding={() => setExplicitChoice("landing")} />;
  } else {
    content = <LandingScreen onSelect={setExplicitChoice} />;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[var(--bg-dark)] text-[var(--text-main)]">
      <div className="relative z-10 flex flex-1 flex-col">{content}</div>
    </div>
  );
}
