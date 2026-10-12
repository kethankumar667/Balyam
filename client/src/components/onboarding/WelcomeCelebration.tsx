import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Flame } from "lucide-react";
import { NEW_MEMBER_FAUCET_WAIT_MS } from "@shared/newMember";
import Modal from "../Modal";
import { CoinRain, GoldCoin } from "../faucet/CoinRain";
import { WelcomeConfetti } from "./WelcomeConfetti";
import { useCountTicker } from "../../hooks/useCountTicker";
import { refreshCurrentWallet } from "../../hooks/useEconomy";
import { claimMemberWelcome, getMemberWelcomeStatus } from "../../lib/economyApi";
import { loadAccountDetails } from "../../lib/accountGenerator";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

type Phase = "checking" | "greeting" | "claiming" | "celebrate" | "failed" | "gone";

/** Above the profile questions and the wallet drawer, below the confetti (75) and the coin rain (80). */
const MODAL_Z = 70;
const COUNT_UP_MS = 1_400;
const HOUR_MS = 60 * 60 * 1_000;

const PRIMARY_BUTTON =
  "bhalyam-gold-leaf bhalyam-cta-shine min-h-[54px] w-full cursor-pointer rounded-full border border-bhalyam-gold-dark px-6 text-base font-black text-bhalyam-wood-dark shadow-[0_8px_18px_-6px_rgba(228,177,40,0.6)] transition-[filter] hover:brightness-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70 focus-visible:ring-offset-2";

const NEXT_ROW =
  "flex items-center gap-3 rounded-2xl border border-[#EEDBCA] bg-white/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60";

/**
 * Members who are done with the welcome for this visit — welcomed, not owed one, or told "later".
 * The layout this mounts in re-mounts on every page, and each mount would otherwise ask the server
 * (three database reads) whether a welcome is owed. Held in memory on purpose: a stored flag would be
 * a new browser-storage key the privacy inventory must declare, and "ask again next visit" is the
 * behaviour wanted anyway.
 */
const settledThisVisit = new Set<string>();

/** Test hook: forget every settled member so each test starts from a fresh visit. */
export function resetWelcomeCelebrationMemo(): void {
  settledThisVisit.clear();
}

/** The name to greet: the profile's display name, which for a Google member is their own name. */
function greetingName(playerName: string): string {
  const fromProfile = playerName.trim();
  if (fromProfile) return fromProfile;
  const details = loadAccountDetails();
  return details?.displayName?.trim() || details?.firstName?.trim() || "friend";
}

/** "1 hour" / "2 hours" — the wait is a shared rule, so the words are derived from it, not typed twice. */
function hoursLabel(ms: number): string {
  const hours = Math.max(1, Math.round(ms / HOUR_MS));
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * "Welcome to BHALYAM", and the moment the welcome coins arrive.
 *
 * ── Why a moment, not a deposit ───────────────────────────────────────
 * A new member used to find 5,000 coins in their wallet with nothing to say where they came from. The
 * server now holds the welcome back (`EconomyService.claimMemberWelcome`) and this popup is what
 * releases it: the coins are paid when the member taps the one button, and the screen answers with
 * confetti, coins pouring down and the amount counting up. It also says out loud what comes next —
 * free coins open after an hour and the daily streak starts tomorrow — so neither feels like a delay.
 *
 * ── Honest about what happened ────────────────────────────────────────
 * The celebration is shown only when the server confirms. A failure says so and offers another try;
 * a wallet that was already welcomed (another tab got there first) says the coins are already in,
 * and never claims a second payment. The amount on screen is the server's, never the device's.
 *
 * It asks the server whether a welcome is owed and shows nothing otherwise, so a member who has
 * already been welcomed — or who signed up before this existed — never sees it.
 */
export default function WelcomeCelebration() {
  const isMember = useAuthStore((s) => s.isMember);
  const userId = useAuthStore((s) => s.userId);
  const playerName = useRoomStore((s) => s.playerName);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const claimRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [amount, setAmount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [raining, setRaining] = useState(false);
  const ticked = useCountTicker(paid, COUNT_UP_MS, phase === "celebrate");

  useEffect(() => {
    if (!isMember) return;
    if (userId && settledThisVisit.has(userId)) {
      setPhase("gone");
      return;
    }
    let cancelled = false;
    getMemberWelcomeStatus()
      .then((status) => {
        if (cancelled) return;
        const owed = Number(status.amount);
        if (status.pending && Number.isFinite(owed) && owed > 0) {
          setAmount(owed);
          setPhase("greeting");
          AudioManager.play(AUDIO.REWARD_UNLOCK);
        } else {
          if (userId) settledThisVisit.add(userId);
          setPhase("gone");
        }
      })
      // Not knowing is not a reason to interrupt: the next visit asks again.
      .catch(() => {
        if (!cancelled) setPhase("gone");
      });
    return () => {
      cancelled = true;
    };
  }, [isMember, userId]);

  if (phase === "checking" || phase === "gone") return null;

  const claim = async () => {
    if (phase !== "greeting" && phase !== "failed") return;
    setPhase("claiming");
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    try {
      const { applied } = await claimMemberWelcome();
      void refreshCurrentWallet();
      setPaid(applied ? amount : 0);
      setPhase("celebrate");
      if (applied) {
        setRaining(true);
        HapticsManager.trigger("reward");
        AudioManager.play(AUDIO.REWARD_COINS_RAIN);
      }
    } catch {
      setPhase("failed");
    }
  };

  const close = () => {
    if (userId) settledThisVisit.add(userId);
    setPhase("gone");
  };
  const name = greetingName(playerName);
  const celebrating = phase === "celebrate";
  const alreadyWelcomed = celebrating && paid === 0;
  const nameSize = name.length > 14 ? "text-2xl" : "text-[32px]";

  return (
    <>
      {phase === "greeting" && <WelcomeConfetti />}
      {raining && <CoinRain onDone={() => setRaining(false)} />}
      <Modal
        open
        onClose={celebrating || phase === "failed" ? close : undefined}
        closeOnBackdropClick={false}
        ariaLabelledBy={titleId}
        initialFocusRef={claimRef}
        mobileSheet
        zIndex={MODAL_Z}
        panelClassName="w-full max-w-sm"
      >
        <style>{`@keyframes welcome-rays { to { transform: rotate(360deg); } }`}</style>
        <div className="max-h-[92dvh] overflow-y-auto overflow-x-hidden rounded-t-3xl border border-[#EEDBCA] bg-[#FFF9EE] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-[#182234] md:rounded-3xl">
          {/* The stage: slow rays of light behind a coin that bobs while the gift waits to be taken. */}
          <div className="relative flex h-44 items-center justify-center overflow-hidden">
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, rgba(245,183,46,0.34) 0deg 9deg, rgba(245,183,46,0) 9deg 30deg)",
                WebkitMaskImage: "radial-gradient(closest-side, #000 0%, transparent 78%)",
                maskImage: "radial-gradient(closest-side, #000 0%, transparent 78%)",
                animation: reduceMotion ? undefined : "welcome-rays 36s linear infinite",
              }}
            />
            <motion.div
              initial={reduceMotion ? false : { scale: 0.5, opacity: 0, rotate: -14 }}
              animate={
                celebrating && !reduceMotion
                  ? { scale: [1, 1.2, 1], opacity: 1, rotate: 0, y: 0 }
                  : { scale: 1, opacity: 1, rotate: 0, y: !reduceMotion && phase === "greeting" ? [0, -7, 0] : 0 }
              }
              // The bob has its own, slow transition: one shared duration made the coin fade in over 3.2s.
              transition={
                celebrating
                  ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                  : {
                      duration: 0.5,
                      ease: "easeOut",
                      y: { duration: 3.2, ease: "easeInOut", repeat: !reduceMotion && phase === "greeting" ? Infinity : 0 },
                    }
              }
              className="relative drop-shadow-[0_10px_18px_rgba(120,70,0,0.35)]"
            >
              <GoldCoin size={112} />
            </motion.div>
          </div>

          <div className="px-6 text-center">
            <h2 id={titleId} className="flex flex-col items-center">
              <span className="bhalyam-display text-sm uppercase tracking-[0.34em] text-amber-800 dark:text-amber-300">Welcome</span>
              <motion.span
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.2, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className={`bhalyam-display mt-1 max-w-full break-words font-black leading-tight text-[#8A4B08] dark:text-[#FFE27A] ${nameSize}`}
              >
                {name}
              </motion.span>
              <span className="bhalyam-display mt-0.5 text-lg text-[#2B3550] dark:text-slate-100">to BHALYAM</span>
            </h2>

            {!alreadyWelcomed && (
              <p className="mt-3 text-5xl font-black leading-none text-amber-600 tabular-nums dark:text-amber-300">
                +{(celebrating ? ticked : amount).toLocaleString()}
              </p>
            )}

            <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-slate-300" role="status" aria-live="polite">
              {celebrating
                ? alreadyWelcomed
                  ? "Your welcome coins are already in your wallet. Pull up a chair."
                  : "They're in your wallet. Pull up a chair."
                : `Your seat is ready, and so is a gift: ${amount.toLocaleString()} welcome coins to play your first table.`}
            </p>

            {phase === "failed" && (
              <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">
                We couldn't add your coins just now. Please try again.
              </p>
            )}

            {celebrating && (
              <ul className="mt-4 space-y-2 text-left">
                <li className={NEXT_ROW}>
                  <Clock aria-hidden="true" className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                  <span className="text-sm font-semibold text-[#2B3550] dark:text-slate-100">
                    Free coins unlock in {hoursLabel(NEW_MEMBER_FAUCET_WAIT_MS)}
                  </span>
                </li>
                <li className={NEXT_ROW}>
                  <Flame aria-hidden="true" className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                  <span className="text-sm font-semibold text-[#2B3550] dark:text-slate-100">Your daily streak starts tomorrow</span>
                </li>
              </ul>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 px-6">
            {phase === "claiming" ? (
              <button ref={claimRef} type="button" aria-disabled="true" className={`${PRIMARY_BUTTON} cursor-default opacity-70`}>
                Adding your coins…
              </button>
            ) : celebrating ? (
              <button ref={claimRef} type="button" onClick={close} className={PRIMARY_BUTTON}>
                Start playing
              </button>
            ) : (
              <>
                <button ref={claimRef} type="button" onClick={() => void claim()} className={PRIMARY_BUTTON}>
                  {phase === "failed" ? "Try again" : `Claim my ${amount.toLocaleString()} coins`}
                </button>
                {phase === "failed" && (
                  <button
                    type="button"
                    onClick={close}
                    className="min-h-[44px] w-full cursor-pointer rounded-2xl px-6 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-slate-300 dark:hover:bg-slate-700/60"
                  >
                    Later
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
