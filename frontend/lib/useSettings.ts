"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  GameSettings,
  applySettingsToDOM,
  loadSettings,
  playAudioCue,
  saveSettings,
} from "./settings";

function subscribeToSettings(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("4digit_settings_changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("4digit_settings_changed", callback);
  };
}

export function useSettings() {
  const settings = useSyncExternalStore(
    subscribeToSettings,
    loadSettings,
    () => DEFAULT_SETTINGS
  );

  // Apply settings to DOM whenever settings change
  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings]);

  const updateSetting = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    saveSettings(updated);
  };

  const setGuiScale = (scale: number) => {
    const clamped = Math.min(1.5, Math.max(0.75, Math.round(scale * 100) / 100));
    playAudioCue("scale", settings.soundEnabled);
    updateSetting("guiScale", clamped);
  };

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    playAudioCue("toggle", next);
    updateSetting("soundEnabled", next);
  };

  const toggleHighContrast = () => {
    playAudioCue("toggle", settings.soundEnabled);
    updateSetting("highContrast", !settings.highContrast);
  };

  const toggleReduceMotion = () => {
    playAudioCue("toggle", settings.soundEnabled);
    updateSetting("reduceMotion", !settings.reduceMotion);
  };

  const toggleShowKeyHints = () => {
    playAudioCue("toggle", settings.soundEnabled);
    updateSetting("showKeyHints", !settings.showKeyHints);
  };

  const resetToDefaults = () => {
    playAudioCue("reset", settings.soundEnabled);
    saveSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    setGuiScale,
    toggleSound,
    toggleHighContrast,
    toggleReduceMotion,
    toggleShowKeyHints,
    resetToDefaults,
  };
}
