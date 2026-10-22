/**
 * BHALYAM — Cosmetics shop: the actions on the selected item.
 *
 * `useShopPlan` turns the shop's state into the plan (see shopPlan.ts); `ShopActionButtons` draws it. The desktop
 * details column and the phone's pinned bar both use these, so the two layouts offer the same thing in the same
 * words. One primary control. One plain sentence about money or a lock. Reset and refund are quiet text buttons.
 */

import { useMemo } from "react";
import { Check, Coins, Lock, RotateCcw } from "lucide-react";
import type { CosmeticCatalogItem } from "@shared/cosmetics";
import { Button, PrimaryButton } from "../../../design-system/dls/Buttons";
import { resolveCosmeticPresentationState, type CosmeticPresentationResult } from "../presentationState";
import type { CosmeticsShop } from "../useCosmeticsShop";
import { planShopAction, type ShopActionPlan } from "./shopPlan";

export interface ShopPlan {
  item: CosmeticCatalogItem;
  presentation: CosmeticPresentationResult;
  plan: ShopActionPlan;
}

/** The selected item's state and what to offer for it; null while the slot has nothing to show. */
export function useShopPlan(shop: CosmeticsShop): ShopPlan | null {
  const { previewItem, isPreviewOwned, isPreviewEquipped, isAdminUser, walletBalance, isSubmitting } = shop;
  return useMemo(() => {
    if (!previewItem) return null;
    const presentation = resolveCosmeticPresentationState({
      item: previewItem,
      isOwned: isPreviewOwned,
      isEquipped: isPreviewEquipped,
      isAdminUser,
      walletBalance,
      isSubmitting,
    });
    return {
      item: previewItem,
      presentation,
      plan: planShopAction({ item: previewItem, presentation, isOwned: isPreviewOwned, isAdminUser, isSubmitting }),
    };
  }, [previewItem, isPreviewOwned, isPreviewEquipped, isAdminUser, walletBalance, isSubmitting]);
}

export interface ShopActionButtonsProps {
  shopPlan: ShopPlan;
  isSubmitting: boolean;
  onUnlock: (item: CosmeticCatalogItem) => void;
  onEquip: (item: CosmeticCatalogItem) => void;
  onReset: () => void;
  onRefund: (item: CosmeticCatalogItem) => void;
}

export function ShopActionButtons({ shopPlan, isSubmitting, onUnlock, onEquip, onReset, onRefund }: ShopActionButtonsProps) {
  const { item, plan } = shopPlan;
  const { primary } = plan;

  const press = () => {
    if (primary.kind !== "button") return;
    if (primary.intent === "unlock") onUnlock(item);
    else if (primary.intent === "equip") onEquip(item);
  };

  return (
    <div className="flex flex-col gap-2">
      {primary.kind === "status" ? (
        <div
          role="status"
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600/35 bg-emerald-600/10 px-4 text-[15px] font-semibold text-emerald-800 dark:text-emerald-200"
        >
          <Check className="h-5 w-5 stroke-[3]" aria-hidden />
          {primary.label}
        </div>
      ) : (
        <PrimaryButton
          size="lg"
          className={`w-full ${
            // A disabled price is the decision on the screen, so it stays legible instead of fading to a ghost.
            primary.intent === "locked"
              ? "disabled:!border disabled:!border-[var(--chrome-hairline)] disabled:!bg-surface-2 disabled:!text-ink-hi disabled:!opacity-100"
              : ""
          }`}
          disabled={primary.disabled}
          loading={isSubmitting && primary.intent !== "locked"}
          onClick={press}
          leftIcon={
            primary.intent === "unlock" ? <Coins className="h-5 w-5" /> : primary.intent === "equip" ? <Check className="h-5 w-5" /> : <Lock className="h-5 w-5" />
          }
        >
          {primary.label}
        </PrimaryButton>
      )}

      {plan.note && <p className="text-[14px] leading-snug text-ink-mid">{plan.note}</p>}
      {plan.refundPromise && <p className="text-[13px] leading-snug text-ink-mid">{plan.refundPromise}</p>}

      {(plan.canReset || plan.showRefund) && (
        <div className="flex flex-wrap items-center gap-x-2">
          {plan.canReset && (
            <Button variant="ghost" size="sm" disabled={isSubmitting} onClick={onReset}>
              Reset to default
            </Button>
          )}
          {plan.showRefund && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onRefund(item)}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Refund {item.priceCoins.toLocaleString()} coins
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** The price, large, for an item the shopper has not unlocked; with how far they are when they cannot yet afford it. */
export function ShopPriceBlock({ shopPlan }: { shopPlan: ShopPlan }) {
  const { item, plan, presentation } = shopPlan;
  if (!plan.showPrice) return null;
  const short = plan.shortfall > 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-ink-hi">
        <Coins className="h-6 w-6 self-center text-amber-600 dark:text-amber-400" aria-hidden />
        <span className="font-display text-[34px] leading-none tabular-nums">{item.priceCoins.toLocaleString()}</span>
        <span className="text-[15px] font-medium text-ink-mid">coins</span>
      </div>
      {short && (
        <div
          aria-hidden
          className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--shop-rar)/0.18)]"
          title={presentation.progressText}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${presentation.progressPercent}%`, background: "rgb(var(--shop-rar))" }}
          />
        </div>
      )}
    </div>
  );
}
