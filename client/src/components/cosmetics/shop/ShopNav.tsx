/**
 * BHALYAM — Cosmetics shop: the page's navigation chrome.
 *
 * `ShopHeader` is the title row: Back, "Shop", the one-line reassurance that nothing here changes how a match plays,
 * and the shopper's coin balance, which is always on screen. `ShopTabs` switches category. `GameVariantSwitch` picks
 * Rummy or UNO for card backs, the one category sold per game.
 *
 * Shared by the desktop and phone layouts; each lays them out its own way.
 */

import type { ReactNode } from "react";
import { ArrowLeft, Coins, Store, Trophy } from "lucide-react";
import { getRegistryCosmetic, type CosmeticCategory, type CosmeticGameScope } from "@shared/cosmetics";
import type { CosmeticsShop } from "../useCosmeticsShop";
import { Button } from "../../../design-system/dls/Buttons";
import { CARD_BACK_SCOPES, SHOP_CATEGORY_TABS } from "../shopLogic";

export interface ShopHeaderProps {
  /** Whole-coin balance as the wallet reports it. */
  balance: string;
  onBack: () => void;
  /** Show "Cosmetic only. Every match stays fair." under the title. The phone shows it by the action instead. */
  showReassurance?: boolean;
}

/** The one-line promise that nothing here changes how a match plays. Always visible somewhere on the page. */
export const REASSURANCE = "Cosmetic only. Every match stays fair.";

/** The showroom section is the one tabpanel the category tabs control. */
export const SHOWROOM_ID = "shop-showroom";
export const shopTabId = (category: CosmeticCategory): string => `shop-tab-${category}`;

export function ShopHeader({ balance, onBack, showReassurance = true }: ShopHeaderProps) {
  const coins = Number(balance || 0).toLocaleString();
  return (
    <div className="flex items-center gap-3">
      <Button variant="chrome" size="iconOnly" aria-label="Back" onClick={onBack} leftIcon={<ArrowLeft className="h-5 w-5" />}>
        Back
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 font-display text-[28px] leading-tight text-ink-hi sm:text-[34px] short-land:text-[24px]">
          <Store className="h-6 w-6 shrink-0 text-orange-600" aria-hidden /> Shop
        </h1>
        <p className="text-[12px] font-medium text-ink-mid sm:text-sm">Collect. Customize. Relive childhood.</p>
        {showReassurance && <p className="text-[13px] leading-snug text-ink-mid sm:text-[14px]">{REASSURANCE}</p>}
      </div>
      <div
        role="status"
        aria-label={`Your balance: ${coins} coins`}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--chrome-hairline)] bg-surface-1 px-4 font-bold tabular-nums text-ink-hi shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
      >
        <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
        <span>{coins}</span>
        <span className="hidden font-medium text-ink-mid sm:inline">coins</span>
      </div>
    </div>
  );
}

export function ShopCollection({ shop }: { shop: CosmeticsShop }) {
  // The admin store grants access by populating ownedIds; it is not an earned collection.
  if (shop.isAdminUser) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <Trophy className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden />
        <div><p className="text-sm font-bold text-ink-hi">Admin Pass</p><p className="text-xs text-ink-mid">All styles available · not earned ownership</p></div>
      </div>
    );
  }
  const items = shop.catalog.filter((item) => item.isActive && getRegistryCosmetic(item.id) &&
    SHOP_CATEGORY_TABS.some((tab) => tab.category === item.category));
  if (shop.errorMessage && !items.length) {
    return <p className="rounded-2xl border border-rose-500/20 px-4 py-3 text-sm text-ink-mid">Collection unavailable. Try reloading the shop.</p>;
  }
  const unlocked = items.filter((item) => item.unlockMethod === "DEFAULT" || shop.ownedIds.has(item.id)).length;
  const percent = items.length ? Math.round(unlocked / items.length * 100) : 0;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <Trophy className="h-7 w-7 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold text-ink-hi">Your collection</p>
          <span className="text-xs font-semibold tabular-nums text-ink-mid">{shop.isLoading ? "Updating…" : `${percent}%`}</span>
        </div>
        <p className="mt-0.5 text-xs text-ink-mid">{shop.isLoading && !items.length ? "Loading collection…" : `${unlocked} / ${items.length} unlocked`}</p>
        <div
          role="progressbar"
          aria-label="Your collection"
          aria-valuemin={0}
          aria-valuemax={items.length || 1}
          aria-valuenow={unlocked}
          aria-valuetext={shop.isLoading ? "Updating collection" : `${unlocked} of ${items.length} unlocked`}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-900/10 dark:bg-white/10"
        >
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

export interface ShopTabsProps {
  selected: CosmeticCategory;
  onSelect: (category: CosmeticCategory) => void;
  /** Phone: the four tabs share the width equally. */
  fill?: boolean;
  /** Sits at the right end of the tab row (desktop: the Rummy/UNO switch for card backs). */
  trailing?: ReactNode;
}

export function ShopTabs({ selected, onSelect, fill = false, trailing }: ShopTabsProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 border-b border-[var(--chrome-hairline)]">
    <div
      role="tablist"
      aria-label="Cosmetic categories"
      className={fill ? "grid min-w-0 flex-1 grid-cols-4" : "flex min-w-0 gap-1"}
    >
      {SHOP_CATEGORY_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = selected === tab.category;
        return (
          <button
            key={tab.category}
            id={shopTabId(tab.category)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={SHOWROOM_ID}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.category)}
            onKeyDown={(e) => {
              const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!step) return;
              e.preventDefault();
              const count = SHOP_CATEGORY_TABS.length;
              const index = SHOP_CATEGORY_TABS.findIndex((candidate) => candidate.category === tab.category);
              const next = SHOP_CATEGORY_TABS[(index + step + count) % count].category;
              onSelect(next);
              document.getElementById(shopTabId(next))?.focus();
            }}
            className={`relative inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-t-xl px-2 text-[13px] short-land:min-h-[44px] font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 sm:px-4 sm:text-[15px] ${
              active ? "bg-amber-500/10 text-ink-hi" : "text-ink-mid hover:bg-amber-500/5 hover:text-ink-hi"
            }`}
          >
            {/* Under 360px four icon+label tabs do not fit; the labels carry it. */}
            <Icon className="hidden h-[18px] w-[18px] shrink-0 min-[360px]:block" aria-hidden />
            <span>{tab.label}</span>
            <span
              aria-hidden
              className={`absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-amber-500 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
            />
          </button>
        );
      })}
    </div>
    {trailing && <div className="shrink-0 py-1">{trailing}</div>}
    </div>
  );
}

export interface GameVariantSwitchProps {
  scope: CosmeticGameScope;
  onSelect: (scope: CosmeticGameScope) => void;
}

/** Card backs are made per game; this picks which game's set the strip lists. */
export function GameVariantSwitch({ scope, onSelect }: GameVariantSwitchProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Card backs for">
      <span className="text-[14px] font-medium text-ink-mid">Card backs for</span>
      {CARD_BACK_SCOPES.map((option) => {
        const active = scope === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(option)}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-[14px] font-semibold capitalize transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
              active
                ? "border-transparent bg-ink-hi text-surface-1"
                : "border-[var(--chrome-hairline)] bg-surface-1 text-ink-mid hover:text-ink-hi"
            }`}
          >
            {option === "uno" ? "UNO" : "Rummy"}
          </button>
        );
      })}
    </div>
  );
}
