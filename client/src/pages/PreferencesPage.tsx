import React, { useState, useEffect } from "react";
import { Sliders, Moon, Sun, Volume2, VolumeX, Music, Smartphone, Globe, Bell, Eye, Check, Sparkles } from "lucide-react";
import SettingsLayout from "../components/layout/SettingsLayout";
import { useTheme, setTheme, type AppTheme } from "../lib/useTheme";
import { useAudio } from "../hooks/useAudio";
import { useHaptics } from "../hooks/useHaptics";
import LanguageSettings from "../components/LanguageSettings/LanguageSettings";

export default function PreferencesPage() {
  const [theme, toggleTheme] = useTheme();
  const { settings: audioSettings, toggleMute, setMasterVolume, setMusicVolume, setEffectsVolume } = useAudio();
  const { enabled: hapticsEnabled, toggle: toggleHaptics } = useHaptics();

  // Local persisted preferences
  const [reduceMotion, setReduceMotion] = useState(() => {
    try {
      return localStorage.getItem("bhalyam.reduce_motion") === "true";
    } catch {
      return false;
    }
  });

  const [autoStart, setAutoStart] = useState(() => {
    try {
      return localStorage.getItem("bhalyam.auto_start") === "true";
    } catch {
      return false;
    }
  });

  const [turnWarning, setTurnWarning] = useState(() => {
    try {
      return localStorage.getItem("bhalyam.turn_warning") !== "false";
    } catch {
      return true;
    }
  });

  const [onlineStatus, setOnlineStatus] = useState(() => {
    try {
      return localStorage.getItem("bhalyam.online_status") !== "false";
    } catch {
      return true;
    }
  });

  const handleToggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try {
      localStorage.setItem("bhalyam.reduce_motion", String(next));
      if (next) {
        document.documentElement.classList.add("reduce-motion");
      } else {
        document.documentElement.classList.remove("reduce-motion");
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleAutoStart = () => {
    const next = !autoStart;
    setAutoStart(next);
    try {
      localStorage.setItem("bhalyam.auto_start", String(next));
    } catch {
      // Ignore
    }
  };

  const handleToggleTurnWarning = () => {
    const next = !turnWarning;
    setTurnWarning(next);
    try {
      localStorage.setItem("bhalyam.turn_warning", String(next));
    } catch {
      // Ignore
    }
  };

  const handleToggleOnlineStatus = () => {
    const next = !onlineStatus;
    setOnlineStatus(next);
    try {
      localStorage.setItem("bhalyam.online_status", String(next));
    } catch {
      // Ignore
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* ── Section 1: Appearance ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <Sun className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-[var(--auth-ink)]">
              Appearance
            </h2>
          </div>

          <div className="space-y-4">
            {/* Theme Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div>
                <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                  Color Theme
                </span>
                <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                  Switch between Warm Parchment and Midnight Gaming Arena
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition border min-h-[40px] cursor-pointer ${
                    theme === "light"
                      ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs"
                      : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)]"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition border min-h-[40px] cursor-pointer ${
                    theme === "dark"
                      ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs"
                      : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)]"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Reduce Motion Toggle */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div>
                <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                  Reduce Motion
                </span>
                <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                  Minimize UI animations and floating particle effects
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleReduceMotion}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  reduceMotion ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                }`}
                role="switch"
                aria-checked={reduceMotion}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                    reduceMotion ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 2: Game Experience & Audio ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <Volume2 className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-[var(--auth-ink)]">
              Game Experience &amp; Audio
            </h2>
          </div>

          <div className="space-y-4">
            {/* Master Sound Effects */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  {audioSettings.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                    Game Sound Effects
                  </span>
                  <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                    Dice rolls, token hops, card snaps, and winner chimes
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  !audioSettings.isMuted ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                }`}
                role="switch"
                aria-checked={!audioSettings.isMuted}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                    !audioSettings.isMuted ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Haptic Vibration */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                    Haptics & Vibration
                  </span>
                  <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                    Tactile thumb pulses on dice rolls and game turns (mobile)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleHaptics}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  hapticsEnabled ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                }`}
                role="switch"
                aria-checked={hapticsEnabled}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                    hapticsEnabled ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Auto Start Next Round */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div>
                <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                  Auto-Start Next Round
                </span>
                <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                  Automatically accept rematch countdowns when all players are ready
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAutoStart}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  autoStart ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                }`}
                role="switch"
                aria-checked={autoStart}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                    autoStart ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 3: Language ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <Globe className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-[var(--auth-ink)]">
              Language & Regional Culture
            </h2>
          </div>

          <LanguageSettings />
        </section>

        {/* ── Section 4: Gameplay Notifications & Privacy ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-[var(--auth-ink)]">
              Gameplay Alerts & Visibility
            </h2>
          </div>

          <div className="space-y-4">
            {/* Turn Warning */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div>
                <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                  10-Second Turn Time Warning
                </span>
                <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                  Pulse screen borders when your turn timer drops below 10 seconds
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleTurnWarning}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  turnWarning ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                }`}
                role="switch"
                aria-checked={turnWarning}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                    turnWarning ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Online Status */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div>
                <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                  Show Online Status in Lounge
                </span>
                <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                  Allow friends and room players to see when you are active
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleOnlineStatus}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  onlineStatus ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
                }`}
                role="switch"
                aria-checked={onlineStatus}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                    onlineStatus ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </div>
    </SettingsLayout>
  );
}
