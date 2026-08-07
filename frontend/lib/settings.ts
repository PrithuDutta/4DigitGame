export interface GameSettings {
  guiScale: number; // e.g. 0.85, 1.0, 1.15, 1.30
  soundEnabled: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  showKeyHints: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  guiScale: 1.0,
  soundEnabled: true,
  highContrast: false,
  reduceMotion: false,
  showKeyHints: true,
};

const STORAGE_KEY = "4digit_game_settings";

let cachedRaw: string | null | undefined = undefined;
let cachedSettings: GameSettings = DEFAULT_SETTINGS;

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw && cachedSettings) {
      return cachedSettings;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    cachedSettings = {
      guiScale: typeof parsed.guiScale === "number" && parsed.guiScale >= 0.75 && parsed.guiScale <= 1.5 ? parsed.guiScale : DEFAULT_SETTINGS.guiScale,
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      highContrast: typeof parsed.highContrast === "boolean" ? parsed.highContrast : DEFAULT_SETTINGS.highContrast,
      reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
      showKeyHints: typeof parsed.showKeyHints === "boolean" ? parsed.showKeyHints : DEFAULT_SETTINGS.showKeyHints,
    };
    return cachedSettings;
  } catch {
    cachedSettings = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings) {
  if (typeof window === "undefined") return;
  try {
    const str = JSON.stringify(settings);
    localStorage.setItem(STORAGE_KEY, str);
    cachedRaw = str;
    cachedSettings = settings;
    applySettingsToDOM(settings);
    window.dispatchEvent(new Event("4digit_settings_changed"));
  } catch {
    // ignore
  }
}


export function applySettingsToDOM(settings: GameSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Scale root font-size for rem-based units, and set CSS variable + zoom style on root
  root.style.fontSize = `${settings.guiScale * 100}%`;
  root.style.setProperty("--gui-scale", settings.guiScale.toString());

  // High contrast mode class
  if (settings.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  // Reduced motion class
  if (settings.reduceMotion) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }
}

// Web Audio API subtle synth cues for UI feedback (zero asset dependency)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playAudioCue(type: "click" | "scale" | "toggle" | "reset", soundEnabled: boolean) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "scale") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "toggle") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "reset") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(250, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch {
    // ignore audio errors (e.g. browser policy before user gesture)
  }
}
