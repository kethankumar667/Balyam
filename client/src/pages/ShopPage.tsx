import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { CosmeticsShopDesktop } from "../components/cosmetics/CosmeticsShopDesktop";
import { CosmeticsStoreMobile } from "../components/cosmetics/CosmeticsStoreMobile";
import { parseShopQuery } from "../components/cosmetics/shopLogic";
import { useCosmeticsShop } from "../components/cosmetics/useCosmeticsShop";
import { useViewport } from "../lib/useViewport";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import { AudioManager } from "../services/AudioManager";
import { AUDIO } from "../constants/audio";

/**
 * The Cosmetics Boutique, at `/shop`.
 *
 * It was a modal mounted in every screen's layout and opened from one header chip. As a page it has a URL —
 * linkable, refreshable, reachable with Back — and, the reason it moved, a whole surface to design instead of
 * a dialog's panel. The page owns only routing concerns: which tab to land on, where Back goes, which of the two
 * layouts to draw. State and actions are `useCosmeticsShop`; the two layouts are
 * `CosmeticsShopDesktop` (>= 768px) and `CosmeticsStoreMobile`.
 *
 * Deep links: `/shop?category=AVATAR_AURA`, `/shop?category=CARD_BACK&scope=uno`. Anything else in the query is
 * ignored and the shop opens on the tab the player last browsed (see `parseShopQuery`).
 */
export default function ShopPage() {
  const navigate = useNavigate();
  const { search, key } = useLocation();
  const enterShop = useCosmeticsStore((s) => s.enterShop);
  const isMobile = useViewport() === "mobile";
  const shop = useCosmeticsShop();

  // Land on the requested tab and refresh the catalog — on arrival, and again if the deep link changes.
  useEffect(() => {
    const { category, scope } = parseShopQuery(search);
    enterShop(category, scope);
  }, [search, enterShop]);

  // Back to wherever the player came from. A direct visit (a new tab, a shared link) has no previous entry
  // inside the app — history's first entry has the key "default" — so Back would leave the site; go home instead.
  const goBack = () => {
    AudioManager.play(AUDIO.UI_CLICK);
    if (key !== "default") navigate(-1);
    else navigate("/");
  };

  return (
    // The phone layout has its own Back header, so the breadcrumb bar above it would only cost height.
    <AppLayout showBreadcrumbs={!isMobile}>
      {isMobile ? (
        <div className="flex-1 min-h-0">
          <CosmeticsStoreMobile
            catalog={shop.catalog}
            ownedIds={shop.ownedIds}
            equipped={shop.equipped}
            selectedCategory={shop.selectedCategory}
            selectedScope={shop.selectedScope}
            selectedItemId={shop.selectedItemId}
            isLoading={shop.isLoading}
            isSubmitting={shop.isSubmitting}
            errorMessage={shop.errorMessage}
            walletBalance={shop.walletBalance}
            isAdminUser={shop.isAdminUser}
            onClose={goBack}
            onSelectCategory={shop.selectCategory}
            onSelectScope={shop.selectScope}
            onSelectItem={shop.selectItem}
            onPurchase={shop.purchase}
            onRefund={shop.refund}
            onEquip={shop.equip}
            onUnequip={shop.unequip}
          />
        </div>
      ) : (
        <div className="p-3.5 sm:p-6 lg:p-8 w-full max-w-[1440px] mx-auto pb-24 min-w-0">
          <CosmeticsShopDesktop shop={shop} onBack={goBack} />
        </div>
      )}
    </AppLayout>
  );
}
