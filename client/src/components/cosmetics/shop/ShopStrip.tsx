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
import { rarityVars } from "./shopRarity";

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
      className="flex snap-x snap-proximity gap-2 overflow-x-auto px-3 pb-3 pt-1 [scrollbar-color:rgb(var(--shop-rar)/0.6)_transparent] [scrollbar-width:thin] sm:px-0"
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
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-2 pb-3.5 pt-2 text-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
                compact ? "w-[92px]" : "w-[120px]"
              } ${
                selected
                  ? "bg-surface-1 shadow-[0_3px_10px_rgba(0,0,0,0.14)] ring-2 ring-[rgb(var(--shop-rar))]"
                  : "bg-surface-1/55 hover:bg-surface-1"
              }`}
            >
              <span className={`flex items-center justify-center ${compact ? "h-[52px] w-[52px]" : "h-16 w-16"}`}>
                <CollectibleThumbnail item={item} category={category} isSelected={selected} rarity={item.rarity} />
              </span>
              <span className="line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-tight text-ink-hi">
                {item.name}
              </span>
              <TileState item={item} owned={isOwned(item)} equipped={isEquipped(item)} />
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
