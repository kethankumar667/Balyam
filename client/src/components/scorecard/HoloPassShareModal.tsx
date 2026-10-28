import { useEffect, useState, useRef } from "react";
import { Award, CalendarDays, Share2, Copy, Check, MessageCircle, X } from "lucide-react";
import type { ModeScorecard, AllGameSlug } from "@shared/profile/Scorecard";
import { getGameModeConfig } from "@shared/profile/GameModes";
import { calculatePerformanceRank } from "@shared/profile/MetricRegistry";
import { scorecardChallengePath } from "../../lib/scorecardChallenge";
import { useResolvedCosmetics } from "../../lib/cosmeticsResolver";
import SeatAvatar from "../profile/SeatAvatar";
import Modal from "../Modal";
import { SCORECARD_RANK_CLASSES } from "./scorecardTheme";
import { scorecardArt, scorecardDate, scorecardValue, scorecardValueWithUnit } from "./scorecardDashboardModel";

interface HoloPassShareModalProps {
  game: AllGameSlug;
  scorecard: ModeScorecard;
  playerName: string;
  avatar?: string;
  onClose: () => void;
}

export default function HoloPassShareModal({
  game,
  scorecard,
  playerName,
  avatar,
  onClose,
}: HoloPassShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const { avatarAura } = useResolvedCosmetics();
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const gameConfig = getGameModeConfig(game);
  const mode = gameConfig.modes.find(item => item.modeId === scorecard.modeId);
  const score = mode ? scorecardValueWithUnit(game, mode, scorecard.bestScore) : scorecard.bestScore.toLocaleString();
  const timed = mode?.unit === "s";
  const headline = mode && timed ? scorecardValue(game, mode, scorecard.bestScore) : scorecard.bestScore.toLocaleString();
  const unitLabel = timed ? "best time" : mode?.unit || "score";
  const rank = calculatePerformanceRank(game, scorecard.modeId, scorecard.bestScore, scorecard.scoringDirection);
  const art = scorecardArt(game);
  const challengeUrl = `${window.location.origin}${scorecardChallengePath(game, scorecard.modeId, scorecard.bestScore)}`;

  const handleCopyLink = async () => {
    setShareError(null);
    setCopied(false);
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("Scorecard share link could not be copied:", error);
      setShareError("The link could not be copied. Select the link below to copy it manually.");
    }
  };

  const handleNativeShare = async () => {
    setShareError(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `BHALYAM Record: ${playerName} at ${gameConfig.displayName}`,
          text: `My personal best in ${gameConfig.displayName} (${scorecard.modeDisplayName}) is ${score}. Can you beat it?`,
          url: challengeUrl,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("Scorecard sharing could not be opened:", error);
        setShareError("Sharing could not be opened. Try Copy Link or WhatsApp.");
      }
    } else {
      await handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `My personal best in ${gameConfig.displayName} (${scorecard.modeDisplayName}) on BHALYAM is ${score}.\n\nCan you beat it? Play here: ${challengeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal open onClose={onClose} ariaLabelledBy="holo-pass-title"
      panelClassName="chrono-scorecards relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-score-edge bg-score-panel p-5 pt-6 font-sans text-score-ink shadow-[0_24px_60px_-28px_rgba(0,60,85,0.7)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-score-edge bg-score-inset text-score-soft transition-colors hover:border-score-cyan hover:text-score-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h3 id="holo-pass-title" className="pr-12 text-lg font-bold leading-tight text-score-ink">
          Challenge Your Friends
        </h3>
        <p className="mt-1 pr-12 text-xs leading-relaxed text-score-soft">
          Share your saved personal best and invite friends to beat it.
        </p>

        {/* The card friends see described in the share text; a picture of it, not a credential. */}
        <div className="relative isolate mt-5 overflow-hidden rounded-2xl border border-score-cyan bg-score-inset p-4 text-left">
          {art ? <img src={art} alt="" width={160} height={160} loading="lazy"
            className="pointer-events-none absolute -right-8 -top-6 -z-10 h-36 w-36 rotate-12 rounded-3xl object-cover opacity-[0.14] dark:opacity-25" /> : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-score-cyan">BHALYAM personal best</span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-bold ${SCORECARD_RANK_CLASSES[rank.tier]}`}>
              <Award className="h-3 w-3" aria-hidden="true" />{rank.grade}-RANK
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <SeatAvatar avatar={avatar} aura={avatarAura} name={playerName} className="h-12 w-12 border-2 border-score-cyan" textClassName="text-lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold leading-tight text-score-ink">{playerName}</p>
              <p className="truncate text-xs text-score-soft">{gameConfig.displayName}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-score-edge bg-score-panel p-3.5">
            <p className="text-[11px] font-semibold text-score-soft">{scorecard.modeDisplayName}</p>
            <strong className="mt-1 block break-words font-display text-4xl leading-none tracking-tight text-score-gold">{headline}</strong>
            <span className="mt-1 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-score-gold">{unitLabel}</span>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-score-soft">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Record set {scorecardDate(scorecard.bestScoreAchievedAt)}
          </p>
        </div>

        {shareError ? <div className="mt-4 text-left">
          <p role="alert" className="text-xs text-rose-800 dark:text-rose-300">{shareError}</p>
          <input readOnly aria-label="Scorecard share link" value={challengeUrl} onFocus={event => event.target.select()}
            className="mt-2 min-h-11 w-full rounded-lg border border-score-edge bg-score-inset px-3 text-xs text-score-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan" />
        </div> : null}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 text-sm font-extrabold text-slate-950 hover:from-amber-200 hover:to-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share challenge</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-700 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-score-edge bg-score-inset px-3 text-xs font-bold text-score-ink transition-colors hover:border-score-cyan hover:bg-score-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan"
            >
              {copied ? <Check className="h-4 w-4 text-score-cyan" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? "Copied Link!" : "Copy Link"}</span>
            </button>
          </div>
        </div>
    </Modal>
  );
}
