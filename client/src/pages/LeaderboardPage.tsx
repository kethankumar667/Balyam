import { Trophy } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";

export default function LeaderboardPage() {
  return (
    <ComingSoonGate
      title="Global Leaderboards"
      subtitle="Rankings, Quests & Grandmaster Tiers"
      description="Global rankings and competitive ladder systems are currently being calibrated. Soon you'll be able to compare ratings with friends, climb division ranks, and claim weekly rewards."
      icon={Trophy}
      iconBgGradient="from-yellow-500 via-amber-500 to-amber-600"
      accentColor="text-yellow-400"
      features={[
        "Global & Game-Specific Rank Ladders",
        "Daily Skill Quests & Bonus XP Multipliers",
        "Grandmaster Tier Badges & Hall of Fame",
        "Head-to-Head Player Comparison",
      ]}
    />
  );
}
