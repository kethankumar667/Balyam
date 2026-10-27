/**
 * BHALYAM — Cosmetics shop, phone layout (under 768px).
 *
 * Designed for one hand on a small screen, not shrunk from the desktop. Top to bottom: title row (Back, the
 * collection progress and category tabs, then a stacked cinematic stage and collectible shelf.
 * The primary action stays in a sticky safe-area bar; short screens scroll naturally.
 *
 * Differences from the desktop shell: the preview-context switch
 * moves to the stage's bottom edge, strip tiles are shorter, and the details collapse to a name and one line.
 */

import { SHOP_CATEGORY_TABS } from "../shopLogic";
import { stepShopSelection, type CosmeticsShop } from "../useCosmeticsShop";
import { ShopActionButtons, useShopPlan } from "./ShopActions";
import { GameVariantSwitch, REASSURANCE, SHOWROOM_ID, ShopCollection, ShopHeader, ShopTabs, shopTabId } from "./ShopNav";
import { ShopStage } from "./ShopStage";
import { ShopShelf, useRarityShelf } from "./ShopShelf";
import { categoryLabel } from "./shopPlan";
import { rarityVars } from "./shopRarity";
import { ShopFeedback } from "./ShopFeedback";

export interface ShopMobileProps {
  shop: CosmeticsShop;
  onBack: () => void;
}

export function ShopMobile({ shop: source, onBack }: ShopMobileProps) {
  const { shop, rarity, selectRarity } = useRarityShelf(source);
  const shopPlan = useShopPlan(shop);
  const { categoryItems: items, previewItem: item, selectedCategory, selectedScope } = shop;
  const tabLabel = SHOP_CATEGORY_TABS.find((tab) => tab.category === selectedCategory)?.label ?? "Styles";
  const hasItems = items.length > 0 && item !== null;

  return (
    // `min-h-full`, not `h-full`: on a short phone (360x640, 375x667) the stage, name, strip and action cannot all fit
    // at once. The page grows and scrolls instead of crushing the stage; the action bar stays pinned (sticky).
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-[#FFF9ED] dark:bg-surface-0">
      <div className="shrink-0 px-3 pb-1 pt-2">
        <ShopHeader balance={shop.walletBalance} walletStatus={shop.walletStatus} onBack={onBack} showReassurance={false} />
      </div>
      <div className="px-3 py-2"><ShopCollection shop={shop} /></div>
      <div className="shrink-0 px-1">
        <ShopTabs fill selected={selectedCategory} onSelect={shop.selectCategory} />
      </div>

      <ShopFeedback shop={shop} />

      <section
        id={SHOWROOM_ID}
        role="tabpanel"
        aria-labelledby={shopTabId(selectedCategory)}
        style={rarityVars(item?.rarity)}
        className="flex min-w-0 flex-1 flex-col"
      >
        {shop.isLoading && !hasItems ? (
          <p role="status" aria-label="Loading shop" aria-busy="true" className="flex flex-1 items-center justify-center text-[15px] font-medium text-ink-mid motion-safe:animate-pulse">
            Loading the shop…
          </p>
        ) : !hasItems || !shopPlan ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-[16px] font-medium text-ink-mid">
            {shop.errorMessage ? "Shop unavailable. Use Retry shop above." : source.categoryItems.length ? "No matching styles. Choose another rarity below." : `Nothing in ${tabLabel.toLowerCase()} yet.`}
          </p>
        ) : (
          <>
            <div data-shop-hero className="border-y border-amber-500/25 bg-[#17120F] bg-[radial-gradient(ellipse_at_50%_30%,rgb(var(--shop-rar)/0.3),transparent_70%),linear-gradient(140deg,#291A12,#10131C)] pb-5 [--surface-1:#211A16] [--surface-2:#382D25] [--text-hi:#FFF7E6] [--text-mid:#E2D3BD] [--text-mute:#E2D3BD]">
            <div className="relative min-h-[300px]">
              <div className="absolute inset-0">
                <ShopStage
                  compact
                  item={item}
                  category={selectedCategory}
                  scope={selectedScope}
                  mode={shop.previewMode}
                  onModeChange={shop.setPreviewMode}
                  onStep={items.length > 1 ? (direction) => stepShopSelection(shop, direction) : undefined}
                />
              </div>
            </div>

            <div className="shrink-0 px-4 pt-2">
              <h2 className="text-balance font-display text-[24px] leading-tight text-ink-hi">{item.name}</h2>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-mid">
                {categoryLabel(selectedCategory, selectedScope)} · {item.description}
              </p>
            </div>
            </div>

          </>
        )}
        {selectedCategory === "CARD_BACK" && (
          <div className="shrink-0 px-4 pt-2">
            <GameVariantSwitch scope={selectedScope} onSelect={shop.selectScope} />
          </div>
        )}
        {source.categoryItems.length > 0 && (
          <div className="min-w-0 shrink-0 px-3 pb-4 pt-5">
            <ShopShelf compact shop={shop} rarity={rarity} selectRarity={selectRarity} label={tabLabel} />
          </div>
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
