export type OnboardingMilestone =
  | "PROFILE_COMPLETED"
  | "FIRST_MATCH_PLAYED"
  | "FIRST_WIN"
  | "FIRST_ACHIEVEMENT_UNLOCKED"
  | "FIRST_FRIEND_ADDED"
  | "FIRST_PARTY_JOINED"
  | "FIRST_TOURNAMENT_VIEWED";

export interface StarterQuest {
  id: OnboardingMilestone;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  actionRoute?: string;
  actionText: string;
}

export const STARTER_QUESTS: StarterQuest[] = [
  {
    id: "PROFILE_COMPLETED",
    title: "Claim Your Gamer Identity",
    description: "Set your custom avatar and username in your profile.",
    xpReward: 25,
    icon: "👤",
    actionRoute: "/profile",
    actionText: "Customize",
  },
  {
    id: "FIRST_MATCH_PLAYED",
    title: "Battle in Your 1st Match",
    description: "Jump into Ludo, Rummy, UNO, or any retro classic.",
    xpReward: 50,
    icon: "🎮",
    actionRoute: "/games",
    actionText: "Play Now",
  },
  {
    id: "FIRST_ACHIEVEMENT_UNLOCKED",
    title: "Unlock Your 1st Achievement",
    description: "Win a round or score points to earn your first badge.",
    xpReward: 50,
    icon: "🏆",
    actionRoute: "/games",
    actionText: "Explore",
  },
  {
    id: "FIRST_FRIEND_ADDED",
    title: "Expand Your Squad",
    description: "Send a friend request or form a multiplayer party.",
    xpReward: 50,
    icon: "🤝",
    actionRoute: "/social",
    actionText: "Social Hub",
  },
  {
    id: "FIRST_TOURNAMENT_VIEWED",
    title: "Scout the Tournament Arena",
    description: "View live competitive brackets and seasonal rewards.",
    xpReward: 25,
    icon: "⚔️",
    actionRoute: "/tournaments",
    actionText: "Tournaments",
  },
];

export interface PlayerOnboardingState {
  hasCompletedWelcome: boolean;
  completedMilestones: OnboardingMilestone[];
  completedAt?: number;
}
