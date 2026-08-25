import { useState } from "react";
import {
  ToggleLeft,
  Sliders,
  Sparkles,
  Server,
  Plus,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import SearchBar from "../../../components/admin/search-bar";
import StatusBadge from "../../../components/admin/status-badge";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import MockDataBanner from "../../../components/admin/mock-data-banner";

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  environment: "production" | "staging" | "canary";
  gameScope: string;
  lastModified: string;
  modifiedBy: string;
  isCircuitBreaker?: boolean;
}

const INITIAL_FLAGS: FeatureFlag[] = [
  {
    id: "ff-1",
    name: "Voice WebRTC Mesh Relay",
    key: "bhalyam.voice.webrtc_mesh",
    description: "Enables in-game low-latency peer audio mesh streaming for lobby members.",
    isEnabled: true,
    rolloutPercentage: 100,
    environment: "production",
    gameScope: "Global",
    lastModified: "Today at 21:30",
    modifiedBy: "Kethan Kumar",
  },
  {
    id: "ff-2",
    name: "Word Building Frequency Scoring",
    key: "game.wordbuilding.freq_engine_v2",
    description: "Computes dynamic bonus points based on 250k English word frequency index.",
    isEnabled: true,
    rolloutPercentage: 100,
    environment: "production",
    gameScope: "Word Building",
    lastModified: "Yesterday",
    modifiedBy: "System",
  },
  {
    id: "ff-3",
    name: "Smart TV Spectator View (/tv/:code)",
    key: "bhalyam.lounge.party_screen",
    description: "Seat-less broadcast spectator projection for big screens and living room TVs.",
    isEnabled: true,
    rolloutPercentage: 80,
    environment: "canary",
    gameScope: "Global",
    lastModified: "3 days ago",
    modifiedBy: "Kethan Kumar",
  },
  {
    id: "ff-4",
    name: "Ludo Turn Timer Penalty Reduction",
    key: "game.ludo.auto_pass_pacing",
    description: "Gradual reduction of turn time if a player idles 2 consecutive turns.",
    isEnabled: false,
    rolloutPercentage: 0,
    environment: "staging",
    gameScope: "Ludo",
    lastModified: "1 week ago",
    modifiedBy: "Teacher Padma",
  },
  {
    id: "ff-5",
    name: "Rummy Auto-Arrange AI Assistant",
    key: "game.rummy.meld_ai_suggest",
    description: "Suggests pure & impure melds with zero-latency client heuristics.",
    isEnabled: true,
    rolloutPercentage: 50,
    environment: "canary",
    gameScope: "Rummy",
    lastModified: "2 days ago",
    modifiedBy: "Master Ravi",
  },
  {
    id: "ff-6",
    name: "Anti-Cheat HMAC Token Enforcement",
    key: "security.seats.hmac_seal",
    description: "Cryptographically signs seat tokens with server secret to prevent spoofing.",
    isEnabled: true,
    rolloutPercentage: 100,
    environment: "production",
    gameScope: "Global",
    lastModified: "Jan 15, 2026",
    modifiedBy: "SuperAdmin",
    isCircuitBreaker: true,
  },
];

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);
  const [search, setSearch] = useState("");
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [saveAlert, setSaveAlert] = useState<string | null>(null);

  const filteredFlags = flags.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      f.gameScope.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated = {
            ...f,
            isEnabled: !f.isEnabled,
            lastModified: "Just now",
            modifiedBy: "You",
          };
          if (selectedFlag?.id === id) {
            setSelectedFlag(updated);
          }
          return updated;
        }
        return f;
      })
    );
    setSaveAlert("Preview updated locally — this toggle was not sent to any worker cluster or server.");
    setTimeout(() => setSaveAlert(null), 3000);
  };

  const handleRolloutChange = (id: string, pct: number) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated = {
            ...f,
            rolloutPercentage: pct,
            lastModified: "Just now",
            modifiedBy: "You",
          };
          if (selectedFlag?.id === id) {
            setSelectedFlag(updated);
          }
          return updated;
        }
        return f;
      })
    );
  };

  const activeCount = flags.filter((f) => f.isEnabled).length;
  const prodCount = flags.filter((f) => f.environment === "production").length;

  return (
    <AdminLayout>
      <PageHeader
        title="Dynamic Feature Flags"
        description="Safely roll out game mechanics, trigger circuit breakers, and tune rollout percentages across production and canary tiers."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Feature Flags" }]}
        actions={
          <button
            type="button"
            aria-disabled="true"
            aria-describedby="create-flag-unavailable"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-xs shadow-xs transition-all opacity-50 cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Create Flag</span>
          </button>
        }
      />
      <span id="create-flag-unavailable" className="sr-only">
        Not available in this preview — this page uses local demonstration data only, and no flag can be created.
      </span>

      <MockDataBanner kind="mock" />

      {saveAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {saveAlert}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Active Feature Toggles"
          value={`${activeCount} / ${flags.length}`}
          icon={<ToggleLeft className="w-5 h-5 text-amber-500" />}
          subtitle="Realtime client propagation"
        />
        <StatCard
          title="Production Rollouts"
          value={`${prodCount}`}
          icon={<Server className="w-5 h-5 text-emerald-500" />}
          subtitle="100% stable fleet"
        />
        <StatCard
          title="Canary Experiments"
          value="2 Flags"
          icon={<Sparkles className="w-5 h-5 text-orange-500" />}
          subtitle="Partial percentage gating"
        />
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by flag name, key, or game scope..."
        />
      </div>

      {/* Flags List Cards */}
      <div className="space-y-3">
        {filteredFlags.map((flag) => (
          <div
            key={flag.id}
            onClick={() => setSelectedFlag(flag)}
            className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs hover:border-amber-500/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-[var(--chrome-ink)] text-sm">
                  {flag.name}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    flag.environment === "production"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : flag.environment === "canary"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]"
                  }`}
                >
                  {flag.environment}
                </span>

                <span className="px-2 py-0.5 rounded bg-[var(--chrome-control)] text-[11px] font-bold text-[var(--chrome-ink)] border border-[var(--chrome-border)]">
                  {flag.gameScope}
                </span>

                {flag.isCircuitBreaker && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/30">
                    CIRCUIT BREAKER
                  </span>
                )}
              </div>

              <p className="text-xs text-[var(--chrome-ink-soft)] mt-1 line-clamp-1">
                {flag.description}
              </p>

              <div className="flex items-center gap-3 mt-2 font-mono text-[11px] text-[var(--chrome-ink-soft)]">
                <span>{flag.key}</span>
                <span>•</span>
                <span>Rollout: {flag.rolloutPercentage}%</span>
                <span>•</span>
                <span>Updated: {flag.lastModified}</span>
              </div>
            </div>

            {/* Toggle & Percentage quick slider */}
            <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-auto">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">
                  Rollout
                </span>
                <span className="text-xs font-bold font-mono text-[var(--chrome-ink)]">
                  {flag.rolloutPercentage}%
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => handleToggle(flag.id, e)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  flag.isEnabled ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
                role="switch"
                aria-checked={flag.isEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    flag.isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedFlag)}
        onClose={() => setSelectedFlag(null)}
        title={selectedFlag?.name ?? "Feature Flag"}
        subtitle={selectedFlag?.key}
        badge={
          selectedFlag && (
            <StatusBadge
              status={selectedFlag.isEnabled ? "active" : "inactive"}
              label={selectedFlag.isEnabled ? "Enabled" : "Disabled"}
              size="sm"
            />
          )
        }
        footer={
          selectedFlag && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFlag(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--chrome-control)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaveAlert("Local demonstration completed — this configuration was not saved to any server.");
                  setSelectedFlag(null);
                  setTimeout(() => setSaveAlert(null), 3000);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          )
        }
      >
        {selectedFlag && (
          <div className="space-y-6">
            <InfoCard
              title="Flag Metadata"
              fields={[
                { label: "Target Scope", value: selectedFlag.gameScope },
                { label: "Environment", value: selectedFlag.environment.toUpperCase() },
                { label: "Last Modifier", value: selectedFlag.modifiedBy },
                { label: "Updated At", value: selectedFlag.lastModified },
              ]}
            />

            {/* Interactive Rollout Slider */}
            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                  Canary Rollout Allocation
                </span>
                <span className="font-mono text-xs font-bold text-amber-500 dark:text-amber-400">
                  {selectedFlag.rolloutPercentage}% of player base
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={selectedFlag.rolloutPercentage}
                onChange={(e) =>
                  handleRolloutChange(selectedFlag.id, Number(e.target.value))
                }
                className="w-full h-2 bg-[var(--chrome-control-hi)] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex items-center justify-between text-[10px] text-[var(--chrome-ink-soft)] font-mono">
                <span>0% (Internal Only)</span>
                <span>50% (A/B Test)</span>
                <span>100% (Full Production)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                Evaluation Audit Stream
              </h4>
              <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
                Evaluated across 1,420 sessions in the past 24 hours. Zero runtime exception triggers recorded.
              </p>
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
