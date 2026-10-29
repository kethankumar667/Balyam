import { useId } from "react";
import { Crown, Gift, Orbit, Users } from "lucide-react";
import { NOSTALGIA_PACK, type ReferralOverview } from "@shared/referrals";
import { packNodes } from "./crewProgress";
import { HEADING, MUTED, PANEL_PURPLE } from "./crewStyles";

/** A treasure chest whose lid glows gold once the pack is unlocked and only faintly while it is not. */
function VaultChest({ unlocked }: { unlocked: boolean }) {
  const glowId = useId();
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 160 120" className="mx-auto h-28 w-auto sm:h-32">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd76a" stopOpacity={unlocked ? 0.95 : 0.35} />
          <stop offset="1" stopColor="#ffb800" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="108" rx="62" ry="7" fill="#000" opacity=".4" />
      <ellipse cx="80" cy="50" rx="62" ry="26" fill={`url(#${glowId})`} />
      <path d="M20 60Q20 22 80 22t60 38Z" fill="#7a3d18" stroke="#ffb800" strokeWidth="2" />
      <rect x="20" y="58" width="120" height="46" rx="6" fill="#5a2a10" stroke="#ffb800" strokeWidth="2" />
      <rect x="20" y="54" width="120" height="10" fill="#ffb800" opacity=".9" />
      <rect x="44" y="30" width="8" height="74" fill="#ffb800" opacity=".75" />
      <rect x="108" y="30" width="8" height="74" fill="#ffb800" opacity=".75" />
      <rect x="70" y="50" width="20" height="26" rx="4" fill="#ffd76a" stroke="#8a5a10" strokeWidth="1.5" />
      <circle cx="80" cy="62" r="3.5" fill="#5a2a10" />
      <rect x="78.5" y="62" width="3" height="8" rx="1.5" fill="#5a2a10" />
    </svg>
  );
}

const KIND = ["aura", "title", "theme"] as const;
const CAPTION = ["Avatar aura", "Podium title", "Table theme"] as const;

/** One reward as a small collectible: in full colour once unlocked, a dim silhouette until then. */
function RewardArt({ kind, unlocked }: { kind: (typeof KIND)[number]; unlocked: boolean }) {
  const tone = unlocked ? "border-[#ffb800] text-amber-700 dark:text-[#ffd76a]" : "border-slate-500/60 text-slate-500";
  return (
    <span aria-hidden="true" className={`relative flex h-16 w-full items-center justify-center overflow-hidden rounded-xl border bg-slate-900/10 dark:bg-black/25 ${unlocked ? "border-[#ffb800]/60" : "border-slate-500/40"}`}>
      {kind === "aura" ? (
        <>
          <span className={`absolute h-11 w-11 rounded-full border-[3px] ${tone}`} />
          <Orbit size={22} strokeWidth={1.4} className={unlocked ? "text-amber-700 dark:text-[#ffd76a]" : "text-slate-500"} />
        </>
      ) : kind === "title" ? (
        <span className={`flex h-12 w-10 flex-col items-center justify-center rounded-b-2xl border ${tone}`}>
          <Crown size={20} />
          <Users size={12} />
        </span>
      ) : (
        <span className={`flex h-11 w-14 -rotate-6 items-center justify-center rounded border-4 font-script text-lg ${unlocked ? "border-[#ab8552] bg-[#29413a] text-[#e1eadd]" : "border-slate-600 bg-slate-800 text-slate-500"}`}>a b c</span>
      )}
    </span>
  );
}

/**
 * The pack the invited friends add up to. Only rewards that exist are shown (the three in `NOSTALGIA_PACK`), dim until
 * the target is met, and the chest stays quiet until the pack is truly unlocked.
 */
export function NostalgiaVault({ pack }: { pack: ReferralOverview["pack"] }) {
  const { filled, total, remaining } = packNodes(pack);
  return (
    <section aria-labelledby="crew-pack-title" className={PANEL_PURPLE}>
      <h2 id="crew-pack-title" className={HEADING}>
        <Gift size={15} aria-hidden="true" className="text-violet-700 dark:text-purple-300" /> Nostalgia pack
      </h2>
      <p className={`m-0 mt-1 text-xs ${MUTED}`}>
        {pack.granted ? "Unlocked. The Nostalgia Pack is in your collection." : `Play with ${pack.target} friends to unlock this exclusive pack!`}
      </p>

      <div className="mt-3">
        <VaultChest unlocked={pack.granted} />
      </div>

      <ul className="m-0 mt-2 grid list-none grid-cols-3 gap-2 p-0">
        {NOSTALGIA_PACK.map((item, index) => (
          <li key={item.id} className="min-w-0 text-center">
            <RewardArt kind={KIND[index] ?? "theme"} unlocked={pack.granted} />
            <p className={`m-0 mt-1.5 text-[11px] font-bold leading-tight ${pack.granted ? "text-amber-700 dark:text-[#ffd76a]" : "text-slate-600 dark:text-[#b6c4d8]"}`}>{item.name}</p>
            <p className={`m-0 text-[11px] leading-tight ${MUTED}`}>{CAPTION[index]}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="Friends who qualified"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={filled}
          className="flex items-center"
        >
          {Array.from({ length: total }, (_, index) => {
            const isFilled = index < filled;
            return (
              <div key={index} className="contents">
                <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${isFilled ? "border-[#ffb800] bg-[#ffb800] shadow-[0_0_12px_rgba(255,184,0,0.7)]" : "border-slate-500 bg-transparent"}`} />
                {index < total - 1 && <span className={`h-0.5 flex-1 ${index < filled - 1 ? "bg-[#ffb800]" : "bg-slate-300 dark:bg-slate-600"}`} />}
              </div>
            );
          })}
        </div>
        <p className="m-0 mt-3 text-center text-sm font-bold text-slate-900 dark:text-white">
          {filled} / {total} crew matches completed
        </p>
        <p className={`m-0 mt-0.5 text-center text-xs ${MUTED}`}>
          {pack.granted || remaining === 0 ? "Every crew match is in." : `${remaining} more qualifying crew ${remaining === 1 ? "match" : "matches"} to unlock`}
        </p>
      </div>
    </section>
  );
}
