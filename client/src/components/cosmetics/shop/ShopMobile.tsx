/**
 * BHALYAM — Cosmetics shop, phone layout (under 768px).
 *
 * Designed for one hand on a small screen, not shrunk from the desktop. Top to bottom: title row (Back, the
 * "cosmetic only" line, the coin balance), four equal tabs, then the showroom, which takes ALL the remaining height:
 * the stage (flexible), the selected item's name, the thumbnail strip. The one action sits pinned at the bottom in the
 * thumb zone, above the safe area. Nothing scrolls except the strip, sideways.
 *
 * Differences from the desktop shell: the stage has no step arrows (the strip steps), the preview-context switch
 * moves to the stage's bottom edge, strip tiles are shorter, and the details collapse to a name and one line.
 */

import { SHOP_CATEGORY_TABS } from "../shopLogic";
import type { CosmeticsShop } from "../useCosmeticsShop";
import { ShopActionButtons, useShopPlan } from "./ShopActions";
import { GameVariantSwitch, REASSURANCE, SHOWROOM_ID, ShopHeader, ShopTabs, shopTabId } from "./ShopNav";
import { ShopStage } from "./ShopStage";
import { ShopStrip } from "./ShopStrip";
import { categoryLabel } from "./shopPlan";
import { rarityVars } from "./shopRarity";

export interface ShopMobileProps {
  shop: CosmeticsShop;
  onBack: () => void;
}

export function ShopMobile({ shop, onBack }: ShopMobileProps) {
  const shopPlan = useShopPlan(shop);
  const { categoryItems: items, previewItem: item, selectedCategory, selectedScope } = shop;
  const tabLabel = SHOP_CATEGORY_TABS.find((tab) => tab.category === selectedCategory)?.label ?? "Styles";
  const hasItems = items.length > 0 && item !== null;

  return (
    // `min-h-full`, not `h-full`: on a short phone (360x640, 375x667) the stage, name, strip and action cannot all fit
    // at once. The page grows and scrolls instead of crushing the stage; the action bar stays pinned (sticky).
    <div className="flex min-h-full flex-1 flex-col">
      <div className="shrink-0 px-3 pb-1 pt-2">
        <ShopHeader balance={shop.walletBalance} onBack={onBack} showReassurance={false} />
      </div>
      <div className="shrink-0 px-1">
        <ShopTabs fill selected={selectedCategory} onSelect={shop.selectCategory} />
      </div>

      {shop.errorMessage && (
        <p role="alert" className="shrink-0 px-4 pt-2 text-[14px] font-medium text-rose-700 dark:text-rose-300">
          {shop.errorMessage}
        </p>
      )}

      <section
        id={SHOWROOM_ID}
        role="tabpanel"
        aria-labelledby={shopTabId(selectedCategory)}
        style={rarityVars(item?.rarity)}
        className="flex flex-1 flex-col border-t-[3px] border-[rgb(var(--shop-rar))] bg-[rgb(var(--shop-rar)/0.12)] transition-colors duration-500 dark:bg-[rgb(var(--shop-rar)/0.1)]"
      >
        {shop.isLoading && !hasItems ? (
          <p aria-busy="true" className="flex flex-1 items-center justify-center text-[15px] font-medium text-ink-mid motion-safe:animate-pulse">
            Loading the shop…
          </p>
        ) : !hasItems || !shopPlan ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-[16px] font-medium text-ink-mid">
            Nothing in {tabLabel.toLowerCase()} yet.
          </p>
        ) : (
          <>
            <div className="relative min-h-[240px] flex-1">
              <div className="absolute inset-0">
                <ShopStage
                  compact
                  item={item}
                  category={selectedCategory}
                  scope={selectedScope}
                  mode={shop.previewMode}
                  onModeChange={shop.setPreviewMode}
                />
              </div>
            </div>

            <div className="shrink-0 px-4 pt-2">
              <h2 className="text-balance font-display text-[24px] leading-tight text-ink-hi">{item.name}</h2>
              <p className="line-clamp-1 text-[14px] leading-snug text-ink-mid">
                {categoryLabel(selectedCategory, selectedScope)} · {item.description}
              </p>
            </div>

            {selectedCategory === "CARD_BACK" && (
              <div className="shrink-0 px-4 pt-2">
                <GameVariantSwitch scope={selectedScope} onSelect={shop.selectScope} />
              </div>
            )}

            <div className="shrink-0 pt-2">
              <ShopStrip
                compact
                items={items}
                category={selectedCategory}
                selectedId={item.id}
                isOwned={shop.isOwned}
                isEquipped={shop.isEquipped}
                onSelect={shop.selectItem}
                label={`${tabLabel} styles`}
              />
            </div>
          </>
        )}
      </section>

      {shopPlan && (
        <div className="sticky bottom-0 z-10 shrink-0 border-t border-[var(--chrome-hairline)] bg-surface-1 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ShopActionButtons
            shopPlan={shopPlan}
            isSubmitting={shop.isSubmitting}
            onUnlock={shop.purchase}
            onEquip={shop.equip}
            onReset={shop.unequip}
            onRefund={shop.refund}
          />
          <p className="mt-1.5 text-center text-[13px] text-ink-mid">{REASSURANCE}</p>
        </div>
      )}
    </div>
  );
}
