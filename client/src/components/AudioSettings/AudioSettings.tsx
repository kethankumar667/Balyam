import { memo, useCallback } from "react";
import { useAudio } from "../../hooks/useAudio";
import { useTranslation } from "../../hooks/useTranslation";
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
  const { t } = useTranslation();
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
      className={`bg-[var(--room-panel)] border border-[var(--room-panel-edge)] rounded-xl p-4 space-y-4 ${className ?? ""}`}
      aria-label={t("audio.settingsLabel")}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm uppercase tracking-wider text-[var(--room-ink-soft)] font-bold">
          {t("audio.title")}
        </h3>
        <button
          type="button"
          onClick={onMute}
          aria-pressed={settings.isMuted}
          aria-label={settings.isMuted ? t("audio.unmute") : t("audio.mute")}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            settings.isMuted
              ? "bg-[#E6A11E] hover:bg-[#D89215] text-[var(--room-ink)]"
              : "bg-[#31A157] hover:bg-[#2A8B4B] text-white"
          }`}
        >
          {settings.isMuted ? `🔇 ${t("audio.muted")}` : `🔊 ${t("audio.soundOn")}`}
        </button>
      </header>

      {!isAudioUnlocked && (
        <p className="text-[11px] text-[var(--room-ink-mute)] italic">
          {t("audio.unlockHint")}
        </p>
      )}

      <VolumeSlider
        label={t("audio.master")}
        value={settings.masterVolume}
        onChange={a.setMasterVolume}
        disabled={settings.isMuted}
      />
      <VolumeSlider
        label={t("audio.music")}
        value={settings.musicVolume}
        onChange={a.setMusicVolume}
        disabled={settings.isMuted}
      />
      <VolumeSlider
        label={t("audio.effects")}
        value={settings.effectsVolume}
        onChange={a.setEffectsVolume}
        disabled={settings.isMuted}
      />

      <div className="pt-2 border-t border-[var(--room-panel-edge)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[var(--room-ink-soft)] font-bold">
            {t("audio.theme")}
          </span>
          <span className="text-[11px] text-[var(--room-ink-mute)]">
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
                    : "bg-[var(--room-field)] border-[var(--room-field-edge)] text-[var(--room-ink)] hover:border-[#EA5A1F]"
                }`}
              >
                <div className="text-sm font-bold leading-tight">{t.name}</div>
                <div
                  className={`text-[11px] leading-snug mt-0.5 ${
                    active ? "text-white/90" : "text-[var(--room-ink-soft)]"
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
  const { t } = useTranslation();
  const pct = Math.round(value * 100);
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs text-[var(--room-ink-soft)] mb-1">
        <span className="font-bold uppercase tracking-wider">{label}</span>
        <span className={disabled ? "opacity-50" : ""}>{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        disabled={disabled}
        aria-label={t("audio.volumeLabel", { label })}
        onChange={(e) => onChange(Number(e.currentTarget.value) / 100)}
        className="w-full accent-[#EA5A1F] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </label>
  );
}

export const AudioSettings = memo(AudioSettingsImpl);
export default AudioSettings;
