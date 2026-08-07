"use client";

import { useSettings } from "@/lib/useSettings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GUI_PRESETS = [
  { label: "Small", scale: 0.85 },
  { label: "Medium", scale: 1.0 },
  { label: "Large", scale: 1.15 },
  { label: "Extra Large", scale: 1.3 },
];

export default function SettingsDialog({ isOpen, onClose }: Props) {
  const {
    settings,
    setGuiScale,
    toggleSound,
    toggleHighContrast,
    toggleReduceMotion,
    toggleShowKeyHints,
    resetToDefaults,
  } = useSettings();

  if (!isOpen) return null;

  const currentPercent = Math.round(settings.guiScale * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity">
      <div
        className="relative flex w-full max-w-md flex-col rounded-2xl border border-[#202738] bg-[#131722] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#202738] pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-lg font-bold tracking-wide text-white">
              Game Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* GUI Size Setting */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-200">
                  GUI Size / Scale
                </label>
                <p className="text-xs text-slate-400">
                  Adjust UI elements, text, and layout proportions.
                </p>
              </div>
              <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs font-bold text-indigo-400">
                {currentPercent}%
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-2">
              {GUI_PRESETS.map((preset) => {
                const isSelected = Math.abs(settings.guiScale - preset.scale) < 0.02;
                return (
                  <button
                    key={preset.label}
                    onClick={() => setGuiScale(preset.scale)}
                    className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 text-center transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-500/10"
                        : "border-[#202738] bg-[#0b0d14] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs font-bold">{preset.label}</span>
                    <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                      {Math.round(preset.scale * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Granular Slider */}
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-[10px] text-slate-500">75%</span>
              <input
                type="range"
                min="0.75"
                max="1.4"
                step="0.05"
                value={settings.guiScale}
                onChange={(e) => setGuiScale(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
              />
              <span className="font-mono text-[10px] text-slate-500">140%</span>
            </div>
          </div>

          <div className="h-[1px] w-full bg-[#202738]" />

          {/* Preferences & Toggles */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Preferences
            </h3>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  Sound Effects
                </span>
                <p className="text-xs text-slate-400">
                  Play subtle audio cues for buttons and scale adjustments.
                </p>
              </div>
              <button
                onClick={toggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.soundEnabled ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* High Contrast Mode */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  High Contrast Mode
                </span>
                <p className="text-xs text-slate-400">
                  Increase text contrast and element outlines for readability.
                </p>
              </div>
              <button
                onClick={toggleHighContrast}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.highContrast ? "bg-cyan-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.highContrast ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  Reduced Motion
                </span>
                <p className="text-xs text-slate-400">
                  Disable transitions and fast visual animations.
                </p>
              </div>
              <button
                onClick={toggleReduceMotion}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.reduceMotion ? "bg-amber-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.reduceMotion ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Keybind Hints */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  Keybind Hints
                </span>
                <p className="text-xs text-slate-400">
                  Display hotkey tags (e.g. [ENTER], [SHIFT]) on mode options.
                </p>
              </div>
              <button
                onClick={toggleShowKeyHints}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.showKeyHints ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.showKeyHints ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-[#202738] pt-4">
          <button
            onClick={resetToDefaults}
            className="text-xs font-semibold text-slate-400 underline-offset-4 hover:text-rose-400 hover:underline"
          >
            Reset Defaults
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
