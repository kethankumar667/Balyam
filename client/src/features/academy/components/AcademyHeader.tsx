import React from "react";
import { X, Volume2, VolumeX, BookOpen, Zap, Layers } from "lucide-react";
import type { GameAcademySpec, AcademyMode } from "../types/academy";
import { useAudio } from "../../../hooks/useAudio";
import { readableTextColor } from "../utils/readableTextColor";

interface AcademyHeaderProps {
  spec: GameAcademySpec;
  mode: AcademyMode;
  onSetMode: (mode: AcademyMode) => void;
  onClose: () => void;
  /** Id placed on the game title so the dialog can be named by it in both modes. */
  titleId: string;
}

const MODE_BUTTON_BASE =
  "flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-mono font-bold transition cursor-pointer";
const MODE_BUTTON_ACTIVE = "bg-amber-500 text-amber-950 font-black shadow-md";
const MODE_BUTTON_IDLE = "text-stone-400 hover:text-stone-200";

const MODES: ReadonlyArray<{ mode: AcademyMode; label: string; Icon: typeof BookOpen }> = [
  { mode: "walkthrough", label: "Interactive Guide", Icon: BookOpen },
  { mode: "cheatsheet", label: "Tactical Cheatsheet", Icon: Layers },
];

export const AcademyHeader: React.FC<AcademyHeaderProps> = ({
  spec,
  mode,
  onSetMode,
  onClose,
  titleId,
}) => {
  const { settings, toggleMute } = useAudio();
  const isMuted = settings.isMuted;

  return (
    <div className="flex flex-col gap-3 pb-3 border-b border-stone-800/80 relative z-10">
      <div className="flex items-center justify-between gap-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-md flex-shrink-0"
            style={{ background: spec.primaryAccent, color: readableTextColor(spec.primaryAccent) }}
          >
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id={titleId}
                className="text-base sm:text-lg font-black text-stone-100 tracking-tight truncate"
              >
                {spec.title}
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {spec.genre} · {spec.difficulty}
              </span>
            </div>
            <p className="text-[11px] font-mono text-stone-400 truncate">{spec.tagline}</p>
          </div>
        </div>

        {/* Right Tools: Audio Mute & Close */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition cursor-pointer"
          >
            {isMuted ? (
              <VolumeX aria-hidden="true" className="w-4 h-4" />
            ) : (
              <Volume2 aria-hidden="true" className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close academy"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Switcher: two toggle buttons; the active one reports aria-pressed */}
      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Academy view"
          className="flex items-center gap-1 p-1 bg-stone-950/80 rounded-xl border border-stone-800"
        >
          {MODES.map(({ mode: buttonMode, label, Icon }) => {
            const isActive = mode === buttonMode;
            return (
              <button
                key={buttonMode}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSetMode(buttonMode)}
                className={`${MODE_BUTTON_BASE} ${isActive ? MODE_BUTTON_ACTIVE : MODE_BUTTON_IDLE}`}
              >
                <Icon aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-stone-400">
          <span>{spec.players}</span>
          <span aria-hidden="true">·</span>
          <span>{spec.duration}</span>
        </div>
      </div>
    </div>
  );
};
