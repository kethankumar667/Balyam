import type { CosmeticCategory, CosmeticGameScope } from "@shared/cosmetics";

/**
 * The part of a loadout the shop reads. Deliberately loose (every field optional, ids may be
 * null) so both the store's strict loadout and the mobile sheet's looser prop shape fit it.
 */
export interface EquippedSlots {
  tableThemes?: Readonly<Record<string, string>>;
  diceSkins?: Readonly<Record<string, string>>;
  tokenSkins?: Readonly<Record<string, string>>;
  cardBacks?: { readonly uno?: string; readonly rummy?: string };
  avatarAura?: string | null;
  podiumTitle?: string | null;
  avatarFrame?: string | null;
  carromCoinSet?: string | null;
}

/**
 * Which item is equipped in the slot the shop is looking at, whichever way the loadout happens
 * to store it. Per-game categories keep one entry per game; the others keep a single id. The
 * shop asked this question in several places with a different ladder of `if`s each time, and a
 * new category meant remembering to extend every one.
 */
export function equippedIdFor(
  equipped: EquippedSlots,
  category: CosmeticCategory,
  scope: CosmeticGameScope,
): string | null | undefined {
  switch (category) {
    case "TABLE_THEME":
      return equipped.tableThemes?.[scope];
    case "DICE_SKIN":
      return equipped.diceSkins?.[scope];
    case "TOKEN_SKIN":
      return equipped.tokenSkins?.[scope];
    case "CARD_BACK":
      return equipped.cardBacks?.[scope === "uno" ? "uno" : "rummy"];
    case "AVATAR_AURA":
      return equipped.avatarAura;
    case "PODIUM_TITLE":
      return equipped.podiumTitle;
    case "AVATAR_FRAME":
      return equipped.avatarFrame;
    case "CARROM_COIN_SET":
      return equipped.carromCoinSet;
  }
}
