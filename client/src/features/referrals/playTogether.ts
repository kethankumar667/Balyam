/**
 * "Play with <friend>": the shortest path from a friend who has joined to a match that counts.
 *
 * A friend only qualifies (and both sides only earn the referral bonus) after a match with another
 * person, so the page offers to make that match. It cannot message the friend itself, because the app
 * never holds anyone's phone number: it creates the room and then names the friend in the share message,
 * and the member picks the friend's chat.
 */

import { GAME_LIMITS } from "@shared/catalog";
import type { GameKind } from "@shared/types";
import { BHALYAM_GAMES, isLocked, type BhalyamGameCard } from "../../components/bhalyam/data";
import { gameLaunch } from "../../lib/gameLaunch";

export type PlayTogetherSlug = GameKind;

export interface PlayTogetherGame {
  slug: PlayTogetherSlug;
  label: string;
  /** Who it takes and how long it runs, from the catalogue ("2–6 Players · 10–20 min"). */
  hint: string;
}

/** A room game two people can start: it has a room, and its limits allow exactly two players. */
function isPairGame(card: BhalyamGameCard): card is BhalyamGameCard & { slug: PlayTogetherSlug } {
  if (isLocked(card) || gameLaunch(card.slug).kind !== "room-sheet") return false;
  const limits = GAME_LIMITS[card.slug as GameKind];
  return limits !== undefined && limits.min <= 2 && limits.max >= 2;
}

function hintFor(card: BhalyamGameCard): string {
  const parts = [card.playerRange, card.duration].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : card.blurb;
}

/**
 * Every multiplayer game in the app that a pair can play, in the catalogue's own order. It is read from the catalogue
 * rather than listed here, so a new game appears by itself and a solo game, a browser-only game or one under
 * maintenance never does (see playTogether.test.ts).
 */
export const PLAY_TOGETHER_GAMES: readonly PlayTogetherGame[] = BHALYAM_GAMES.filter(isPairGame).map((card) => ({
  slug: card.slug,
  label: card.title,
  hint: hintFor(card),
}));

/** The router state `AppLayout` reads once to open that game's create-room sheet for this friend. */
export interface PlayTogetherHandOff {
  newRoom: PlayTogetherSlug;
  inviteFriend: string;
}

export function playTogetherHandOff(slug: PlayTogetherSlug, friendName: string): PlayTogetherHandOff {
  return { newRoom: slug, inviteFriend: friendName };
}

/**
 * Share text for a room made for one friend. The URL stays out of it, like every other share message here:
 * the OS share sheet pastes it separately, and putting it in twice shows the link twice in the chat.
 */
export function friendInviteMessage(friendName: string, gameName: string, roomCode: string): string {
  return `${friendName}, I'm waiting for you in ${gameName} on BHALYAM!\n\nRoom code: ${roomCode}\nJoin here:`;
}
