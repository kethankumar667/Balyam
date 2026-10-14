import type { GameKind, PublicPresentationLoadout } from "@shared/types";
import { getDefaultCosmetic, type CosmeticGameScope, type ResolvedCosmeticsLoadout } from "@shared/cosmetics";

/**
 * What a player tells the room about how they look: their aura, title, token and dice.
 *
 * Kept free of React and of the cosmetics store on purpose. The store sends this to the room, and the
 * resolver hooks read the store, so putting it in the resolver would make the two import each other.
 *
 * The token travels in the Ludo slot whatever the game: the server checks `tokenSkin` against that slot
 * alone (`sanitizePublicPresentation`), and the GLOBAL slot never holds a token. Reading GLOBAL, as a
 * caller that does not know the game used to, silently sent the default pawn.
 */
export function getPublicPresentationLoadout(
  resolved: ResolvedCosmeticsLoadout,
  game?: GameKind,
): PublicPresentationLoadout {
  return {
    avatarAura: resolved.avatarAura !== "aura_none" ? resolved.avatarAura : undefined,
    podiumTitle: resolved.podiumTitle !== "title_none" ? resolved.podiumTitle : undefined,
    tokenSkin: resolved.tokenSkins.ludo,
    diceSkin: diceSkinFor(resolved, game),
  };
}

/** The game's own slot when the game is known; otherwise whichever of Global and Ludo was actually chosen. */
function diceSkinFor(resolved: ResolvedCosmeticsLoadout, game: GameKind | undefined): string {
  if (game) return resolved.diceSkins[game as CosmeticGameScope] ?? resolved.diceSkins.GLOBAL;
  const defaultDice = getDefaultCosmetic("DICE_SKIN", "GLOBAL").id;
  return resolved.diceSkins.GLOBAL !== defaultDice ? resolved.diceSkins.GLOBAL : resolved.diceSkins.ludo;
}
