/**
 * BHALYAM — Cosmetics shop, desktop and tablet layout (768px and up).
 *
 * The shop is a page you walk into: title row and tabs on the page ground, then the showroom, a full-width band
 * tinted by the selected item's rarity. In it, the stage takes the left (the item large on its plate) and the details
 * column the right (name, what it is, price, the one button). The thumbnail strip is the shelf along the band's
 * bottom edge. There is no bordered panel anywhere: the band is the page's own background changing colour.
 *
 * State and actions come from `useCosmeticsShop`; the phone has its own shell (ShopMobile).
 */

import { Crown } from "lucide-react";
import { SHOP_CATEGORY_TABS } from "../shopLogic";
import type { CosmeticsShop } from "../useCosmeticsShop";
import { ShopActionButtons, ShopPriceBlock, useShopPlan } from "./ShopActions";
import { GameVariantSwitch, SHOWROOM_ID, ShopHeader, ShopTabs, shopTabId } from "./ShopNav";
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
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-5 short-land:pt-2">
        <ShopHeader balance={shop.walletBalance} onBack={onBack} />
      </div>
      <div className="mx-auto mt-3 w-full max-w-[1280px] px-6 short-land:mt-1">
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

      {/* The showroom band: the page's ground, tinted by rarity. Full width; its contents are centred. */}
      <section
        id={SHOWROOM_ID}
        role="tabpanel"
        aria-labelledby={shopTabId(selectedCategory)}
        style={rarityVars(item?.rarity)}
        className="mt-0 flex-1 border-t-[3px] border-[rgb(var(--shop-rar))] bg-[rgb(var(--shop-rar)/0.12)] transition-colors duration-500 dark:bg-[rgb(var(--shop-rar)/0.1)]"
      >
        <div className="mx-auto grid w-full max-w-[1280px] gap-x-10 gap-y-3 px-6 pb-6 pt-6 short-land:pb-3 short-land:pt-3 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px]">
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
              {/* Follows the viewport so the whole shelf fits a 900px-tall screen without scrolling; grows on a tall one. */}
              <div className="relative min-h-[clamp(380px,calc(100dvh_-_480px),560px)] short-land:min-h-[300px]">
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
                {shop.isAdminUser && (
                  <p className="flex items-center gap-2 text-[14px] text-ink-mid">
                    <Crown className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    Admin Pass: every style is free for you.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <ShopStrip
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
        </div>
      </section>
    </div>
  );
}
