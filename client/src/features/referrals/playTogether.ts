/**
 * "Play with <friend>": the shortest path from a friend who has joined to a match that counts.
 *
 * A friend only qualifies (and both sides only earn the referral bonus) after a match with another
 * person, so the page offers to make that match. It cannot message the friend itself, because the app
 * never holds anyone's phone number: it creates the room and then names the friend in the share message,
 * and the member picks the friend's chat.
 */

/** Games a pair can play on their own. Every slug here must allow two players (see playTogether.test.ts). */
export const PLAY_TOGETHER_GAMES = [
  { slug: "rps", label: "Rock Paper Scissors", hint: "Quick, just the two of you" },
  { slug: "handcricket", label: "Hand Cricket", hint: "Two players, a school classic" },
  { slug: "ludo", label: "Ludo", hint: "Two or more, as many as you like" },
  { slug: "dotsboxes", label: "Dots & Boxes", hint: "Draw the line, claim the box" },
] as const;

export type PlayTogetherSlug = (typeof PLAY_TOGETHER_GAMES)[number]["slug"];

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
