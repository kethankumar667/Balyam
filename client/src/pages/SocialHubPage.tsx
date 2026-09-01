import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Swords, MessageSquare, ShieldCheck, UserPlus, Circle, Gamepad2 } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";

interface OnlineFriend {
  id: string;
  name: string;
  avatar: string;
  status: "in-game" | "online" | "idle";
  activity: string;
}

const MOCK_FRIENDS: OnlineFriend[] = [
  { id: "f1", name: "Aditi_Pro", avatar: "A", status: "in-game", activity: "Playing Hand Cricket" },
  { id: "f2", name: "Vikram_HC", avatar: "V", status: "online", activity: "In Lounge Lobby" },
  { id: "f3", name: "Sneha_Ace", avatar: "S", status: "in-game", activity: "Playing Ludo • Room #X92K4L" },
  { id: "f4", name: "Rahul_King", avatar: "R", status: "idle", activity: "Away for 5m" },
];

export default function SocialHubPage() {
  const { isSuperAdmin, capabilities } = useAuthStore();
  const [friends, setFriends] = useState<OnlineFriend[]>(MOCK_FRIENDS);
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  if (!isSuperAdmin && !capabilities.unlockAllFeatures) {
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

  const handleInvite = (id: string) => {
    setInvited((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setInvited((prev) => ({ ...prev, [id]: false }));
    }, 4000);
  };

  return (
    <AppLayout>
      <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {/* Super Admin Unlock Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-500">
                  ⚡ Super Admin Sandbox Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                  Feature Unlocked
                </span>
              </div>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                You have full access to test, manage presence, and simulate Social Squads & Player Invites.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition"
            >
              Admin User Console →
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--chrome-ink)] flex items-center gap-3">
              <Users className="w-7 h-7 text-emerald-500" />
              Social Hub & Player Network
            </h1>
            <p className="text-xs sm:text-sm text-[var(--chrome-ink-soft)] mt-1">
              Active Friends, Presence Status & Direct Match Challenges
            </p>
          </div>
        </div>

        {/* Friends & Presence Cards / Empty State */}
        {friends.length === 0 ? (
          <div className="p-8 text-center bg-[var(--chrome-panel)] border border-[var(--chrome-border)] rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl mx-auto">
              👥
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--chrome-ink)]">No online friends yet</h3>
              <p className="text-xs text-[var(--chrome-ink-soft)] max-w-sm mx-auto">
                Invite your friends or share room codes to start building your lounge squad.
              </p>
            </div>
            <Link
              to="/games"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-sm transition min-h-[44px]"
            >
              Explore Games to Play
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((f) => (
              <div
                key={f.id}
                className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-5 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 text-base shrink-0">
                    {f.avatar}
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--chrome-panel)] ${
                        f.status === "in-game"
                          ? "bg-purple-500"
                          : f.status === "online"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--chrome-ink)] truncate">
                      {f.name}
                    </h3>
                    <p className="text-xs text-[var(--chrome-ink-soft)] flex items-center gap-1.5 mt-0.5 truncate">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          f.status === "in-game"
                            ? "bg-purple-500"
                            : f.status === "online"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span>{f.activity}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInvite(f.id)}
                    disabled={invited[f.id]}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                      invited[f.id]
                        ? "bg-emerald-500 text-zinc-950 font-black"
                        : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>{invited[f.id] ? "Invited!" : "Challenge"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
