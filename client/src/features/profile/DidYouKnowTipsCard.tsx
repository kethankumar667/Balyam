import React from "react";
import { Lightbulb, Sparkles } from "lucide-react";

export default function DidYouKnowTipsCard() {
  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-3xl p-5 space-y-3 relative overflow-hidden shadow-xs">
      <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs">
        <Lightbulb className="w-4 h-4" />
        <span>Did You Know?</span>
      </div>
      <p className="text-xs text-[var(--auth-ink)] leading-relaxed">
        In traditional Indian <strong>Ludo</strong>, cutting an opponent&apos;s token awards you a bonus die roll. In <strong>Rummy</strong>, maintaining at least one pure sequence is mandatory before making a valid declaration!
      </p>
      <div className="flex items-center gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold pt-1">
        <Sparkles className="w-3 h-3" />
        <span>BHALYAM 90s Gaming Lounge</span>
      </div>
    </div>
  );
}
