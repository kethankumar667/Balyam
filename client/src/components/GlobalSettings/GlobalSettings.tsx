import { memo, useCallback } from "react";
import { useAudio } from "../../hooks/useAudio";
import { useHaptics } from "../../hooks/useHaptics";
import { useTranslation } from "../../hooks/useTranslation";
import { AUDIO, type AudioThemeId } from "../../constants/audio";
import { THEMES } from "../../assets/audio/themes/manifests";
import LanguageSettings from "../LanguageSettings/LanguageSettings";

/**
 * Application-wide preferences panel. Holds independent toggles for
 * sound and vibration — the user asked for these as separate switches
 * since they're separate sensory channels (e.g. someone in a quiet
 * room may want vibration ON and sound OFF, or vice versa during
 * shared play with friends).
 *
 * Mount inside any sheet/modal — has no positioning of its own.
 *
 *   <GlobalSettings />
 *
 * The panel is memoized so the embedding sheet's other state changes
 * don't thrash it.
 */
function GlobalSettingsImpl({
  className,
  /** Drop this panel's own card chrome — the host page supplies it. */
  bare = false,
}: {
  className?: string;
  bare?: boolean;
}) {
  const a = useAudio();
  const h = useHaptics();
  const { t } = useTranslation();
  const { settings, isAudioUnlocked } = a;

  const onMuteSound = useCallback(() => {
    a.toggleMute();
    a.play(AUDIO.UI_TOGGLE);
  }, [a]);

  const onToggleHaptics = useCallback(() => {
    h.toggle();
    // Give immediate feedback if we just enabled it.
    if (!h.enabled) h.subtle();
  }, [h]);

  const onTheme = useCallback(
    (id: AudioThemeId) => {
      a.setAudioTheme(id);
      a.play(AUDIO.UI_CLICK);
    },
    [a],
  );

  return (
    <section
      className={`space-y-5 ${
        bare
          ? ""
          : "bg-[var(--room-panel)] border border-[var(--room-panel-edge)] rounded-xl p-4"
      } ${className ?? ""}`}
      aria-label={t("settings.label")}
    >
      {/* ── Sound ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-wider text-[var(--room-ink-soft)] font-bold">
            {t("sound.title")}
          </h3>
          <ToggleSwitch
            checked={!settings.isMuted}
            onChange={onMuteSound}
            onLabel={t("common.on")}
            offLabel={t("audio.muted")}
            ariaLabel={settings.isMuted ? t("sound.unmute") : t("sound.mute")}
          />
        </header>

        {!isAudioUnlocked && (
          <p className="text-[11px] text-[var(--room-ink-soft)] italic">
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
      </div>

      {/* ── Vibration ───────────────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-[var(--room-panel-edge)]">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-wider text-[var(--room-ink-soft)] font-bold">
            {t("vibration.title")}
          </h3>
          <ToggleSwitch
            checked={h.enabled}
            disabled={!h.supported}
            onChange={onToggleHaptics}
            onLabel={t("common.on")}
            offLabel={t("common.off")}
            ariaLabel={h.enabled ? t("vibration.disable") : t("vibration.enable")}
          />
        </header>
        <p className="text-[11px] text-[var(--room-ink-soft)] leading-snug">
          {h.supported ? t("vibration.hint") : t("vibration.unsupported")}
        </p>
      </div>

      {/* ── Audio theme ─────────────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-[var(--room-panel-edge)]">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[var(--room-ink-soft)] font-bold">
            {t("audio.theme")}
          </span>
          <span className="text-[11px] text-[var(--room-ink-soft)]">
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

      {/* ── Language ────────────────────────────────────────────── */}
      <LanguageSettings embedded />

    </section>
  );
}

/* ── Internal pieces ─────────────────────────────────────────────── */

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
        /* h-11 gives the 44px target WCAG 2.5.8 asks for; the painted track
           stays slim because a range input draws its own. */
        className="w-full h-11 accent-[#EA5A1F] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </label>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  onLabel,
  offLabel,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  onLabel: string;
  offLabel: string;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      disabled={disabled}
      className={`inline-flex items-center gap-2 text-xs font-bold px-3 min-h-[44px] rounded-full transition-colors ${
        disabled
          ? "bg-[var(--room-chip)] text-[var(--room-ink-soft)] cursor-not-allowed"
          : checked
            ? "bg-[#31A157] hover:bg-[#2A8B4B] text-white"
            : "bg-[#E6A11E] hover:bg-[#D89215] text-[var(--room-ink)]"
      }`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: checked ? "#FFFFFF" : "#2B2118" }}
      />
      {checked ? onLabel : offLabel}
    </button>
  );
}

export const GlobalSettings = memo(GlobalSettingsImpl);
export default GlobalSettings;
