import type { BhalyamGameSlug } from "../components/bhalyam/data";

export interface NotificationItem {
  id: string;
  type: "invite" | "reward" | "gang" | "trophy";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  gameSlug?: BhalyamGameSlug;
  roomCode?: string;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "sample-invite-1",
    type: "invite",
    title: "Priya invited you to a Rummy table",
    desc: "Room ANNA42 · 3 of 4 seats filled",
    time: "2m ago",
    unread: true,
    gameSlug: "rummy",
    roomCode: "ANNA42",
  },
  {
    id: "sample-reward-1",
    type: "reward",
    title: "Daily streak bonus unlocked",
    desc: "3-day streak — claim your bonus XP",
    time: "1h ago",
    unread: true,
  },
  {
    id: "sample-gang-1",
    type: "gang",
    title: "Arjun joined your gang",
    desc: "Your friend circle now has 5 members",
    time: "5h ago",
    unread: false,
  },
  {
    id: "sample-trophy-1",
    type: "trophy",
    title: "New personal best in Hand Cricket",
    desc: "You scored 86 runs against the bot",
    time: "Yesterday",
    unread: false,
    gameSlug: "handcricket",
  },
];
