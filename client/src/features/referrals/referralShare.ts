import { REFERRAL_CODE_PREFIX } from "@shared/referrals";

/** The link a friend opens. It carries only the share code, so it reveals nothing about who sent it. */
export function inviteUrl(shareCode: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/invite/${encodeURIComponent(shareCode)}`;
}

/**
 * Body of the share message. The URL is kept OUT of the text because the OS share sheet pastes it separately;
 * embedding it too made the link appear twice in the receiver's chat (see RoomCodeShare).
 */
export function inviteMessage(shareCode: string, bonusCoins: number): string {
  return `Come play on BHALYAM with me! Use my code ${shareCode} when you join and we each get ${bonusCoins.toLocaleString("en-IN")} coins once you finish a match with another person.\n\nJoin here:`;
}

/** WhatsApp takes one `text` parameter, so here the URL is spliced back in. */
export function whatsappUrl(shareCode: string, bonusCoins: number, origin: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${inviteMessage(shareCode, bonusCoins)} ${inviteUrl(shareCode, origin)}`)}`;
}

/** What to show in a code field before the member has typed anything. */
export const REFERRAL_CODE_PLACEHOLDER = `${REFERRAL_CODE_PREFIX}-K7M2P`;
