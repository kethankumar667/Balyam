import { Swords } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";

export default function TournamentsPage() {
  return (
    <ComingSoonGate
      title="Tournament Arena"
      subtitle="Competitive Brackets & Seasonal Cups"
      description="The official BHALYAM tournament system is currently under development. Soon you'll be able to enter live knockout brackets, compete in seasonal championships, and win arena trophies."
      icon={Swords}
      iconBgGradient="from-amber-600 via-yellow-500 to-amber-500"
      accentColor="text-amber-400"
      features={[
        "Daily Knockout & Round-Robin Brackets",
        "Seasonal Championship Leaderboards",
        "Exclusive Champion Badges & Arena Titles",
        "Automated Match Scheduling & Live Spectating",
      ]}
    />
  );
}
