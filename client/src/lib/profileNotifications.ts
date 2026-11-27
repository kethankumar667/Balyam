import type { BhalyamGameSlug } from "../components/bhalyam/data";

export interface NotificationItem {
  id: string;
  /** `gang` is a digest of missed chat; `gang_invite` is one shared room. */
  type: "invite" | "reward" | "reunion" | "trophy" | "gang" | "gang_invite";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  gameSlug?: BhalyamGameSlug;
  roomCode?: string;
  gangId?: string;
  gangHandle?: string;
  /** The chat message that carried a `gang_invite`. */
  inviteMessageId?: string;
}
