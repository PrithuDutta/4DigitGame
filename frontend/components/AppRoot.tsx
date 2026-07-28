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
  // useSyncExternalStore — not a useEffect — is the SSR-safe way to read a
  // value that legitimately differs between server and client (there's no
  // localStorage/window on the server). It avoids both a hydration mismatch
  // and a setState-in-effect, unlike naively checking localStorage in a
  // useState initializer or a mount effect.
  const hasStoredSession = useSyncExternalStore(
    subscribeToStorage,
    getHasStoredSession,
    getHasStoredSessionServer,
  );

  // Explicit user navigation (picking a mode, hitting Back) always wins;
  // until the user has chosen anything this session, a stored online
  // session takes you straight back into OnlineGameApp's rejoin flow.
  const [explicitChoice, setExplicitChoice] = useState<Choice | null>(null);
  const choice: Choice = explicitChoice ?? (hasStoredSession ? "online" : "landing");

  if (choice === "local") {
    // GameApp is untouched by online multiplayer — rendering it directly
    // here keeps local mode byte-for-byte identical to before this feature.
    return <GameApp />;
  }

  if (choice === "online") {
    return <OnlineGameApp onBackToLanding={() => setExplicitChoice("landing")} />;
  }

  return <LandingScreen onSelect={setExplicitChoice} />;
}
