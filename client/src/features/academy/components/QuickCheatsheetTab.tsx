import React from "react";
import { Zap, ShieldCheck, Crown, Grid, Target, Flame, Trophy, Orbit } from "lucide-react";
import type { GameAcademySpec, CheatsheetSection } from "../types/academy";

interface QuickCheatsheetTabProps {
  spec: GameAcademySpec;
}

interface SectionIconStyle {
  Icon: typeof Zap;
  color: string;
}

const SECTION_ICONS: Record<CheatsheetSection["iconName"], SectionIconStyle> = {
  Zap: { Icon: Zap, color: "text-amber-400" },
  ShieldCheck: { Icon: ShieldCheck, color: "text-emerald-400" },
  Crown: { Icon: Crown, color: "text-yellow-400" },
  Grid: { Icon: Grid, color: "text-blue-400" },
  Flame: { Icon: Flame, color: "text-rose-400" },
  Trophy: { Icon: Trophy, color: "text-amber-400" },
  Orbit: { Icon: Orbit, color: "text-cyan-400" },
  Target: { Icon: Target, color: "text-cyan-400" },
};

const SectionIcon: React.FC<{ iconName: CheatsheetSection["iconName"] }> = ({ iconName }) => {
  const { Icon, color } = SECTION_ICONS[iconName] ?? SECTION_ICONS.Target;
  return <Icon aria-hidden="true" className={`w-4 h-4 ${color}`} />;
};

export const QuickCheatsheetTab: React.FC<QuickCheatsheetTabProps> = ({ spec }) => {
  return (
    <div className="space-y-4">
      {/* Sections */}
      {spec.cheatsheet.map((section, sectionIdx) => (
        <div
          key={`${sectionIdx}:${section.title}`}
          className="bg-slate-950/60 rounded-2xl border border-stone-800 p-3.5 sm:p-4 space-y-2.5"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
            <SectionIcon iconName={section.iconName} />
            <h3 className="text-xs sm:text-sm font-black text-stone-200 uppercase tracking-wider font-mono">
              {section.title}
            </h3>
          </div>

          <div className="space-y-2">
            {section.items.map((item, itemIdx) => (
              <div
                key={`${itemIdx}:${item.label}`}
                className="flex items-start justify-between gap-3 text-xs font-mono"
              >
                <div className="min-w-0">
                  <span className="font-bold text-stone-200 block">{item.label}</span>
                  <span className="text-[11px] text-stone-400 leading-relaxed block">
                    {item.detail}
                  </span>
                </div>
                {item.tag && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-amber-500/20 flex-shrink-0">
                    {item.tag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Keybindings Reference */}
      {spec.keybindings && spec.keybindings.length > 0 && (
        <div className="bg-slate-950/60 rounded-2xl border border-stone-800 p-3.5 sm:p-4 space-y-2">
          <h3 className="text-xs font-black text-stone-300 uppercase tracking-wider font-mono">
            Game Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {spec.keybindings.map((kb, kbIdx) => (
              <div
                key={`${kbIdx}:${kb.key}`}
                className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800"
              >
                <span className="text-stone-400 text-[11px]">{kb.description}</span>
                <kbd className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 font-bold text-[11px]">
                  {kb.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
