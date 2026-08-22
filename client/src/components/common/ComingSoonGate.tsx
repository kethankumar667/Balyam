import { Link } from "react-router-dom";
import { Lock, ArrowLeft, Sparkles, type LucideIcon } from "lucide-react";
import AppLayout from "../layout/AppLayout";

interface ComingSoonGateProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  iconBgGradient?: string;
  accentColor?: string;
  features?: string[];
}

export default function ComingSoonGate({
  title,
  subtitle,
  description,
  icon: FeatureIcon,
  iconBgGradient = "from-amber-500 to-amber-600",
  accentColor = "text-amber-400",
  features = [],
}: ComingSoonGateProps) {
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

          {/* Main Card */}
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
            {/* Ambient Flares */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Lock Badge Icon */}
            <div className="relative z-10 flex justify-center">
              <div className="relative">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr ${iconBgGradient} p-1 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-center`}
                >
                  <div className="w-full h-full bg-stone-950 rounded-[22px] flex items-center justify-center relative">
                    <FeatureIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${accentColor}`} />
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
                Coming Soon • In Development
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--auth-ink)] tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 font-mono">
                {subtitle}
              </p>
              <p className="text-sm text-[var(--auth-ink-soft)] leading-relaxed">
                {description}
              </p>
            </div>

            {/* Upcoming Features Preview */}
            {features.length > 0 && (
              <div className="relative z-10 bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-4 sm:p-5 text-left space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden />
                  <span>Planned Features:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-[var(--auth-ink)] font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="relative z-10 pt-2 flex items-center justify-center">
              <Link
                to="/games"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-mono uppercase tracking-wider transition shadow-md min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Explore Active Games
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
