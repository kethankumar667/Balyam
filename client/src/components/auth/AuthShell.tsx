import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftIcon, DiceIcon, KeyholeIcon } from "./authIcons";

/**
 * The frame every auth screen sits in.
 *
 * Two panels on desktop, one on a phone. The left panel is not decoration —
 * it answers the question the form provokes. BHALYAM is guest-first: you can
 * join any room with a code and never make an account, so a sign-in screen
 * that just says "Sign in" invites the reasonable reply "why?". The panel
 * says what the account is actually for, and keeps the guest route visible
 * next to it rather than buried under the form.
 *
 * On a phone that panel would push the form below the fold, which is the one
 * thing a task surface cannot afford, so it collapses to a single line under
 * the crest.
 */

export interface AuthShellProps {
  /** Screen title. The page's real heading, not a label above one. */
  title: string;
  /** One sentence under the title. */
  subtitle: string;
  children: React.ReactNode;
  /** Rendered under the form panel — the "no account yet?" style switch. */
  footer?: React.ReactNode;
  /** Where the back arrow goes. Home unless a flow has a real previous step. */
  backTo?: string;
  backLabel?: string;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  backTo = "/",
  backLabel = "Back to games",
}: AuthShellProps) {
  const reduced = useReducedMotion();

  return (
    <div className="auth-shell bhalyam-home bhalyam-font bhalyam-paper min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-6 pt-4 sm:pt-6">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-full
                     text-[14px] font-bold text-[var(--auth-ink-soft)]
                     hover:text-[var(--auth-ink)] hover:bg-[var(--auth-rule)]/45
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                     transition-colors duration-200"
        >
          <ArrowLeftIcon className="w-[18px] h-[18px]" />
          {backLabel}
        </Link>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 pb-10 sm:pb-16">
        <div
          className="mx-auto w-full max-w-[1040px] grid gap-8 lg:gap-16
                     lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center
                     min-h-[calc(100vh-140px)]"
        >
          {/* ── Why an account exists here ── */}
          <section className="hidden lg:block">
            <span
              className="inline-flex w-14 h-14 rounded-2xl items-center justify-center
                         bhalyam-gold-leaf text-bhalyam-wood-dark
                         shadow-[0_10px_22px_-8px_rgba(228,177,40,0.7)]"
              aria-hidden
            >
              <KeyholeIcon className="w-7 h-7" />
            </span>

            <h1
              className="bhalyam-display mt-6 text-[var(--auth-ink)] leading-[1.05] text-balance"
              style={{ fontSize: "clamp(2.25rem, 3.4vw, 3.25rem)", letterSpacing: "-0.01em" }}
            >
              The chest opens
              <br />
              for the host.
            </h1>

            <p className="bhalyam-script text-[var(--auth-accent)] text-[26px] leading-[1.15] mt-4">
              Everyone else just needs the code.
            </p>

            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[var(--auth-ink-soft)]">
              An account is what lets you open a room, name your table and keep the gang
              together across sessions. Joining one never needs anything but the six
              characters a friend sends you.
            </p>

            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2.5 min-h-[44px] px-4 rounded-full
                         bg-[var(--auth-card)] border border-[var(--auth-card-edge)] text-[var(--auth-ink)] font-bold text-[14px]
                         hover:bg-[var(--auth-field)] active:scale-[0.98]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                         transition-[background-color,transform] duration-200"
            >
              <DiceIcon className="w-[18px] h-[18px] text-[#B53917]" />
              <span>Just here to play? Join with a code</span>
            </Link>
          </section>

          {/* ── The task ── */}
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:max-w-[420px] mx-auto"
          >
            {/* Crest — the phone's only brand moment, so it carries the title. */}
            <div className="lg:hidden flex items-center gap-3 mb-5">
              <span
                className="inline-flex w-11 h-11 rounded-2xl items-center justify-center
                           bhalyam-gold-leaf text-bhalyam-wood-dark flex-shrink-0
                           shadow-[0_8px_18px_-8px_rgba(228,177,40,0.7)]"
                aria-hidden
              >
                <KeyholeIcon className="w-6 h-6" />
              </span>
              <p className="bhalyam-script text-[var(--auth-accent)] text-[21px] leading-[1.1]">
                Hosting needs a key.
                <br />
                Joining never does.
              </p>
            </div>

            <div
              className="rounded-[22px] border border-[var(--auth-card-edge)] bg-[var(--auth-card)]
                         p-5 sm:p-7
                         shadow-[0_18px_40px_-24px_rgba(74,44,18,0.45),0_2px_6px_-2px_rgba(74,44,18,0.12)]"
            >
              <h2
                className="bhalyam-display text-[var(--auth-ink)] text-[26px] sm:text-[28px] leading-tight"
                style={{ letterSpacing: "-0.005em" }}
              >
                {title}
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--auth-ink-soft)] max-w-[42ch]">
                {subtitle}
              </p>

              <div className="mt-6">{children}</div>
            </div>

            {footer ? <div className="mt-5 text-center">{footer}</div> : null}

            {/*
              Says out loud what is true: these screens are the design, and
              nothing behind them signs anyone in yet. Without it the pages
              look finished, and the first person to try one would reasonably
              conclude sign-in is broken rather than unbuilt.
            */}
            <p className="mt-6 text-center text-[11.5px] leading-relaxed text-[var(--auth-ink-soft)]">
              <span
                className="inline-block align-middle w-1.5 h-1.5 rounded-full bg-[#C9A227] mr-1.5"
                aria-hidden
              />
              Design preview — accounts aren&apos;t connected yet, so nothing here signs you in.
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
