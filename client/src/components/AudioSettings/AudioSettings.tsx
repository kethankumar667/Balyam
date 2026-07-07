import { memo, useCallback } from "react";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO, type AudioThemeId } from "../../constants/audio";
import { THEMES } from "../../assets/audio/themes/manifests";

/**
 * Drop-in settings panel that talks to the AudioManager via useAudio().
 * Safe to mount inside any sheet, modal, or drawer — has no external
 * dependencies and uses only Tailwind classes already in the BHALYAM
 * design system.
 *
 *   <AudioSettings />
 *   <AudioSettings className="my-extra-classes" />
 *
 * The component is memoized so embedders can re-render their own state
 * without thrashing the audio panel.
 */
function AudioSettingsImpl({ className }: { className?: string }) {
  const a = useAudio();
  const { settings, isAudioUnlocked } = a;

  // Wired-up handlers — small click-feedback on toggles + theme picks.
  const onMute = useCallback(() => {
    a.toggleMute();
    a.play(AUDIO.UI_TOGGLE);
  }, [a]);

  const onTheme = useCallback(
    (id: AudioThemeId) => {
      a.setAudioTheme(id);
      a.play(AUDIO.UI_CLICK);
    },
    [a],
  );

  return (
    <section
      className={`bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 space-y-4 dark:bg-slate-900 dark:border-slate-700 ${className ?? ""}`}
      aria-label="Audio settings"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm uppercase tracking-wider text-[#7A6652] font-bold dark:text-slate-400">
          Audio
        </h3>
        <button
          type="button"
          onClick={onMute}
          aria-pressed={settings.isMuted}
          aria-label={settings.isMuted ? "Unmute audio" : "Mute audio"}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            settings.isMuted
              ? "bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118] dark:text-slate-300"
              : "bg-[#31A157] hover:bg-[#2A8B4B] text-white"
          }`}
        >
          {settings.isMuted ? "🔇 Muted" : "🔊 Sound on"}
        </button>
      </header>

      {!isAudioUnlocked && (
        <p className="text-[11px] text-[#7A6652] italic dark:text-slate-500">
          Tap anywhere to enable sound — browsers block audio until you
          interact with the page.
        </p>
      )}

      <VolumeSlider
        label="Master"
        value={settings.masterVolume}
        onChange={a.setMasterVolume}
        disabled={settings.isMuted}
      />
      <VolumeSlider
        label="Music"
        value={settings.musicVolume}
        onChange={a.setMusicVolume}
        disabled={settings.isMuted}
      />
      <VolumeSlider
        label="Effects"
        value={settings.effectsVolume}
        onChange={a.setEffectsVolume}
        disabled={settings.isMuted}
      />

      <div className="pt-2 border-t border-[#E6D4B7] space-y-2 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[#7A6652] font-bold dark:text-slate-400">
            Audio theme
          </span>
          <span className="text-[11px] text-[#9B8770] dark:text-slate-500">
            {THEMES.find((t) => t.id === settings.selectedAudioTheme)?.name}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {THEMES.map((t) => {
            const active = t.id === settings.selectedAudioTheme;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTheme(t.id)}
                aria-pressed={active}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                  active
                    ? "bg-[#EA5A1F] border-[#D84F17] text-white"
                    : "bg-[#FFF9EE] border-[#DCC8A6] text-[#352C24] hover:border-[#EA5A1F] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                }`}
              >
                <div className="text-sm font-bold leading-tight">{t.name}</div>
                <div
                  className={`text-[11px] leading-snug mt-0.5 ${
                    active ? "text-white/90" : "text-[#7A6652] dark:text-slate-400"
                  }`}
                >
                  {t.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const pct = Math.round(value * 100);
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs text-[#5C4A38] mb-1 dark:text-slate-300">
        <span className="font-bold uppercase tracking-wider">{label}</span>
        <span className={disabled ? "opacity-50" : ""}>{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        disabled={disabled}
        aria-label={`${label} volume`}
        onChange={(e) => onChange(Number(e.currentTarget.value) / 100)}
        className="w-full accent-[#EA5A1F] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </label>
  );
}

export const AudioSettings = memo(AudioSettingsImpl);
export default AudioSettings;
