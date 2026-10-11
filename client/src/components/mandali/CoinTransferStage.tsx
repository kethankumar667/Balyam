/**
 * BHALYAM Mandali — the coin transfer stage.
 *
 * Shown for a few seconds after a coin request is paid, to BOTH people in it: the sender's face on
 * the left, the receiver's on the right, and coins arcing from one to the other. The receiver's ring
 * pulses as each coin lands, then flashes, throws sparks and floats the amount up.
 *
 * It never blocks the app behind it (the dim layer ignores pointer events) and never steals focus,
 * because the receiver can be anywhere, mid-game included. It always carries a Skip button, and
 * Escape skips too. Under reduced motion nothing flies; the two faces, the amount and the sentence
 * say it all. All motion lives in album.css (`coin-stage-*`) and is transform/opacity only.
 *
 * Requirements:
 * - Light and dark themes both flip fully (album tokens only).
 * - 44x44px touch target on Skip.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect } from "react";
import { Coins, SkipForward } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { JoyKind, JoyParty } from "../../store/mandaliJoyStore";
import { GoldCoin } from "../faucet/CoinRain";
import { Heart } from "../faucet/CoinCelebrations";
import { AlbumAvatar } from "./album/AlbumAvatar";
import { AlbumButton } from "./album/AlbumButton";

/** The whole story, start to finish. The delays in album.css (`coin-stage-*`) are written against this. */
export const STAGE_MS = 5_000;
/** When the last coin lands: the moment the receiver is paid, for sound and haptics. */
export const STAGE_ARRIVAL_MS = 3_700;

const COIN_COUNT = 6;
const FIRST_COIN_MS = 700;
const COIN_GAP_MS = 380;
const SPARK_RADIUS = 46;
const SPARK_COUNT = 8;

const COINS = Array.from({ length: COIN_COUNT }, (_, i) => FIRST_COIN_MS + i * COIN_GAP_MS);
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, i) => {
  const angle = (i / SPARK_COUNT) * Math.PI * 2;
  return { x: Math.round(Math.cos(angle) * SPARK_RADIUS), y: Math.round(Math.sin(angle) * SPARK_RADIUS) };
});

export interface CoinTransferStageProps {
  /** `sent`: this player is the sender. `received`: this player is the receiver. */
  kind: JoyKind;
  amount: number;
  /** This player. */
  self: JoyParty;
  /** The friend on the other side. */
  other: JoyParty;
  onSkip: () => void;
}

export function CoinTransferStage({ kind, amount, self, other, onSkip }: CoinTransferStageProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const sender = kind === "sent" ? self : other;
  const receiver = kind === "sent" ? other : self;
  const labelFor = (party: JoyParty, isSelf: boolean): string =>
    isSelf ? t("mandali.you") : party.name || t("mandali.joy.friend");
  const senderLabel = labelFor(sender, kind === "sent");
  const receiverLabel = labelFor(receiver, kind === "received");

  const amountText = amount.toLocaleString();
  const friend = other.name || t("mandali.joy.friend");
  const sentence =
    kind === "received"
      ? t("mandali.joy.received", { name: friend, amount: amountText })
      : t("mandali.joy.sent", { name: friend, amount: amountText });

  return (
    <div className="pointer-events-none fixed inset-0 z-[86] flex items-center justify-center bg-black/45 p-4">
      <section
        role="group"
        aria-label={t("mandali.joy.title")}
        className="coin-stage-card album-surface pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border border-album-foil/50 shadow-2xl"
      >
        <div aria-hidden="true" className="coin-stage-glow absolute inset-0" />

        <div className="relative px-5 pb-4 pt-5">
          <p className="m-0 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-album-foil">
            <Coins className="h-3.5 w-3.5" aria-hidden="true" />
            {t("mandali.joy.title")}
          </p>

          <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <Face party={sender} label={senderLabel} role={t("mandali.joy.sender")} />

            <div className="relative h-[72px] min-w-0" aria-hidden="true">
              <div className="coin-stage-track absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" />
              {COINS.map((delay) => (
                <div key={delay} className="coin-stage-flyer" style={{ ["--coin-delay" as string]: `${delay}ms` }}>
                  <span>
                    <GoldCoin size={28} />
                  </span>
                </div>
              ))}
            </div>

            <Face party={receiver} label={receiverLabel} role={t("mandali.joy.receiver")} lands amount={amountText} />
          </div>

          <p className="m-0 mt-4 flex items-center justify-center gap-2 text-3xl font-semibold leading-none tabular-nums text-album-ink">
            <GoldCoin size={30} />
            {amountText}
          </p>

          <p
            role="status"
            aria-live="polite"
            className="coin-stage-caption m-0 mt-3 flex items-center justify-center gap-1.5 text-center text-[15px] font-medium leading-snug text-album-ink2"
          >
            {kind === "sent" && <Heart size={16} />}
            <span>{sentence}</span>
          </p>
        </div>

        <div className="relative flex items-center gap-3 border-t border-album-line bg-album-page/80 px-5 py-3">
          <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-album-line">
            <div
              className="coin-stage-clock h-full w-full rounded-full bg-album-foilfill"
              style={{ ["--stage-ms" as string]: `${STAGE_MS}ms` }}
            />
          </div>
          <AlbumButton
            variant="quiet"
            onClick={onSkip}
            aria-label={t("mandali.joy.skipLabel")}
            icon={<SkipForward className="h-4 w-4" aria-hidden="true" />}
          >
            {t("mandali.joy.skip")}
          </AlbumButton>
        </div>
      </section>
    </div>
  );
}

interface FaceProps {
  party: JoyParty;
  label: string;
  role: string;
  /** The receiving side: its ring pulses per coin, then flashes, sparks and floats the amount up. */
  lands?: boolean;
  amount?: string;
}

function Face({ party, label, role, lands = false, amount }: FaceProps) {
  return (
    <div className="flex w-[84px] flex-col items-center text-center">
      <div className="relative">
        {lands && (
          <>
            <span aria-hidden="true" className="coin-stage-flash absolute inset-0 rounded-full border-2 border-album-foilfill" />
            {SPARKS.map((spark) => (
              <span
                key={`${spark.x},${spark.y}`}
                aria-hidden="true"
                className="coin-stage-spark absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full bg-album-foilfill"
                style={{ ["--sx" as string]: `${spark.x}px`, ["--sy" as string]: `${spark.y}px` }}
              />
            ))}
            <span
              aria-hidden="true"
              className="coin-stage-pop absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-album-foilfill px-2 py-0.5 text-xs font-bold tabular-nums text-album-onfoil shadow-md"
            >
              +{amount}
            </span>
          </>
        )}
        <span
          className={`relative block rounded-full p-1 ring-2 ring-album-foilfill/70 ring-offset-2 ring-offset-album-page ${lands ? "coin-stage-catch" : ""}`}
        >
          <AlbumAvatar avatar={party.avatar} name="" size="hero" />
        </span>
      </div>
      <p className="m-0 mt-2 w-full truncate text-sm font-semibold leading-tight text-album-ink">{label}</p>
      <p className="m-0 text-xs leading-tight text-album-ink3">{role}</p>
    </div>
  );
}
