import type { MandaliMember, MandaliMessage } from "@shared/mandali/types.js";
import type { RoomInviteStatus } from "@shared/mandali/notifications.js";
import { gameLabel, plainGameName } from "./games";

/**
 * What the "who's around" strip shows, worked out from facts the hub already holds: members'
 * presence, the shared-room cards in the chat, and those rooms' live status. Nothing here asks the
 * server for anything new, and nothing is invented: an empty answer means the strip stays hidden.
 */

/** A shared room older than this is a leftover from another evening, not an open table. */
export const OPEN_TABLE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
/** How many open tables the strip offers at once. More than two is a list, not a nudge. */
export const OPEN_TABLES_MAX = 2;
/** How many faces fit before "+N". */
export const AROUND_FACES_MAX = 6;

const PRESENCE_ORDER: Record<MandaliMember["presence"], number> = { online: 0, "in-game": 1, idle: 2, offline: 3 };

/** Everyone else in the group who is here right now, most reachable first. Offline people are not "around". */
export function whoIsAround(members: readonly MandaliMember[], selfId: string | null): MandaliMember[] {
  return members
    .filter((m) => m.state === "ACTIVE" && m.playerId !== selfId && m.presence !== "offline")
    .map((m, index) => ({ m, index }))
    .sort((a, b) => PRESENCE_ORDER[a.m.presence] - PRESENCE_ORDER[b.m.presence] || a.index - b.index)
    .map(({ m }) => m);
}

export interface PlayingSummary {
  first: MandaliMember;
  /** The game the first person is in, as people say it. */
  game: string;
  /** How many others are also in a game. */
  others: number;
}

/** Who is mid-match, for the one line "Bala is playing Ludo". Null when nobody is. */
export function playingSummary(around: readonly MandaliMember[]): PlayingSummary | null {
  const playing = around.filter((m) => m.presence === "in-game");
  const first = playing[0];
  if (!first) return null;
  return { first, game: first.activeGame ? gameLabel(first.activeGame) : "", others: playing.length - 1 };
}

export interface OpenTable {
  code: string;
  hostName: string;
  hostAvatar: string | undefined;
  /** Room name if the host gave one, else "<Game> room". */
  title: string;
  gameName: string;
  players: number;
  maxPlayers: number;
}

/**
 * Rooms friends shared into the chat that are still waiting for players: newest first, recent only,
 * and only while the live status says OPEN and the viewer is not already seated. A status that has
 * not arrived yet is not "open": showing a Join that may be dead is worse than showing nothing.
 */
export function pickOpenTables(
  messages: readonly MandaliMessage[],
  statuses: Readonly<Record<string, RoomInviteStatus>>,
  now: number,
): OpenTable[] {
  const seen = new Set<string>();
  const tables: OpenTable[] = [];
  for (let i = messages.length - 1; i >= 0 && tables.length < OPEN_TABLES_MAX; i -= 1) {
    const message = messages[i];
    const code = message.roomCode;
    if (message.kind !== "ROOM_INVITE" || !code || message.content === "" || seen.has(code)) continue;
    seen.add(code);
    if (now - message.timestamp > OPEN_TABLE_MAX_AGE_MS) continue;
    const status = statuses[code];
    if (!status || status.state !== "OPEN" || status.youAreIn) continue;

    const meta = message.roomInvite;
    const gameName = plainGameName(meta?.gameName ?? "") || (meta?.game ? gameLabel(meta.game) : "Game");
    tables.push({
      code,
      hostName: meta?.hostName ?? message.senderName,
      hostAvatar: message.senderAvatar,
      title: meta?.roomName || `${gameName} room`,
      gameName,
      players: status.players,
      maxPlayers: status.maxPlayers || meta?.maxPlayers || 0,
    });
  }
  return tables;
}
