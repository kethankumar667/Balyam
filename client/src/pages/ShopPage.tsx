import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { ShopDesktop } from "../components/cosmetics/shop/ShopDesktop";
import { ShopMobile } from "../components/cosmetics/shop/ShopMobile";
import { parseShopQuery } from "../components/cosmetics/shopLogic";
import { useCosmeticsShop } from "../components/cosmetics/useCosmeticsShop";
import { useMediaQuery } from "../lib/useMediaQuery";
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
 * `ShopDesktop` (>= 768px) and `ShopMobile`, in `components/cosmetics/shop/`.
 *
 * Deep links: `/shop?category=AVATAR_AURA`, `/shop?category=CARD_BACK&scope=uno`. Anything else in the query is
 * ignored and the shop opens on the tab the player last browsed (see `parseShopQuery`).
 */
export default function ShopPage() {
  const navigate = useNavigate();
  const { search, key } = useLocation();
  const enterShop = useCosmeticsStore((s) => s.enterShop);
  const isMobile = useViewport() === "mobile";
  // Same definition as the `short-land:` Tailwind variant.
  const isShortLandscape = useMediaQuery("(orientation: landscape) and (max-height: 520px)");
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
    // No breadcrumb bar: the page has its own Back and title, and the bar costs 48px of a screen the showroom needs.
    // On a phone held sideways (365px tall) the global header would also take the item off the first screen, so it
    // steps aside there, as it does for a live game; Back and the wallet are on the page itself.
    <AppLayout showBreadcrumbs={false} chrome={!isShortLandscape}>
      {isMobile ? (
        <div className="flex flex-1 flex-col">
          <ShopMobile shop={shop} onBack={goBack} />
        </div>
      ) : (
        <ShopDesktop shop={shop} onBack={goBack} />
      )}
    </AppLayout>
  );
}
