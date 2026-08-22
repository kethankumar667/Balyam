import { Users } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";

export default function SocialHubPage() {
  return (
    <ComingSoonGate
      title="Social Hub & Squads"
      subtitle="Friends, Parties & Lounge Hangouts"
      description="BHALYAM Social Hub is coming soon. Connect with lounge friends, form private parties, track shared rivalries, and challenge players directly."
      icon={Users}
      iconBgGradient="from-emerald-500 via-teal-500 to-amber-500"
      accentColor="text-emerald-400"
      features={[
        "Friend Lists & Real-Time Presence",
        "Private Squads & Party Rooms",
        "Direct Match Invites & Rematch Logs",
        "Shared Head-to-Head Match History",
      ]}
    />
  );
}
