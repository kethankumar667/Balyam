export interface SeasonRewardTier {
  tierId: string;
  name: string;
  minSeasonXP: number;
  badge: string;
  title: string;
  bonusXP: number;
  icon: string;
}

export const SEASON_REWARD_TIERS: SeasonRewardTier[] = [
  {
    tierId: "season_tier_1",
    name: "Initiate",
    minSeasonXP: 100,
    badge: "🥉",
    title: "Seasonal Initiate",
    bonusXP: 50,
    icon: "🌱",
  },
  {
    tierId: "season_tier_2",
    name: "Challenger",
    minSeasonXP: 300,
    badge: "🥈",
    title: "Seasonal Challenger",
    bonusXP: 100,
    icon: "⚔️",
  },
  {
    tierId: "season_tier_3",
    name: "Contender",
    minSeasonXP: 600,
    badge: "🥇",
    title: "Seasonal Contender",
    bonusXP: 200,
    icon: "🛡️",
  },
  {
    tierId: "season_tier_4",
    name: "Elite",
    minSeasonXP: 1200,
    badge: "💠",
    title: "Seasonal Elite",
    bonusXP: 400,
    icon: "💎",
  },
  {
    tierId: "season_tier_5",
    name: "Sovereign",
    minSeasonXP: 2500,
    badge: "👑",
    title: "Season Sovereign",
    bonusXP: 1000,
    icon: "🌌",
  },
];
