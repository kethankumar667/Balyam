import { useState } from "react";
import {
  Sliders,
  Shield,
  Gamepad2,
  Coins,
  Bell,
  Palette,
  Wrench,
  Key,
  Save,
  CheckCircle2,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import LoadingState from "../../../components/admin/loading-state";
import EmptyState from "../../../components/admin/empty-state";
import MockDataBanner from "../../../components/admin/mock-data-banner";

type SettingsTab =
  | "general"
  | "auth"
  | "gameplay"
  | "economy"
  | "notifications"
  | "security"
  | "branding"
  | "maintenance";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(false);
  const [savedAlert, setSavedAlert] = useState<string | null>(null);

  const handleTabChange = (tab: SettingsTab) => {
    setLoading(true);
    setActiveTab(tab);
    setTimeout(() => setLoading(false), 200);
  };

  // General state
  const [platformName, setPlatformName] = useState("BHALYAM Multiplayer Lounge");
  const [defaultLocale, setDefaultLocale] = useState("en-IN");
  const [allowGuestPlay, setAllowGuestPlay] = useState(true);

  // Gameplay state
  const [defaultTurnTime, setDefaultTurnTime] = useState(30);
  const [disconnectGraceMs, setDisconnectGraceMs] = useState(60000);
  const [autoFillBots, setAutoFillBots] = useState(true);

  // Economy state
  const [startingTokens, setStartingTokens] = useState(500);
  const [winRewardTokens, setWinRewardTokens] = useState(100);

  // Notifications state
  const [discordWebhook, setDiscordWebhook] = useState("https://discord.com/api/webhooks/bhalyam-alerts");
  const [slackAlerts, setSlackAlerts] = useState(true);

  // Security state
  const [rateLimitMax, setRateLimitMax] = useState(120);
  const [enforceHmac, setEnforceHmac] = useState(true);

  // Branding state
  const [accentColor, setAccentColor] = useState("#E4B128");
  const [darkThemeDefault, setDarkThemeDefault] = useState(true);

  // Maintenance state
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceNotice, setMaintenanceNotice] = useState("Platform undergoing scheduled engine optimization.");

  const handleSave = () => {
    setSavedAlert("Local demonstration completed — these settings were not saved, and will reset on refresh.");
    setTimeout(() => setSavedAlert(null), 3000);
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Sliders }> = [
    { id: "general", label: "General", icon: Sliders },
    { id: "auth", label: "Authentication", icon: Key },
    { id: "gameplay", label: "Gameplay", icon: Gamepad2 },
    { id: "economy", label: "Economy", icon: Coins },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Platform Operational Settings"
        description="Configure runtime engine parameters, matchmaking grace periods, token rewards, webhook integrations, and security policies."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Settings</span>
          </button>
        }
      />

      <MockDataBanner kind="mock" />

      {savedAlert && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ {savedAlert}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-[var(--chrome-hairline)] scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black shadow-xs"
                  : "text-[var(--chrome-ink-soft)] hover:bg-[var(--chrome-control)] hover:text-[var(--chrome-ink)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Form Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs max-w-4xl">
        {loading ? (
          <LoadingState variant="table" rows={4} />
        ) : (
          <>
            {/* Tab 1: General */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
                  General Platform Identity
                </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Platform Public Title
                </label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Default Regional Locale
                </label>
                <select
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)]"
                >
                  <option value="en-IN">English (India) - en-IN</option>
                  <option value="te-IN">Telugu (తెలుగు) - te-IN</option>
                  <option value="hi-IN">Hindi (हिन्दी) - hi-IN</option>
                  <option value="en-US">English (US) - en-US</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--chrome-hairline)] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--chrome-ink)]">
                  Allow Guest Pass & Play Mode
                </h4>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Enable anonymous multiplayer matches without mandatory login.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowGuestPlay}
                onChange={(e) => setAllowGuestPlay(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Auth */}
        {activeTab === "auth" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Authentication & Session Configuration
            </h3>

            <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)]">
              Supabase Auth Bridge mode: <strong>CLIENT DIRECT + SERVER VERIFIED</strong>. Sessions validated with HMAC cryptographic seat tokens.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  JWT Expiry Duration
                </label>
                <input
                  type="text"
                  defaultValue="604800 (7 Days)"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink-soft)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Social Google Auth
                </label>
                <input
                  type="text"
                  defaultValue="Enabled (OAuth 2.0 PKCE)"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink-soft)] font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Gameplay */}
        {activeTab === "gameplay" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Game Engine Pacing & Timers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Default Turn Countdown (seconds)
                </label>
                <input
                  type="number"
                  value={defaultTurnTime}
                  onChange={(e) => setDefaultTurnTime(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Disconnect Grace Period (ms)
                </label>
                <input
                  type="number"
                  value={disconnectGraceMs}
                  onChange={(e) => setDisconnectGraceMs(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--chrome-hairline)] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--chrome-ink)]">
                  Auto-Fill Vacant Seats with AI Bots
                </h4>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Automatically allocate bots if public matchmaking exceeds 30s.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoFillBots}
                onChange={(e) => setAutoFillBots(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Economy */}
        {activeTab === "economy" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Virtual Token & Rewards Economy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Starting Wallet Tokens (New Player)
                </label>
                <input
                  type="number"
                  value={startingTokens}
                  onChange={(e) => setStartingTokens(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Match Victory Reward
                </label>
                <input
                  type="number"
                  value={winRewardTokens}
                  onChange={(e) => setWinRewardTokens(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Administrative Webhooks & Alerts
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                Discord Operations Webhook URL
              </label>
              <input
                type="url"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="pt-4 border-t border-[var(--chrome-hairline)] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--chrome-ink)]">
                  Critical Error Slack Notifications
                </h4>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Post unhandled exception alerts directly to internal monitoring channels.
                </p>
              </div>
              <input
                type="checkbox"
                checked={slackAlerts}
                onChange={(e) => setSlackAlerts(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 6: Security */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Security & DDoS Rate Limiting
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Max Socket Events / Min per IP
                </label>
                <input
                  type="number"
                  value={rateLimitMax}
                  onChange={(e) => setRateLimitMax(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  HMAC Signature Algorithm
                </label>
                <input
                  type="text"
                  defaultValue="SHA-256 (Node Crypto)"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink-soft)] font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--chrome-hairline)] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--chrome-ink)]">
                  Strict HMAC Seat Token Verification
                </h4>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Drop game move dispatches if seat token signature validation fails.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enforceHmac}
                onChange={(e) => setEnforceHmac(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 7: Branding */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Visual Theme & Accent Tokens
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Primary Accent Color (HEX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-[var(--chrome-border)] cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-mono focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                  Default Lounge Mode
                </label>
                <select
                  value={darkThemeDefault ? "dark" : "light"}
                  onChange={(e) => setDarkThemeDefault(e.target.value === "dark")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)]"
                >
                  <option value="dark">Dark Theme (Vintage Parlor Dark)</option>
                  <option value="light">Light Theme (Warm Paper Canvas)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Maintenance */}
        {activeTab === "maintenance" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--chrome-ink)]">
              Maintenance Mode & Room Worker Draining
            </h3>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 font-medium">
              Enabling maintenance mode prevents new rooms from being created while allowing active in-flight matches to complete.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1">
                Maintenance Banner Message
              </label>
              <textarea
                rows={3}
                value={maintenanceNotice}
                onChange={(e) => setMaintenanceNotice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="pt-4 border-t border-[var(--chrome-hairline)] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--chrome-ink)]">
                  Activate Maintenance Mode (Drain Mode)
                </h4>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Block room creation and show lobby notice.
                </p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceActive}
                onChange={(e) => setMaintenanceActive(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </>
    )}
  </div>
</AdminLayout>
  );
}
