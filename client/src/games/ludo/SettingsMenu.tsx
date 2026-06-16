import { useLudoSettings } from "./settings";

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
            {(["classic", "neon", "paper"] as const).map((t) => (
              <button
                key={t}
                onClick={() => update({ theme: t })}
                className={`rounded-lg p-3 text-sm font-semibold capitalize transition ${
                  s.theme === t ? "ring-2 ring-amber-400 scale-105" : "hover:bg-slate-700"
                }`}
                style={{ background: themePreviewBg(t) }}
              >
                {t}
              </button>
            ))}
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

function themePreviewBg(theme: "classic" | "neon" | "paper"): string {
  switch (theme) {
    case "classic":
      return "linear-gradient(135deg, #fafafa 0%, #e5e7eb 100%)";
    case "neon":
      return "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
    case "paper":
      return "linear-gradient(135deg, #f5f0e8, #d6cdb8)";
  }
}
