import { memo, useCallback } from "react";
import { useAudio } from "../../hooks/useAudio";
import { useHaptics } from "../../hooks/useHaptics";
import { AUDIO, type AudioThemeId } from "../../constants/audio";
import { THEMES } from "../../assets/audio/themes/manifests";

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
function GlobalSettingsImpl({ className }: { className?: string }) {
  const a = useAudio();
  const h = useHaptics();
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
      className={`bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 space-y-5 ${className ?? ""}`}
      aria-label="Global settings"
    >
      {/* ── Sound ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-wider text-[#7A6652] font-bold">
            Sound
          </h3>
          <ToggleSwitch
            checked={!settings.isMuted}
            onChange={onMuteSound}
            onLabel="On"
            offLabel="Muted"
            ariaLabel={settings.isMuted ? "Unmute sound" : "Mute sound"}
          />
        </header>

        {!isAudioUnlocked && (
          <p className="text-[11px] text-[#7A6652] italic">
            Tap anywhere to enable sound — browsers block audio until you interact with the page.
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
      </div>

      {/* ── Vibration ───────────────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-[#E6D4B7]">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-wider text-[#7A6652] font-bold">
            Vibration
          </h3>
          <ToggleSwitch
            checked={h.enabled}
            disabled={!h.supported}
            onChange={onToggleHaptics}
            onLabel="On"
            offLabel="Off"
            ariaLabel={h.enabled ? "Disable vibration" : "Enable vibration"}
          />
        </header>
        <p className="text-[11px] text-[#7A6652] leading-snug">
          {h.supported
            ? "Short buzz when it's your turn in any game."
            : "Your device or browser doesn't support vibration."}
        </p>
      </div>

      {/* ── Audio theme ─────────────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-[#E6D4B7]">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[#7A6652] font-bold">
            Audio theme
          </span>
          <span className="text-[11px] text-[#9B8770]">
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
                    : "bg-[#FFF9EE] border-[#DCC8A6] text-[#352C24] hover:border-[#EA5A1F]"
                }`}
              >
                <div className="text-sm font-bold leading-tight">{t.name}</div>
                <div
                  className={`text-[11px] leading-snug mt-0.5 ${
                    active ? "text-white/90" : "text-[#7A6652]"
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
  const pct = Math.round(value * 100);
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs text-[#5C4A38] mb-1">
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
      className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
        disabled
          ? "bg-[#E5D6BD] text-[#9B8770] cursor-not-allowed"
          : checked
            ? "bg-[#31A157] hover:bg-[#2A8B4B] text-white"
            : "bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118]"
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
