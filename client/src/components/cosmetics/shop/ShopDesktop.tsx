/**
 * BHALYAM — Cosmetics shop, desktop and tablet layout (768px and up).
 *
 * A cinematic item stage and purchase column lead into a collectible shelf on the page ground.
 *
 * State and actions come from `useCosmeticsShop`; the phone has its own shell (ShopMobile).
 */

import { Crown, ShieldCheck, Eye } from "lucide-react";
import { SHOP_CATEGORY_TABS } from "../shopLogic";
import type { CosmeticsShop } from "../useCosmeticsShop";
import { ShopActionButtons, ShopPriceBlock, useShopPlan } from "./ShopActions";
import { GameVariantSwitch, SHOWROOM_ID, ShopCollection, ShopHeader, ShopTabs, shopTabId } from "./ShopNav";
import { ShopStage } from "./ShopStage";
import { ShopStrip } from "./ShopStrip";
import { categoryLabel } from "./shopPlan";
import { rarityVars } from "./shopRarity";

export interface ShopDesktopProps {
  shop: CosmeticsShop;
  onBack: () => void;
}

export function ShopDesktop({ shop, onBack }: ShopDesktopProps) {
  const shopPlan = useShopPlan(shop);
  const { categoryItems: items, previewItem: item, selectedCategory, selectedScope } = shop;

  const step = (direction: -1 | 1) => {
    if (!item || items.length < 2) return;
    const index = items.findIndex((candidate) => candidate.id === item.id);
    shop.selectItem(items[(index + direction + items.length) % items.length].id);
  };

  const tabLabel = SHOP_CATEGORY_TABS.find((tab) => tab.category === selectedCategory)?.label ?? "Styles";
  const hasItems = items.length > 0 && item !== null;

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-[#FFF9ED] dark:bg-surface-0">
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-4 px-6 pb-4 pt-5 short-land:pt-2 lg:grid-cols-[1fr_300px]">
        <ShopHeader balance={shop.walletBalance} onBack={onBack} />
        <ShopCollection shop={shop} />
      </div>
      <div className="mx-auto w-full max-w-[1440px] px-6">
        <ShopTabs
          selected={selectedCategory}
          onSelect={shop.selectCategory}
          trailing={
            selectedCategory === "CARD_BACK" ? <GameVariantSwitch scope={selectedScope} onSelect={shop.selectScope} /> : undefined
          }
        />
      </div>

      {shop.errorMessage && (
        <p role="alert" className="mx-auto w-full max-w-[1280px] px-6 pt-3 text-[14px] font-medium text-rose-700 dark:text-rose-300">
          {shop.errorMessage}
        </p>
      )}

      <section
        id={SHOWROOM_ID}
        role="tabpanel"
        aria-labelledby={shopTabId(selectedCategory)}
        style={rarityVars(item?.rarity)}
        className="min-w-0 flex-1"
      >
        <div
          data-shop-hero
          className="relative isolate overflow-hidden border-y border-amber-500/25 bg-[#17120F] bg-[radial-gradient(ellipse_at_30%_35%,rgb(var(--shop-rar)/0.3),transparent_60%),linear-gradient(115deg,#291A12,#10131C)] [--surface-1:#211A16] [--surface-2:#382D25] [--text-hi:#FFF7E6] [--text-mid:#E2D3BD] [--text-mute:#E2D3BD]"
        >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,rgba(245,158,11,0.1),transparent)]" />
        <div className="relative mx-auto grid w-full max-w-[1440px] gap-x-8 gap-y-3 px-6 py-8 short-land:py-3 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {shop.isLoading && !hasItems ? (
            <div className="relative min-h-[440px] md:col-span-2" aria-busy="true">
              <p className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-ink-mid motion-safe:animate-pulse">
                Loading the shop…
              </p>
            </div>
          ) : !hasItems || !shopPlan ? (
            <div className="relative min-h-[320px] md:col-span-2">
              <p className="absolute inset-0 flex items-center justify-center text-[16px] font-medium text-ink-mid">
                Nothing in {tabLabel.toLowerCase()} yet.
              </p>
            </div>
          ) : (
            <>
              <div className="relative min-h-[420px] short-land:min-h-[300px]">
                <div className="absolute inset-0">
                  <ShopStage
                    item={item}
                    category={selectedCategory}
                    scope={selectedScope}
                    mode={shop.previewMode}
                    onModeChange={shop.setPreviewMode}
                    onStep={items.length > 1 ? step : undefined}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center gap-5 py-2 short-land:gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">The collectible showroom</p>
                <div>
                  <h2 className="text-balance font-display text-[36px] leading-[1.08] text-ink-hi short-land:text-[26px]">{item.name}</h2>
                  <p className="mt-1.5 text-[15px] font-medium text-ink-mid">{categoryLabel(selectedCategory, selectedScope)}</p>
                  <p className="mt-3 max-w-[38ch] text-[16px] leading-relaxed text-ink-mid short-land:hidden">{item.description}</p>
                </div>
                <ShopPriceBlock shopPlan={shopPlan} />
                <ShopActionButtons
                  shopPlan={shopPlan}
                  isSubmitting={shop.isSubmitting}
                  onUnlock={shop.purchase}
                  onEquip={shop.equip}
                  onReset={shop.unequip}
                  onRefund={shop.refund}
                />
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs text-ink-mid">
                  <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" aria-hidden /> Preview before you choose</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" aria-hidden /> No gameplay advantage</span>
                </div>
                {shop.isAdminUser && (
                  <p className="flex items-center gap-2 text-[14px] text-ink-mid">
                    <Crown className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    Admin Pass: every style is free for you.
                  </p>
                )}
              </div>

            </>
          )}
        </div>
        </div>
        {hasItems && (
              <div className="mx-auto w-full max-w-[1440px] px-6 pb-8 pt-6">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <h2 className="font-display text-xl text-ink-hi">All {tabLabel.toLowerCase()}</h2>
                  <p className="text-xs font-medium text-ink-mid">{items.length} styles · Select to preview</p>
                </div>
                <ShopStrip
                  items={items}
                  category={selectedCategory}
                  selectedId={item?.id ?? null}
                  isOwned={shop.isOwned}
                  isEquipped={shop.isEquipped}
                  onSelect={shop.selectItem}
                  label={`${tabLabel} styles`}
                />
              </div>
        )}
      </section>
    </div>
  );
}
