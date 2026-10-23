import { useEffect, useState } from "react";
import { Crown, Diamond, Grid2X2, Star } from "lucide-react";
import type { CosmeticRarity } from "@shared/cosmetics";
import type { CosmeticsShop } from "../useCosmeticsShop";
import { ShopStrip } from "./ShopStrip";
import { rarityVars, SHOP_RARITY } from "./shopRarity";

type RarityFilter = "ALL" | CosmeticRarity;
const FILTERS = ["ALL", "COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
const ICONS = { ALL: Grid2X2, COMMON: Diamond, RARE: Diamond, EPIC: Star, LEGENDARY: Crown };

export function useRarityShelf(source: CosmeticsShop) {
  const key = `${source.selectedCategory}:${source.selectedScope}`;
  const [filter, setFilter] = useState<{ key: string; rarity: RarityFilter }>({ key, rarity: "ALL" });
  const rarity = filter.key === key ? filter.rarity : "ALL";
  useEffect(() => { setFilter({ key, rarity: "ALL" }); }, [key]);
  const items = source.categoryItems.filter((item) => rarity === "ALL" || item.rarity === rarity);
  const item = items.find((candidate) => candidate.id === source.previewItem?.id) ?? items[0] ?? null;
  const selectRarity = (next: RarityFilter) => {
    setFilter({ key, rarity: next });
    const matches = source.categoryItems.filter((candidate) => next === "ALL" || candidate.rarity === next);
    if (!matches.some((candidate) => candidate.id === source.previewItem?.id) && matches[0]) {
      source.selectItem(matches[0].id);
    }
  };
  return {
    shop: {
      ...source, categoryItems: items, previewItem: item,
      isPreviewOwned: item?.id === source.previewItem?.id ? source.isPreviewOwned : item ? source.isOwned(item) : false,
      isPreviewEquipped: item?.id === source.previewItem?.id ? source.isPreviewEquipped : item ? source.isEquipped(item) : false,
    },
    rarity,
    selectRarity,
  };
}

export function ShopShelf({ shop, rarity, selectRarity, label, compact = false }: {
  shop: CosmeticsShop;
  rarity: RarityFilter;
  selectRarity: (rarity: RarityFilter) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink-hi">All {label.toLowerCase()}</h2>
          <p className="mt-1 text-xs text-ink-mid">{shop.categoryItems.length} styles · Select to preview</p>
        </div>
        <div role="group" aria-label="Filter styles by rarity" className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {FILTERS.map((value) => {
            const Icon = ICONS[value];
            return (
              <button key={value} type="button" aria-pressed={rarity === value}
                onClick={() => selectRarity(value)}
                style={value === "ALL" ? undefined : rarityVars(value)}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  rarity === value ? "border-ink-hi bg-ink-hi text-surface-1" : "border-[var(--chrome-hairline)] bg-surface-1 text-ink-hi"
                }`}>
                <Icon aria-hidden className={`h-4 w-4 ${value === "ALL" ? "" : "text-[rgb(var(--shop-rar))]"}`} />
                {value === "ALL" ? "All" : SHOP_RARITY[value].label}
              </button>
            );
          })}
        </div>
      </div>
      {shop.categoryItems.length ? (
        <ShopStrip compact={compact} items={shop.categoryItems} category={shop.selectedCategory}
          selectedId={shop.previewItem?.id ?? null} isOwned={shop.isOwned} isEquipped={shop.isEquipped}
          onSelect={shop.selectItem} label={`${label} styles`} />
      ) : (
        <p role="status" aria-label="Filtered styles" className="py-8 text-center text-sm text-ink-mid">
          No {rarity === "ALL" ? "" : `${rarity.toLowerCase()} `}styles in this category. Choose another rarity.
        </p>
      )}
    </div>
  );
}
