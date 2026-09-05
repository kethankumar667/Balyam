import React, { useState } from "react";
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Music,
  Smartphone,
  Globe,
  Bell,
  Sparkles,
  Zap,
  Check,
  Radio,
  Sliders,
} from "lucide-react";
import SettingsLayout from "../components/layout/SettingsLayout";
import { useTheme, setTheme } from "../lib/useTheme";
import { useAudio } from "../hooks/useAudio";
import { useHaptics } from "../hooks/useHaptics";
import { HapticsManager } from "../services/HapticsManager";
import LanguageSettings from "../components/LanguageSettings/LanguageSettings";
import { AUDIO } from "../constants/audio";

export default function PreferencesPage() {
  const [theme] = useTheme();
  const {
    settings: audioSettings,
    toggleMute,
    setMasterVolume,
    setMusicVolume,
    setEffectsVolume,
    play,
  } = useAudio();
  const { enabled: hapticsEnabled, toggle: toggleHaptics } = useHaptics();

  const [testPulseActive, setTestPulseActive] = useState(false);

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

  const handleTestHaptics = () => {
    HapticsManager.getInstance().win();
    try {
      play(AUDIO.UI_CLICK);
    } catch {
      // Audio optional
    }
    setTestPulseActive(true);
    setTimeout(() => setTestPulseActive(false), 800);
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* ── Section 1: Appearance & Theme ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/20 dark:via-transparent dark:to-orange-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-5 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shadow-xs">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                    Appearance &amp; Environment
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                    Select your visual atmosphere and accessibility comfort
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-stone-400 dark:text-slate-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Display
              </span>
            </div>

            {/* Theme Visual Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Light Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  theme === "light"
                    ? "border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                    : "border-stone-200/80 dark:border-white/10 bg-stone-50/60 dark:bg-[#151c2e] hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 dark:text-white block">
                        Warm Parchment
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-slate-400">
                        Nostalgic board game paper
                      </span>
                    </div>
                  </div>
                  {theme === "light" && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Color Swatch Mockup */}
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#FFFDF9] border border-stone-200/60 shadow-xs">
                  <div className="w-4 h-4 rounded-md bg-[#FFF7ED] border border-[#FFEDD5]" />
                  <div className="w-4 h-4 rounded-md bg-[#FAF5FF] border border-[#F3E8FF]" />
                  <div className="w-4 h-4 rounded-md bg-[#F0FDF4] border border-[#DCFCE7]" />
                  <div className="ml-auto text-[9px] font-mono font-bold text-stone-500">
                    Daylight
                  </div>
                </div>
              </button>

              {/* Dark Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  theme === "dark"
                    ? "border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                    : "border-stone-200/80 dark:border-white/10 bg-stone-50/60 dark:bg-[#151c2e] hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center border border-indigo-800/40">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 dark:text-white block">
                        Midnight Arena
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-slate-400">
                        High-contrast lounge night
                      </span>
                    </div>
                  </div>
                  {theme === "dark" && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Color Swatch Mockup */}
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#0B0F19] border border-stone-800 shadow-xs">
                  <div className="w-4 h-4 rounded-md bg-[#161F36] border border-[#232F52]" />
                  <div className="w-4 h-4 rounded-md bg-[#1F1735] border border-[#37245B]" />
                  <div className="w-4 h-4 rounded-md bg-[#102B21] border border-[#1B4B39]" />
                  <div className="ml-auto text-[9px] font-mono font-bold text-stone-400">
                    OLED Dark
                  </div>
                </div>
              </button>
            </div>

            {/* Reduce Motion Switch Row */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Reduce Motion &amp; Animations
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    Disable floating celebratory particles and intense screen transitions
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleReduceMotion}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
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
        </div>

        {/* ── Section 2: Audio Soundscapes & Precision Sliders ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-emerald-500/20 dark:via-transparent dark:to-cyan-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-5 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center justify-center shadow-xs">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                    Soundscapes &amp; Volume Control
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                    Adjust game sound effects, background melodies, and global master mute
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  audioSettings.isMuted
                    ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/40"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/40"
                }`}
              >
                {audioSettings.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{audioSettings.isMuted ? "Muted" : "Active"}</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Master Volume Slider */}
              <div className="p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>Master Volume</span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                    {Math.round(audioSettings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-stone-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Music Volume Slider */}
              <div className="p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                    <Music className="w-3.5 h-3.5 text-purple-500" />
                    <span>Background Music</span>
                  </div>
                  <span className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
                    {Math.round(audioSettings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-stone-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Sound Effects Volume Slider */}
              <div className="p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gameplay Sound Effects</span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {Math.round(audioSettings.effectsVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.effectsVolume}
                  onChange={(e) => setEffectsVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-stone-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Tactile Haptics & Vibration ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-purple-500/20 dark:via-transparent dark:to-pink-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/30 flex items-center justify-center shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                    Haptics &amp; Tactile Feedback
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                    Subtle physical micro-pulses on dice rolls, card clicks, and winning moves
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleHaptics}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  hapticsEnabled ? "bg-purple-600" : "bg-stone-300 dark:bg-stone-700"
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

            {/* Test Haptics Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Hardware Vibration Test
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                  Triggers victory micro-burst pattern on supported mobile and handheld devices
                </span>
              </div>

              <button
                type="button"
                onClick={handleTestHaptics}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs min-h-[40px] shrink-0 ${
                  testPulseActive
                    ? "bg-purple-600 text-white scale-105"
                    : "bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-700"
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${testPulseActive ? "text-amber-300 animate-bounce" : "text-purple-500"}`} />
                <span>{testPulseActive ? "Pulsing..." : "Test Pulse"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 4: Language & Regional Culture ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/20 dark:via-transparent dark:to-orange-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center gap-2.5 border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shadow-xs">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                  Language &amp; Regional Culture
                </h2>
                <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                  Switch between 7 languages with authentic Indian cultural terminology
                </p>
              </div>
            </div>

            <LanguageSettings />
          </div>
        </div>

        {/* ── Section 5: Gameplay Automation & Alerts ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-blue-500/20 dark:via-transparent dark:to-cyan-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center gap-2.5 border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 border border-blue-200/60 dark:border-blue-500/30 flex items-center justify-center shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                  Gameplay Alerts &amp; Automation
                </h2>
                <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                  Rematch automation and time warning signals
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Turn Warning */}
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    10-Second Turn Time Warning
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    Pulse screen borders when your turn timer drops below 10 seconds
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleTurnWarning}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
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

              {/* Auto Start Next Round */}
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Auto-Start Next Round
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    Automatically accept rematch countdowns when all players are ready
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAutoStart}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
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

              {/* Online Status */}
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Show Online Status in Lounge
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    Allow friends and room players to see when you are active
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleOnlineStatus}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
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
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
