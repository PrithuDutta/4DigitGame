"use client";

import { useEffect } from "react";

const VISITOR_KEY = "visitorId";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";

/**
 * Checks localStorage for visitorId. If missing, generates one via crypto.randomUUID() and stores it.
 */
export function getOrCreateVisitorId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  } catch {
    // Handles scenarios where localStorage access is restricted
    return null;
  }
}

/**
 * Standalone client-side function to record a site visit.
 * Sends a POST request to /api/track/visit with visitorId. Fails silently on error.
 */
export async function trackVisit(): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  if (!visitorId) return;

  try {
    await fetch(`${API_BASE}/api/track/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    });
  } catch {
    // Fail silently if network request drops
  }
}

/**
 * Lightweight React hook that runs once on initial page load to log visitor metrics.
 */
export function useVisitorTracking(): void {
  useEffect(() => {
    trackVisit();
  }, []);
}

export default useVisitorTracking;
