import type { BhalyamGameSlug } from "../components/bhalyam/data";

export interface NotificationItem {
  id: string;
  /** `mandali` is a digest of missed chat; `mandali_invite` is one shared room. */
  type: "invite" | "reward" | "gang" | "trophy" | "mandali" | "mandali_invite";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  gameSlug?: BhalyamGameSlug;
  roomCode?: string;
  mandaliId?: string;
  mandaliHandle?: string;
  /** The chat message that carried a `mandali_invite`. */
  inviteMessageId?: string;
}
