import {
  LUDO_THEMES,
  LUDO_THEME_LABELS,
  LUDO_THEME_SWATCH,
  useLudoSettings,
} from "./settings";

export default function SettingsMenu({ onClose }: { onClose: () => void }) {
  const [s, update] = useLudoSettings();
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Display settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <Section title="Board theme">
          <div className="grid grid-cols-3 gap-2">
            {LUDO_THEMES.map((t) => {
              const [field, ink] = LUDO_THEME_SWATCH[t];
              const active = s.theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ theme: t })}
                  aria-pressed={active}
                  className={`rounded-lg overflow-hidden text-sm font-semibold transition border ${
                    active
                      ? "ring-2 ring-amber-400 scale-105 border-amber-400"
                      : "border-slate-600 hover:border-slate-400"
                  }`}
                >
                  {/* Swatch shows the actual field colour with a grid-ink bar,
                      so the tile previews the board rather than just naming it. */}
                  <span className="block h-8 w-full" style={{ background: field }}>
                    <span className="block h-2 w-full" style={{ background: ink }} />
                  </span>
                  <span className="block py-1.5 bg-slate-900/80 text-slate-100">
                    {LUDO_THEME_LABELS[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Toggle
          label="Color-blind shapes"
          desc="Adds unique pattern to each color's tokens."
          value={s.colorBlindMode}
          onChange={(v) => update({ colorBlindMode: v })}
        />
        <Toggle
          label="High contrast"
          desc="Stronger borders and brighter text for visibility."
          value={s.highContrast}
          onChange={(v) => update({ highContrast: v })}
        />
        <Toggle
          label="Hover preview"
          desc="Show destination cell when hovering a movable token."
          value={s.showHoverPreview}
          onChange={(v) => update({ showHoverPreview: v })}
        />
        <Toggle
          label="Reduce motion"
          desc="Calms confetti, emoji rain, and the step-by-step token walk."
          value={s.reducedMotion}
          onChange={(v) => update({ reducedMotion: v })}
        />
        <Toggle
          label="Golden tokens"
          desc="Brass/gold finish on every token, regardless of color."
          value={s.goldenTokens}
          onChange={(v) => update({ goldenTokens: v })}
        />
        <Toggle
          label="Wooden dice"
          desc="Warm wood-tone dice instead of the classic white face."
          value={s.woodenDice}
          onChange={(v) => update({ woodenDice: v })}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 bg-slate-900/70 rounded-lg p-3">
      <div className="flex-1">
        <div className="text-sm font-semibold">{label}</div>
        {desc && <div className="text-xs text-slate-400">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition relative ${
          value ? "bg-emerald-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${
            value ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}

