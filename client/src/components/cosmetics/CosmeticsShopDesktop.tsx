/**
 * BHALYAM — Cosmetics Boutique, desktop / tablet layout ("Enchanted Display Vault").
 *
 * The shop is a page now (`/shop`, see pages/ShopPage.tsx), not a modal. This is the layout for viewports
 * >= 768px: marquee header, category tabs, then a two-column body — the preview stage on the left, the
 * collection on the right. Mobile has its own tree (CosmeticsStoreMobile). State and actions come in through
 * `shop` (useCosmeticsShop), so this file is layout only.
 *
 * Differences from the modal it replaces, all because a page scrolls and a dialog did not:
 *   - The page scrolls, not an inner box, so the collection grid has no scroll container of its own.
 *   - The preview column is `sticky`: it stays in view while a long grid scrolls past, which is what the
 *     modal's "scroll the preview back into view on select" workaround was standing in for.
 *   - The panel does NOT clip overflow (`overflow-hidden` on an ancestor turns it into the scroll container
 *     and silently disables `sticky`). The decorative glows live in their own clipped layer instead.
 *   - A Back button instead of a close button.
 *
 * Unchanged: the Enchanted Display Vault art direction, WCAG 2.1 AA structure (tablist, labelled heading),
 * 44px touch targets, the Admin Pass banner, and "cosmetic only" — nothing here changes how a match plays.
 */

import { motion } from "framer-motion";
import { ArrowLeft, Coins, Crown, Info, Store } from "lucide-react";
import { useTheme } from "../../lib/useTheme";
import { bhalyamSpring } from "../../lib/motion";
import { CosmeticsPreviewStage } from "./CosmeticsPreviewStage";
import { CosmeticsItemCard } from "./CosmeticsItemCard";
import { getCosmeticSurface } from "./designTokens";
import { CARD_BACK_SCOPES, SHOP_CATEGORY_TABS, categoryTitle } from "./shopLogic";
import type { CosmeticsShop } from "./useCosmeticsShop";

export interface CosmeticsShopDesktopProps {
  shop: CosmeticsShop;
  onBack: () => void;
}

export function CosmeticsShopDesktop({ shop, onBack }: CosmeticsShopDesktopProps) {
  const [theme] = useTheme();
  const surface = getCosmeticSurface(theme);
  const isLight = theme === "light";

  const {
    walletBalance,
    isAdminUser,
    selectedCategory,
    selectedScope,
    categoryItems,
    previewItem,
    previewMode,
    isPreviewEquipped,
    isPreviewOwned,
    isLoading,
    isSubmitting,
    errorMessage,
  } = shop;

  return (
    <section
      aria-labelledby="cosmetics-boutique-title"
      className="relative w-full flex flex-col border border-amber-500/30 dark:border-amber-400/20 rounded-3xl md:rounded-[32px] shadow-2xl motion-safe:animate-cosmetic-fade-in"
      style={{
        background: isLight ? surface.base : "linear-gradient(180deg, #0d1322 0%, #070b14 50%, #03050a 100%)",
        boxShadow: `${surface.edgeLight}, 0 34px 92px -26px rgba(0,0,0,0.55), 0 0 80px rgba(245,158,11,0.14)`,
      }}
    >
      {/* ── Surface reflections: clipped to the panel's own rounded corners, kept off the sticky column ── */}
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-3xl md:rounded-[32px] pointer-events-none">
        <div className="absolute -top-20 -left-10 w-[32rem] h-[32rem] bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-[28rem] h-[28rem] bg-gradient-to-bl from-purple-500/15 via-indigo-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 w-[30rem] h-[20rem] bg-gradient-to-t from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(135deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* ── Header: boutique marquee ── */}
      <div
        className="flex-shrink-0 px-5 py-3.5 border-b border-stone-200/80 dark:border-white/10 rounded-t-3xl md:rounded-t-[32px] flex items-center justify-between gap-3 relative z-10"
        style={{
          background: isLight ? "rgba(255, 253, 247, 0.94)" : "rgba(7, 11, 20, 0.92)",
          backdropFilter: "blur(16px)",
          boxShadow: surface.edgeLight,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-stone-300/80 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] hover:bg-amber-100/50 dark:hover:bg-amber-400/15 hover:border-amber-500/60 active:scale-95 text-stone-600 dark:text-zinc-200 hover:text-amber-800 dark:hover:text-amber-300 transition flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-black flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.65)] shrink-0 border border-amber-200/80">
            <Store className="w-5 h-5 drop-shadow-sm" />
          </div>
          <div className="min-w-0">
            <h1
              id="cosmetics-boutique-title"
              className="text-xl font-black tracking-tight flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-900 via-amber-700 to-amber-950 dark:from-yellow-100 dark:via-amber-300 dark:to-yellow-500"
            >
              <span>Cosmetics Boutique</span>
              {isAdminUser && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-gradient-to-r from-amber-500/25 to-yellow-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center gap-1 shrink-0">
                  <Crown className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  ADMIN PASS
                </span>
              )}
            </h1>
            <p className="text-xs text-stone-500 dark:text-zinc-400 truncate font-semibold">
              {isAdminUser
                ? "All finishes unlocked for free"
                : "Curated collectible finishes for dice, cards, tokens & avatar frames."}
            </p>
          </div>
        </div>

        {/* Wallet balance — 24K gold capsule */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-amber-400/60 dark:border-amber-400/40 text-amber-900 dark:text-amber-200 font-mono font-black text-xs shrink-0"
          style={{
            background: isLight
              ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,243,199,0.8))"
              : "linear-gradient(135deg, rgba(30,22,8,0.7), rgba(12,16,28,0.85))",
            boxShadow: isLight
              ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 0 20px rgba(245,158,11,0.2)"
              : "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px rgba(245,158,11,0.25)",
          }}
        >
          <Coins className="w-4 h-4 text-amber-500 fill-amber-300/40" />
          <span>{Number(walletBalance || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* ── Category navigation: gilded segmented control ── */}
      <div
        role="tablist"
        aria-label="Cosmetic categories"
        className="flex-shrink-0 px-5 py-2.5 border-b border-stone-200/80 dark:border-white/10 overflow-x-auto scrollbar-none flex items-center gap-2 relative z-10"
        style={{ background: isLight ? "rgba(251, 245, 233, 0.9)" : "rgba(4, 7, 13, 0.82)" }}
      >
        {SHOP_CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.category;
          return (
            <button
              key={tab.category}
              type="button"
              onClick={() => shop.selectCategory(tab.category)}
              aria-selected={isActive}
              role="tab"
              className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none relative focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isActive
                  ? "bg-gradient-to-b from-amber-300/25 via-amber-500/15 to-transparent text-amber-900 dark:text-amber-200 border border-amber-400/80 font-black shadow-[0_0_16px_rgba(245,158,11,0.28)]"
                  : "bg-white/60 dark:bg-white/[0.04] text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-white/[0.07] border border-stone-300/80 dark:border-white/10 font-bold"
              }`}
              style={
                isActive
                  ? {
                      boxShadow: isLight
                        ? "inset 0 1px 0 rgba(255,255,255,0.7), 0 0 16px rgba(245,158,11,0.2)"
                        : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 18px rgba(245,158,11,0.28)",
                    }
                  : undefined
              }
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-600 dark:text-amber-400 drop-shadow-sm" : ""}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="cosmetic-category-indicator"
                  transition={bhalyamSpring}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.95)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Game-variant switcher (card backs are sold per game) ── */}
      {selectedCategory === "CARD_BACK" && (
        <div className="flex-shrink-0 px-5 py-2 bg-white/70 dark:bg-black/30 border-b border-stone-200 dark:border-white/10 flex items-center gap-2 relative z-10">
          <span className="text-xs text-stone-500 dark:text-zinc-400 font-semibold mr-1">Game variant</span>
          {CARD_BACK_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => shop.selectScope(scope)}
              className={`min-h-[36px] px-3.5 py-1 rounded-xl text-xs font-black transition cursor-pointer uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                selectedScope === scope
                  ? "bg-gradient-to-r from-amber-400/25 to-yellow-500/15 text-amber-900 dark:text-amber-300 border border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      )}

      {/* ── Error banner ── */}
      {errorMessage && (
        <div
          role="alert"
          className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/80 border-b border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between relative z-10"
        >
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Body: preview stage (left, pinned) + collection (right) ── */}
      <div className="p-4 md:p-5 lg:p-6 flex flex-col md:flex-row gap-5 relative z-10">
        <div className="w-full md:w-5/12 flex-shrink-0 flex flex-col gap-3 md:sticky md:top-4 md:self-start">
          <CosmeticsPreviewStage
            item={previewItem}
            category={selectedCategory}
            scope={selectedScope}
            previewMode={previewMode}
            onSelectPreviewMode={shop.setPreviewMode}
            isEquipped={isPreviewEquipped}
            isOwned={isPreviewOwned}
            isAdminUser={isAdminUser}
            walletBalance={walletBalance}
            isSubmitting={isSubmitting}
            onPurchase={shop.purchase}
            onEquip={shop.equip}
            onUnequip={shop.unequip}
            onRefund={shop.refund}
          />
        </div>

        <div
          className="w-full md:w-7/12 flex flex-col border border-stone-300/80 dark:border-white/10 rounded-[24px] p-4 shadow-2xl"
          style={{
            background: isLight
              ? surface.raised
              : "linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(8,12,22,0.96) 100%)",
            boxShadow: `${surface.edgeLight}, 0 22px 54px -24px rgba(0,0,0,0.6)`,
          }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-white/10">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-900 dark:text-white">
              {categoryTitle(selectedCategory)} / {categoryItems.length} styles
            </span>
            <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-semibold">Select a finish to inspect</span>
          </div>

          {isLoading ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent motion-safe:animate-spin" />
              <span className="text-xs font-medium">Loading boutique collection...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {categoryItems.map((item, index) => (
                <div
                  key={item.id}
                  className="motion-safe:animate-cosmetic-fade-in motion-reduce:opacity-100"
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                >
                  <CosmeticsItemCard
                    item={item}
                    category={selectedCategory}
                    scope={selectedScope}
                    isSelected={previewItem?.id === item.id}
                    isOwned={shop.isOwned(item)}
                    isEquipped={shop.isEquipped(item)}
                    isSubmitting={isSubmitting}
                    walletBalance={walletBalance}
                    isAdminUser={isAdminUser}
                    onSelect={() => shop.selectItem(item.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: purely cosmetic ── */}
      <div
        className="flex-shrink-0 px-5 py-3 border-t border-amber-200/20 dark:border-white/10 rounded-b-3xl md:rounded-b-[32px] flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400 relative z-10"
        style={{ background: isLight ? "rgba(255, 253, 247, 0.92)" : "rgba(7, 10, 18, 0.92)" }}
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
          <span className="font-semibold text-stone-700 dark:text-zinc-200">Cosmetic only. Every match stays fair.</span>
        </div>
      </div>
    </section>
  );
}
