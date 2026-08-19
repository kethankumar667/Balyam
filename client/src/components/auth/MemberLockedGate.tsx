import { Link } from "react-router-dom";
import {
  Lock,
  Trophy,
  Swords,
  User,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Crown,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";

export type LockedFeatureKind =
  | "tournaments"
  | "leaderboard"
  | "profile"
  | "personal"
  | "settings"
  | "social";

interface MemberLockedGateProps {
  feature: LockedFeatureKind;
  title?: string;
  description?: string;
}

const FEATURE_META: Record<
  LockedFeatureKind,
  {
    tag: string;
    title: string;
    description: string;
    icon: typeof Lock;
    perks: { icon: typeof Trophy; text: string }[];
  }
> = {
  tournaments: {
    tag: "Members Only • Tournament Arena",
    title: "Tournaments are Locked for Guests",
    description:
      "Competitive tournament brackets, seasonal cups, and champion rewards require a registered BHALYAM account. Create a free account in 30 seconds to compete.",
    icon: Swords,
    perks: [
      { icon: Swords, text: "Compete in daily knockout & round-robin tournaments" },
      { icon: Trophy, text: "Earn seasonal championship trophies and XP multipliers" },
      { icon: Crown, text: "Claim exclusive arena titles and winner badges" },
      { icon: ShieldCheck, text: "100% free forever — no ads, no paywalls" },
    ],
  },
  leaderboard: {
    tag: "Members Only • Global Rankings",
    title: "Leaderboards are Locked for Guests",
    description:
      "Global rankings, daily skill challenges, and player comparisons require a registered BHALYAM account. Join thousands of players climbing the ranks.",
    icon: Trophy,
    perks: [
      { icon: Trophy, text: "Track your position on global and game-specific leaderboards" },
      { icon: Sparkles, text: "Complete daily quests and skill-based challenges" },
      { icon: Crown, text: "Earn prestigious grandmaster badges and tier ranks" },
      { icon: ShieldCheck, text: "Verified matchmaking and fair play rating" },
    ],
  },
  profile: {
    tag: "Members Only • Player Career",
    title: "Player Profile is Locked for Guests",
    description:
      "Lifetime game statistics, persistent match histories, unlockable achievements, and career progression require a registered BHALYAM account.",
    icon: User,
    perks: [
      { icon: User, text: "Save your lifetime win rates and match history across games" },
      { icon: Sparkles, text: "Unlock 50+ achievement badges and level up your career" },
      { icon: Crown, text: "Personalize your display identity, avatar, and player bio" },
      { icon: ShieldCheck, text: "Sync your game career across mobile, desktop, and tablet" },
    ],
  },
  personal: {
    tag: "Members Only • Personal Identity",
    title: "Personal Information is Locked for Guests",
    description:
      "Managing verified emails, DPDP privacy preferences, account portability, and personal settings requires a registered BHALYAM member account.",
    icon: User,
    perks: [
      { icon: User, text: "Verified email security and recovery credentials" },
      { icon: ShieldCheck, text: "DPDP-compliant privacy control and JSON data export" },
      { icon: Crown, text: "Permanent display name and custom avatar preservation" },
      { icon: Sparkles, text: "Priority access to new game lounge beta releases" },
    ],
  },
  settings: {
    tag: "Members Only • Account Settings",
    title: "Account Settings are Locked for Guests",
    description:
      "Advanced account settings and persistent cloud preferences require a registered BHALYAM account. Create a free account or sign in to continue.",
    icon: Lock,
    perks: [
      { icon: ShieldCheck, text: "Cloud sync for game sound, theme, and haptic preferences" },
      { icon: User, text: "Account management, password controls, and active sessions" },
      { icon: Crown, text: "Full data portability and account management tools" },
      { icon: Sparkles, text: "100% free account with zero telemetry tracking" },
    ],
  },
  social: {
    tag: "Members Only • Social Hub",
    title: "Social Hub is Locked for Guests",
    description:
      "Friends lists, party invites, squads, shared match history, and player social features require a registered BHALYAM account.",
    icon: Users,
    perks: [
      { icon: Users, text: "Add friends and see when they're online and in-game" },
      { icon: Swords, text: "Challenge friends to direct matches and party games" },
      { icon: Trophy, text: "Compare shared match histories and rivalry stats" },
      { icon: ShieldCheck, text: "Private party rooms with invite-only access" },
    ],
  },
};

export default function MemberLockedGate({
  feature,
  title,
  description,
}: MemberLockedGateProps) {
  const meta = FEATURE_META[feature];
  const displayTitle = title || meta.title;
  const displayDescription = description || meta.description;
  const FeatureIcon = meta.icon;

  return (
    <AppLayout>
      <div className="min-h-[85vh] bhalyam-paper auth-shell py-8 sm:py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          {/* Breadcrumb back */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lounge
            </Link>
          </div>

          {/* Main Locked Card */}
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
            {/* Ambient Flares */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Lock Badge Icon */}
            <div className="relative z-10 flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center">
                  <div className="w-full h-full bg-stone-950 rounded-[22px] flex items-center justify-center relative">
                    <FeatureIcon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg border-2 border-stone-950">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Header / Pitch */}
            <div className="relative z-10 space-y-2.5 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-black font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Lock className="w-3 h-3" />
                {meta.tag}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--auth-ink)] tracking-tight">
                {displayTitle}
              </h1>
              <p className="text-sm text-[var(--auth-ink-soft)] leading-relaxed">
                {displayDescription}
              </p>
            </div>

            {/* Perks List */}
            <div className="relative z-10 bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-4 sm:p-5 text-left space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                ✨ Included with Free Member Account:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {meta.perks.map((perk, idx) => {
                  const PerkIcon = perk.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-[var(--auth-ink)] font-medium"
                    >
                      <PerkIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{perk.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-mono uppercase tracking-wider transition shadow-md min-h-[44px]"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--auth-control-bg)] hover:bg-[var(--auth-field)] text-[var(--auth-ink)] font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-mono border border-[var(--auth-field-edge)] transition min-h-[44px]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
