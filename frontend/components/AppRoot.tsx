"use client";

import { useState, useSyncExternalStore } from "react";
import { loadStoredSession } from "@/lib/socket";
import { hasSeenTutorial, markTutorialSeen } from "@/lib/tutorial";
import { useVisitorTracking } from "@/lib/useVisitorTracking";
import { useSettings } from "@/lib/useSettings";
import GameApp from "./GameApp";
import LandingScreen from "./LandingScreen";
import OnlineGameApp from "./OnlineGameApp";
import SettingsDialog from "./SettingsDialog";
import Tutorial from "./Tutorial";

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

// localStorage writes made in this tab don't fire the "storage" event (only
// other tabs see that), so useSyncExternalStore alone won't react to
// markTutorialSeen() called during this same session — it only resolves the
// *initial* client value correctly. tutorialOverride (plain React state)
// handles same-session changes (finishing, skipping, or replaying).
function getSeenTutorialServer() {
  return true;
}

export default function AppRoot() {
  useVisitorTracking();
  useSettings(); // Initialize DOM scaling and options

  const hasStoredSession = useSyncExternalStore(
    subscribeToStorage,
    getHasStoredSession,
    getHasStoredSessionServer,
  );
  const seenTutorialOnLoad = useSyncExternalStore(subscribeToStorage, hasSeenTutorial, getSeenTutorialServer);

  const [explicitChoice, setExplicitChoice] = useState<Choice | null>(null);
  const [tutorialOverride, setTutorialOverride] = useState<boolean | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const choice: Choice = explicitChoice ?? (hasStoredSession ? "online" : "landing");
  const showTutorial = tutorialOverride ?? (!seenTutorialOnLoad && choice === "landing");

  const finishTutorial = () => {
    markTutorialSeen();
    setTutorialOverride(false);
  };

  let content: React.ReactNode;
  if (choice === "local") {
    content = <GameApp onBackToLanding={() => setExplicitChoice("landing")} />;
  } else if (choice === "online") {
    content = <OnlineGameApp onBackToLanding={() => setExplicitChoice("landing")} />;
  } else if (showTutorial) {
    content = <Tutorial onDone={finishTutorial} />;
  } else {
    content = (
      <LandingScreen
        onSelect={setExplicitChoice}
        onReplayTutorial={() => setTutorialOverride(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[var(--bg-dark)] text-[var(--text-main)]">
      <div className="relative z-10 flex flex-1 flex-col">{content}</div>
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

