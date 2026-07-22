import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard, SketchAccent } from "../components";
import { RULE_SECTIONS } from "../content";

/**
 * Match Rules — a notebook "chapter" of how to play rather than a popup. Each
 * rule is an illustrated card. Continue moves to the Match Intro.
 */
export function MatchRulesPage() {
  const navigate = useNavigate();
  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={() => navigate("/cricket/intro")}
          className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-lg font-black text-white shadow-md transition active:scale-95"
        >
          Got it, let&rsquo;s play!
        </button>
      }
    >
      <NotebookSurface withSpiral className="my-2 px-5 py-6">
        <header className="text-center">
          <h1 className="font-display text-3xl text-[#3A2210]">How to Play</h1>
          <p className="mt-1 text-sm text-[#6D4323]/80">A quick chapter before the first ball.</p>
        </header>

        <ul className="mt-5 space-y-3">
          {RULE_SECTIONS.map((rule) => (
            <PremiumCard as="li" key={rule.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#F7E8C4] text-[#9A6E1A]">
                <SketchAccent name={rule.sketch} className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="font-black text-[#3A2210]">{rule.title}</h2>
                <p className="text-sm text-[#6D4323]/85">{rule.body}</p>
              </div>
            </PremiumCard>
          ))}
        </ul>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchRulesPage;
