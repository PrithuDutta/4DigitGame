const STORAGE_KEY = "4digit_seen_tutorial";

// Same SSR-safe, try/catch-guarded localStorage pattern as loadStoredSession
// in lib/socket.ts.
export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore — worst case the tutorial just shows again next visit
  }
}
