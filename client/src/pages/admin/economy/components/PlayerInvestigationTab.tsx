import React, { useState } from "react";
import { Search, Info } from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";

/**
 * No admin-scoped "look up another identity's wallet" endpoint exists yet
 * — `getEconomyWallet`/`getEconomyLedger` are both caller-scoped ("my own
 * wallet"), not a lookup-by-identity API. An earlier version of this tab
 * called them anyway and relabeled the CALLER's (the signed-in admin's)
 * own real wallet with whatever identity ID was typed into the search box
 * — showing the admin their own balance under a stranger's name. Rather
 * than repeat that (or paper over the gap with fabricated wallet/ledger
 * data), this tab stays deliberately inert until a real lookup-by-identity
 * endpoint exists server-side.
 */
export function PlayerInvestigationTab() {
  const [searchIdentityId, setSearchIdentityId] = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIdentityId.trim()) return;
    setHasSearched(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Identity Search Bar */}
      <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-3">
        <SectionHeader
          title="Player Economy Investigation"
          description="Not yet available — no admin-scoped endpoint exists for looking up another player's wallet by identity ID"
        />

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--chrome-ink-soft)] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchIdentityId}
              onChange={(e) => setSearchIdentityId(e.target.value)}
              placeholder="Enter Player Identity ID (e.g., aaaa-1111-... or guest_8921a)..."
              aria-label="Player identity ID"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-xs font-mono text-[var(--chrome-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={!searchIdentityId.trim()}
            className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-50 transition cursor-pointer shrink-0"
          >
            Lookup Player
          </button>
        </form>
      </div>

      {/* Not-available notice, shown once a search is attempted or on first load */}
      <div className="p-8 text-center text-xs text-[var(--chrome-ink-soft)] bg-[var(--chrome-panel)] rounded-2xl border border-[var(--chrome-border)] space-y-2">
        <Info className="w-8 h-8 text-[var(--chrome-ink-soft)] mx-auto opacity-60" />
        <h4 className="font-bold text-sm text-[var(--chrome-ink)]">Player Lookup Not Yet Available</h4>
        <p className="max-w-md mx-auto leading-relaxed">
          {hasSearched
            ? `No admin-scoped endpoint exists yet to retrieve wallet or ledger data for "${searchIdentityId.trim()}" — only a signed-in identity's own wallet is queryable today.`
            : "This tool will let an operator look up any player's wallet balance, starter grant status, and ledger history by identity ID once a real admin-scoped lookup endpoint is wired up server-side."}
        </p>
      </div>
    </div>
  );
}

export default PlayerInvestigationTab;
