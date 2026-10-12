import { useId } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Coins, ShieldCheck, Trophy, Users, X, type LucideIcon } from "lucide-react";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS } from "@shared/faucet";
import { MEMBER_WELCOME_COINS } from "@shared/carryover";
import Modal from "../Modal";
import { GoogleButton } from "./AuthControls";
import { useSignUp } from "./useAccountAuth";
import { useSignInInvite } from "../../hooks/useSignInInvite";
import { AVATARS } from "../../lib/avatars";

const MODAL_Z = 55;
const MS_PER_HOUR = 60 * 60 * 1000;
const FAUCET_HOURS = Math.round(FAUCET_COOLDOWN_MS / MS_PER_HOUR);

/** Five friends around the table, spread across the avatar set so no two look alike. */
const GUESTS = [2, 11, 24, 33, 45].map((i) => AVATARS[i % AVATARS.length]);

interface Benefit {
  Icon: LucideIcon;
  title: string;
  body: string;
}

/*
 * Only things that are true today, and the numbers come from the same
 * constants the server pays out from — so this copy cannot drift from what a
 * new member really receives.
 */
const BENEFITS: readonly Benefit[] = [
  {
    Icon: Users,
    title: "Your own room, one link away",
    body: "Share it on WhatsApp and your family is at the table in seconds.",
  },
  {
    Icon: Coins,
    title: `${MEMBER_WELCOME_COINS.toLocaleString()} welcome coins`,
    body: `Plus a free ${FAUCET_AMOUNT_COINS} every ${FAUCET_HOURS} hours, whenever you stop by.`,
  },
  {
    Icon: Trophy,
    title: "Your wins travel with you",
    body: "Your level, coins and name stay yours on every device.",
  },
];

/**
 * The warm, once-per-first-visit invitation to sign in.
 *
 * Mounted in the app layout; it renders nothing until `useSignInInvite` says
 * the moment has come (two minutes in, a first-time guest, somewhere that is
 * not a live table). See `lib/signInInvite.ts` for the rule.
 */
export default function SignInInvitation() {
  const { open, dismiss } = useSignInInvite();
  if (!open) return null;
  return <InvitationDialog onClose={dismiss} />;
}

function InvitationDialog({ onClose }: { onClose: () => void }) {
  const { loading, error, withGoogle } = useSignUp();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();

  return (
    <Modal
      open
      onClose={onClose}
      mobileSheet
      zIndex={MODAL_Z}
      ariaLabelledBy={titleId}
      ariaDescribedBy={bodyId}
      className="auth-shell"
      panelClassName="relative w-full sm:max-w-[440px] overflow-hidden rounded-t-3xl sm:rounded-3xl
                      border border-[var(--auth-card-edge)] bg-[var(--auth-card)]
                      shadow-[0_-8px_40px_-12px_rgba(74,44,18,0.5)] max-h-[92dvh] overflow-y-auto overscroll-contain"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {/* The hero: friends gathering, in the app's own faces. Decorative, so hidden from screen readers. */}
        <div
          aria-hidden="true"
          className="flex justify-center bg-gradient-to-b from-[#FBE3A8] via-[#FFF0CF] to-transparent px-5 pb-5 pt-9
                     dark:from-[#3A2C10] dark:via-[#241D14] dark:to-transparent"
        >
          <div className="flex -space-x-3">
            {GUESTS.map((avatar, i) => (
              <motion.span
                key={avatar.id}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: i % 2 === 0 ? 0 : -6 }}
                transition={{ delay: reduceMotion ? 0 : 0.12 + i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                className="h-14 w-14 overflow-hidden rounded-full ring-4 ring-[var(--auth-card)] shadow-md sm:h-16 sm:w-16"
              >
                <img src={avatar.src} alt="" loading="lazy" decoding="async" className="h-full w-full scale-[1.2] object-cover" />
              </motion.span>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-6">
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--auth-accent)]">
            Welcome to Bhalyam
          </p>
          <h2 id={titleId} className="bhalyam-display mt-2 text-center text-[27px] leading-tight text-[var(--auth-ink)] sm:text-[30px]">
            Your table is waiting.
          </h2>
          <p id={bodyId} className="mx-auto mt-3 max-w-[34ch] text-center text-[15px] leading-relaxed text-[var(--auth-ink-soft)]">
            Ludo with the cousins, Rummy with the whole family. Wherever everyone happens to be, there is always a seat for them here.
          </p>

          <ul className="mt-6 space-y-3.5">
            {BENEFITS.map(({ Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bhalyam-gold-leaf text-bhalyam-wood-dark
                             shadow-[0_6px_14px_-8px_rgba(228,177,40,0.8)]"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-extrabold leading-snug text-[var(--auth-ink)]">{title}</span>
                  <span className="block text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2.5">
            <GoogleButton
              onClick={() => {
                if (!loading) withGoogle();
              }}
              label={loading ? "Opening Google…" : "Continue with Google"}
            />

            {error && (
              <p role="alert" className="rounded-xl border border-[var(--auth-bad-edge)] bg-[var(--auth-bad-bg)] px-3 py-2 text-sm font-semibold text-[var(--auth-bad-ink)]">
                {error}
              </p>
            )}

            <Link
              to="/signup"
              onClick={onClose}
              className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border-2 border-[var(--auth-field-edge)] bg-[var(--auth-field)]
                         px-6 text-[15px] font-extrabold text-[var(--auth-ink)] transition-colors hover:bg-[var(--auth-rule)]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
            >
              Sign up with email
            </Link>
          </div>

          <p className="mt-4 flex items-start justify-center gap-2 text-center text-[12.5px] leading-relaxed text-[var(--auth-ink-mute)]">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              We only receive your name and email from Google, and never post on your behalf.{" "}
              <Link
                to="/privacy"
                onClick={onClose}
                className="inline-flex min-h-[32px] items-center rounded-sm font-bold text-[var(--auth-accent)] underline decoration-[#D9BE7A] underline-offset-4
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
              >
                Privacy notice
              </Link>
            </span>
          </p>

          <div className="mt-3 flex flex-col items-center gap-1 text-sm">
            <p className="text-[var(--auth-ink-soft)]">
              Already a member?{" "}
              <Link
                to="/login"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center rounded-sm font-extrabold text-[var(--auth-accent)] underline decoration-[#D9BE7A] underline-offset-4
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
              >
                Sign in
              </Link>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full px-5 text-[14px] font-bold text-[var(--auth-ink-mute)] transition-colors hover:text-[var(--auth-ink)]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
            >
              Maybe later
            </button>
          </div>
        </div>
      </motion.div>

      {/* After the content in the DOM so the first thing a keyboard lands on is the sign-in button, not this. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-[var(--auth-ink-soft)]
                   transition-colors hover:bg-black/10 hover:text-[var(--auth-ink)] dark:bg-white/10 dark:hover:bg-white/20
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </Modal>
  );
}
