import type { ReferralLiveEvent, ReferralLiveKind } from "@shared/referrals";
import type { ToastType } from "./toastStore";

const KINDS: readonly ReferralLiveKind[] = ["friend_joined", "friend_played", "bonus_on_the_way", "bonus_landed"];
/** A display name is at most 20 characters on the server; anything longer than this is not one. */
const MAX_NAME_LENGTH = 40;
const MAX_COINS = 1_000_000;

/**
 * Accepts a `referral:update` payload only if it is exactly what the server sends: a known kind, a short name,
 * and (where present) a whole number of coins. Anything else is dropped, because this text goes straight on screen
 * and the socket is an input like any other.
 */
export function parseReferralLiveEvent(input: unknown): ReferralLiveEvent | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  if (typeof value.kind !== "string" || !(KINDS as readonly string[]).includes(value.kind)) return null;
  if (typeof value.friendName !== "string") return null;
  const friendName = value.friendName.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  if (friendName === "" || friendName.length > MAX_NAME_LENGTH) return null;
  let coins: number | undefined;
  if (value.coins !== undefined) {
    if (typeof value.coins !== "number" || !Number.isInteger(value.coins) || value.coins < 0 || value.coins > MAX_COINS) return null;
    coins = value.coins;
  }
  const at = typeof value.at === "number" && Number.isFinite(value.at) ? value.at : Date.now();
  return { kind: value.kind as ReferralLiveKind, friendName, ...(coins === undefined ? {} : { coins }), at };
}

const formatCoins = (coins: number): string => coins.toLocaleString("en-IN");

export interface ReferralLiveNotice {
  message: string;
  type: ToastType;
  /** Whether the notice points at the Referrals page ("See invitations"). */
  linksToPage: boolean;
}

/** The sentence for each moment. Names are shown as given; wording never assumes anyone's gender. */
export function describeReferralLiveEvent(event: ReferralLiveEvent): ReferralLiveNotice {
  const coins = event.coins === undefined ? "" : `${formatCoins(event.coins)} coins`;
  switch (event.kind) {
    case "friend_joined":
      return { message: `${event.friendName} joined with your code.`, type: "info", linksToPage: true };
    case "friend_played":
      return {
        message: coins
          ? `${event.friendName} played their first match. ${coins} are on the way to you.`
          : `${event.friendName} played their first match.`,
        type: "success",
        linksToPage: true,
      };
    case "bonus_on_the_way":
      return {
        message: coins
          ? `You played your first match. ${coins} from ${event.friendName}'s invitation are on the way.`
          : `You played your first match. Your bonus from ${event.friendName}'s invitation is on the way.`,
        type: "success",
        linksToPage: false,
      };
    case "bonus_landed":
      return {
        message: coins ? `${coins} landed in your wallet, thanks to ${event.friendName}.` : `Your friend bonus from ${event.friendName} landed in your wallet.`,
        type: "success",
        linksToPage: false,
      };
  }
}
