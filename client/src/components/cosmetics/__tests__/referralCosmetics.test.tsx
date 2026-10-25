import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CosmeticCatalogItem } from "@shared/cosmetics";
import { NOSTALGIA_PACK } from "@shared/referrals";
import { resolveCosmeticPresentationState } from "../presentationState";
import { ItemPreviewVisual } from "../shop/ItemPreviewVisuals";
import { CollectibleThumbnail } from "../CosmeticsItemCard";
import { getPodiumTitleConfig } from "../../../lib/cosmeticsResolver";

const items: CosmeticCatalogItem[] = NOSTALGIA_PACK.map(item => ({
  id: item.id, name: item.name, category: item.category, description: "Earned referral reward",
  priceCoins: 0, rarity: "RARE", unlockMethod: "REFERRAL_MILESTONE", isActive: true, displayOrder: 900,
}));
describe("earned referral cosmetics across presentation surfaces", () => {
  it.each(items)("keeps $id locked rather than free for nonowners, and equippable for owners", item => {
    const params = { item, isOwned: false, isEquipped: false, isAdminUser: false, walletBalance: "9999", isSubmitting: false };
    expect(resolveCosmeticPresentationState(params)).toMatchObject({ state: "LOCKED", canPurchase: false, canEquip: false });
    expect(resolveCosmeticPresentationState({ ...params, isOwned: true })).toMatchObject({ state: "OWNED", canPurchase: false, canEquip: true });
  });
  it.each(["PROFILE", "GAME_SEAT", "PODIUM"] as const)("previews Golden Reunion's actual seat artwork in %s", mode => {
    const { container } = render(<ItemPreviewVisual item={items[0]} category="AVATAR_AURA" scope="GLOBAL" mode={mode} displayName="Player" avatarId={null} />);
    expect(container.querySelector('svg[data-frame="aura_nostalgia_gold"]')).toBeInTheDocument();
  });
  it("draws the gold artwork on the collectible thumbnail too", () => {
    const { container } = render(<CollectibleThumbnail item={items[0]} category="AVATAR_AURA" isSelected={false} rarity="RARE" />);
    expect(container.querySelector('svg[data-frame="aura_nostalgia_gold"]')).toBeInTheDocument();
  });
  it.each(["FULL_TABLE", "PLAYER_VIEW", "MOBILE_VIEW"] as const)("previews the School Slate blackboard with its chalk doodles in %s", mode => {
    // happy-dom discards earlier background layers; inspect the CSS sent to the browser.
    const markup = renderToStaticMarkup(<ItemPreviewVisual item={items[2]} category="TABLE_THEME" scope="rummy" mode={mode} displayName="Player" avatarId={null} />);
    expect(markup).toContain("/textures/school-slate.svg");
  });
  it("resolves the actual earned Gang Leader title", () => {
    expect(getPodiumTitleConfig("title_gang_leader")).toMatchObject({ label: "Gang Leader" });
  });
});
