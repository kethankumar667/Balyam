import { Users, Gamepad2, Activity, UserX, UserCheck, Radio } from "lucide-react";
import StatCard from "../stat-card";
import { useAdminLiveStore } from "../../../store/adminLiveStore";

export default function GlobalHealthStrip() {
  const platform = useAdminLiveStore((s) => s.platform);
  const isLoading = useAdminLiveStore((s) => s.isLoading && !s.platform);

  return (
    <section aria-label="Platform Health Metrics" className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Online Users */}
        <StatCard
          title="Online Users"
          value={platform ? platform.onlineHumans : "—"}
          icon={<Users className="w-5 h-5" aria-hidden="true" />}
          subtitle={platform ? `${platform.activeBots} bots active` : "Counting seats..."}
          loading={isLoading}
          badge={
            platform && platform.activeBots > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                +{platform.activeBots} AI
              </span>
            ) : undefined
          }
        />

        {/* 2. Active Rooms */}
        <StatCard
          title="Active Rooms"
          value={platform ? platform.activeRooms : "—"}
          icon={<Gamepad2 className="w-5 h-5" aria-hidden="true" />}
          subtitle={
            platform
              ? `${platform.lobbyRooms} in lobby · ${platform.abandonmentRate}% abandon (since server start)`
              : "Counting rooms..."
          }
          loading={isLoading}
          badge={
            platform ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {platform.lobbyRooms} Lobby
              </span>
            ) : undefined
          }
        />

        {/* 3. Live Matches */}
        <StatCard
          title="Live Matches"
          value={platform ? platform.runningMatches : "—"}
          icon={<Activity className="w-5 h-5" aria-hidden="true" />}
          subtitle={
            platform
              ? platform.hostMigrationCount > 0
                ? `${platform.hostMigrationCount} host failovers (since server start)`
                : "Authoritative engines"
              : "Monitoring..."
          }
          loading={isLoading}
          badge={
            platform && platform.recoveringRooms > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {platform.recoveringRooms} Recovery
              </span>
            ) : undefined
          }
        />

        {/* 4. Disconnected Users */}
        <StatCard
          title="Disconnected"
          value={platform ? platform.disconnectedUsers : "—"}
          icon={<UserX className="w-5 h-5" aria-hidden="true" />}
          subtitle={
            platform
              ? platform.recoverySuccessRate === null
                ? "Recovery rate: N/A (no completed recoveries yet)"
                : `${platform.recoverySuccessRate}% recovery rate`
              : "Tracking grace..."
          }
          loading={isLoading}
          badge={
            platform && platform.disconnectedUsers > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                In Grace
              </span>
            ) : undefined
          }
        />

        {/* 5. Rejoin Eligible */}
        <StatCard
          title="Rejoin Ready"
          value={platform ? platform.rejoinEligibleUsers : "—"}
          icon={<UserCheck className="w-5 h-5" aria-hidden="true" />}
          subtitle="Seat tokens valid"
          loading={isLoading}
          badge={
            platform && platform.rejoinEligibleUsers > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Reclaimable
              </span>
            ) : undefined
          }
        />

        {/* 6. Socket Connections */}
        <StatCard
          title="Sockets / Conns"
          value={platform ? platform.connectedSockets : "—"}
          icon={<Radio className="w-5 h-5" aria-hidden="true" />}
          subtitle="Socket.IO transport"
          loading={isLoading}
          badge={
            platform ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Healthy
              </span>
            ) : undefined
          }
        />
      </div>
    </section>
  );
}
