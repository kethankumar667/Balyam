import { Link } from "react-router-dom";
import { SIGN_IN_PITCH } from "@shared/permissions";
import { LockIcon } from "./authIcons";

/**
 * The one thing a guest sees wherever a control is closed to them.
 *
 * ── Why a wall and not a hidden control ───────────────────────────────
 * Hiding "Create Room" would give a guest a simpler screen and no reason to
 * ever want an account. The whole argument for signing up is the thing behind
 * the lock, so the lock has to be visible and has to name what it holds. What
 * a guest must never get is a control that looks live and then fails — that
 * reads as a broken app, and they blame the game rather than the gate.
 *
 * ── Why it takes the control's place ──────────────────────────────────
 * This renders INSTEAD of the disabled button, not on top of one. A greyed-out
 * button with a tooltip is the obvious third option and it is the worst: hover
 * does not exist on a phone, which is where most of BHALYAM is played, so the
 * explanation would be unreachable exactly where it is needed.
 *
 * `reason` says what is locked in the caller's own words ("Room codes are for
 * playing with friends"), because a wall that only ever says "sign in" teaches
 * a guest nothing about which half of the product they are missing.
 */
export interface SignInWallProps {
  /** What is locked, in one short line. Shown above the pitch. */
  reason: string;
  /**
   * Carried into the sign-up screen so it can say what the player was doing
   * when they hit the wall, and so an abandoned sign-up can send them back.
   */
  from?: string;
  /** Tightens the padding where the wall sits inside an already-dense panel. */
  compact?: boolean;
}

export default function SignInWall({ reason, from, compact }: SignInWallProps) {
  const to = from ? `/signup?from=${encodeURIComponent(from)}` : "/signup";

  return (
    <div
      className={`rounded-2xl border-2 border-dashed
                  border-[#EEDBCA] dark:border-slate-700
                  bg-[#FFF9EE] dark:bg-[#0B0F19]
                  ${compact ? "p-3.5" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0
                     bg-[#F6E7CC] dark:bg-slate-800
                     text-[#8A6D4B] dark:text-amber-300"
        >
          <LockIcon className="w-[18px] h-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold leading-snug text-[#2B3550] dark:text-slate-100">
            {reason}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#8A6D4B] dark:text-slate-400">
            {SIGN_IN_PITCH}. Your name and avatar come with you.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              to={to}
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full
                         bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500
                         hover:from-amber-300 hover:to-orange-400
                         text-slate-950 font-extrabold text-[13.5px]
                         border border-amber-300/60 active:scale-[0.98]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70
                         shadow-[0_6px_18px_-6px_rgba(245,158,11,0.6)]
                         transition-[filter,transform] duration-150"
            >
              Create free account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full
                         font-bold text-[13px]
                         text-[#8A6D4B] dark:text-slate-300
                         hover:text-[#2B3550] dark:hover:text-slate-100
                         hover:bg-[#F6E7CC] dark:hover:bg-slate-800
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70
                         transition-colors duration-150"
            >
              I have one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
