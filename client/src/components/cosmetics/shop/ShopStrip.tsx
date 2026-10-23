/**
 * BHALYAM — Cosmetics shop: the thumbnail strip.
 *
 * The showroom's carousel. Every style in the slot is one tile: its picture, its name, and ONE line of state
 * (price, Owned, Equipped, Default, Locked). That line is text, with an icon, never colour alone. The selected
 * tile is ringed and underlined in its rarity colour and scrolled into view.
 *
 * It is a single-select listbox: arrow keys, Home and End move the selection (which previews the item), Tab leaves.
 */

import { useEffect, useRef } from "react";
import { Check, Coins, Lock } from "lucide-react";
import type { CosmeticCatalogItem, CosmeticCategory } from "@shared/cosmetics";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { CollectibleThumbnail } from "../CosmeticsItemCard";
import { rarityVars, shopRarityOf } from "./shopRarity";
import { DiceMaterialSwatch } from "./ItemPreviewVisuals";

export interface ShopStripProps {
  items: readonly CosmeticCatalogItem[];
  category: CosmeticCategory;
  selectedId: string | null;
  isOwned: (item: CosmeticCatalogItem) => boolean;
  isEquipped: (item: CosmeticCatalogItem) => boolean;
  onSelect: (id: string) => void;
  /** The listbox's accessible name, e.g. "Avatar frames". */
  label: string;
  /** Phone: narrower tiles. */
  compact?: boolean;
}

/** The one line of state under a tile's name. */
function TileState({ item, owned, equipped }: { item: CosmeticCatalogItem; owned: boolean; equipped: boolean }) {
  if (equipped) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
        <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden /> Equipped
      </span>
    );
  }
  if (item.unlockMethod === "DEFAULT") {
    return <span className="text-[13px] font-medium text-ink-mid">Default</span>;
  }
  if (owned) {
    return <span className="text-[13px] font-semibold text-ink-hi">Owned</span>;
  }
  if (item.unlockMethod === "STREAK_MILESTONE") {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-mid">
        <Lock className="h-3.5 w-3.5" aria-hidden /> Locked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-ink-hi">
      <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
      {item.priceCoins.toLocaleString()}
    </span>
  );
}

export function ShopStrip({ items, category, selectedId, isOwned, isEquipped, onSelect, label, compact = false }: ShopStripProps) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the selected tile centred when selection changes from elsewhere (the stage arrows, a deep link).
  // Sideways only, on the strip itself: `scrollIntoView` also scrolls the PAGE vertically, which on a short screen
  // yanked the stage out of view the moment a tile was tapped.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !selectedId) return;
    const tile = list.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(selectedId)}"]`);
    if (!tile || typeof list.scrollTo !== "function") return;
    const left = tile.offsetLeft - (list.clientWidth - tile.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedId, reduceMotion]);

  const move = (fromIndex: number, toIndex: number) => {
    const target = items[Math.max(0, Math.min(items.length - 1, toIndex))];
    if (!target || target.id === items[fromIndex]?.id) return;
    onSelect(target.id);
    listRef.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(target.id)}"]`)?.focus();
  };

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label={label}
      aria-orientation="horizontal"
      className="flex snap-x snap-proximity gap-3 overflow-x-auto px-1 pb-4 pt-2 [scrollbar-color:rgb(var(--shop-rar)/0.6)_transparent] [scrollbar-width:thin]"
    >
      {items.map((item, index) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id} role="presentation" className="snap-center" style={rarityVars(item.rarity)}>
            <button
              type="button"
              role="option"
              data-item-id={item.id}
              aria-selected={selected}
              tabIndex={selected || (!selectedId && index === 0) ? 0 : -1}
              onClick={() => onSelect(item.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); move(index, index + 1); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); move(index, index - 1); }
                else if (e.key === "Home") { e.preventDefault(); move(index, 0); }
                else if (e.key === "End") { e.preventDefault(); move(index, items.length - 1); }
              }}
              className={`relative flex h-full flex-col items-center gap-2 rounded-2xl border px-2.5 pb-4 pt-3 text-center shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${
                compact ? "w-[120px]" : "w-[144px]"
              } ${
                selected
                  ? "border-[rgb(var(--shop-rar))] bg-surface-1 shadow-[0_5px_16px_rgba(0,0,0,0.12)] ring-1 ring-[rgb(var(--shop-rar))]"
                  : "border-[var(--chrome-hairline)] bg-surface-1 hover:border-[rgb(var(--shop-rar))]"
              }`}
            >
              <span className="self-start rounded-full bg-[rgb(var(--shop-rar)/0.12)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-hi">
                {shopRarityOf(item.rarity).label}
              </span>
              <span className={`flex w-full items-center justify-center rounded-xl bg-[radial-gradient(ellipse_at_center,rgb(var(--shop-rar)/0.18),transparent_75%)] ${compact ? "h-[76px]" : "h-24"}`}>
                {category === "DICE_SKIN"
                  ? <DiceMaterialSwatch skinId={item.id} />
                  : <CollectibleThumbnail item={item} category={category} isSelected={selected} rarity={item.rarity} />}
              </span>
              <span className="line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-tight text-ink-hi">
                {item.name}
              </span>
              <span className="mt-auto"><TileState item={item} owned={isOwned(item)} equipped={isEquipped(item)} /></span>
              <span
                aria-hidden
                className="absolute inset-x-4 bottom-0 h-[3px] rounded-full"
                style={{ background: "rgb(var(--shop-rar))" }}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
