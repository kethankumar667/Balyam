import { useEffect, useState, useRef } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import type { ModeScorecard, AllGameSlug } from "@shared/profile/Scorecard";
import { getGameModeConfig } from "@shared/profile/GameModes";
import { gameLaunch } from "../../lib/gameLaunch";
import { useResolvedCosmetics } from "../../lib/cosmeticsResolver";
import SeatAvatar from "../profile/SeatAvatar";
import Modal from "../Modal";
import { scorecardValue } from "./scorecardDashboardModel";

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
  const score = mode ? scorecardValue(game, mode, scorecard.bestScore) : scorecard.bestScore.toLocaleString();
  // A link someone else opens must land on a page that exists. A browser-only game has its own page;
  // a room game has no URL that opens its create-room sheet, so its link lands on the games page.
  // (This used to be `/games/<slug>`, which is not a route, so every shared link was a 404.)
  const launch = gameLaunch(game);
  const landingPath = launch.kind === "room-sheet" ? "/games" : launch.to;
  const challengeUrl = `${window.location.origin}${landingPath}?challengeMode=${encodeURIComponent(scorecard.modeId)}&targetScore=${scorecard.bestScore}`;

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
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `My personal best in ${gameConfig.displayName} (${scorecard.modeDisplayName}) on BHALYAM is ${score}.\n\nCan you beat it? Play here: ${challengeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <Modal open onClose={onClose} ariaLabelledBy="holo-pass-title"
      panelClassName="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] rounded-3xl bg-surface-0 dark:bg-slate-950 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] p-6 pt-16 font-sans text-center overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full text-ink-mid dark:text-slate-400 hover:text-ink-hi dark:hover:text-white hover:bg-surface-2 dark:hover:bg-slate-800/60 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Holo-Pass Card Content */}
        <div
          className="relative p-5 rounded-2xl bg-gradient-to-br from-stone-50 dark:from-slate-900 via-surface-1 dark:via-slate-950 to-cyan-50 dark:to-cyan-950/40 border border-cyan-500/50 shadow-inner overflow-hidden mb-5 text-left"
        >
          {/* Futuristic Scanline lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.04)_51%)] bg-[length:100%_4px] pointer-events-none" />

          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping motion-reduce:animate-none" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-800 dark:text-cyan-400 uppercase">
                BHALYAM CHRONO-PASS
              </span>
            </div>
            <div className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
              PERSONAL BEST
            </div>
          </div>

          {/* Player info */}
          <div className="flex items-center gap-3 mb-4">
            <SeatAvatar avatar={avatar} aura={avatarAura} name={playerName} className="w-12 h-12 border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]" textClassName="text-lg" />
            <div>
              <div className="text-base font-extrabold text-ink-hi dark:text-white leading-tight">{playerName}</div>
              <div className="text-xs text-ink-mid dark:text-slate-400 font-mono">{gameConfig.displayName}</div>
            </div>
          </div>

          {/* Record Display */}
          <div className="p-3.5 rounded-xl bg-surface-0 dark:bg-black/60 border border-stone-300 dark:border-slate-800 mb-3">
            <div className="text-[10px] text-cyan-800 dark:text-cyan-400 font-mono font-semibold uppercase tracking-wider mb-0.5">
              {scorecard.modeDisplayName}
            </div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-800 dark:from-cyan-300 via-slate-900 dark:via-white to-cyan-800 dark:to-cyan-200 font-mono tracking-tight">
              {score}
            </div>
          </div>

          {/* Saved match reference */}
          <div className="flex items-center justify-between text-[9px] font-mono text-ink-mid dark:text-slate-400 pt-1 border-t border-stone-300 dark:border-slate-800">
            <span>MATCH: {scorecard.bestScoreMatchId.slice(0, 14)}{scorecard.bestScoreMatchId.length > 14 ? "..." : ""}</span>
          </div>
        </div>

        <h3 id="holo-pass-title" className="text-lg font-bold text-ink-hi dark:text-white mb-1">
          Challenge Your Friends
        </h3>
        <p className="text-xs text-ink-mid dark:text-slate-400 mb-5">
          Share your saved personal best and invite friends to beat it.
        </p>
        {shareError ? <div className="mb-4 text-left">
          <p role="alert" className="text-xs text-rose-800 dark:text-rose-300">{shareError}</p>
          <input readOnly aria-label="Scorecard share link" value={challengeUrl} onFocus={event => event.target.select()}
            className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 bg-surface-1 px-3 text-xs text-ink-hi dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div> : null}

        {/* Share actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-800 hover:to-blue-800 text-white text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Holo-Pass</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/40 transition-all min-h-[44px]"
            >
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface-2 dark:bg-slate-800 hover:bg-surface-2 dark:hover:bg-slate-700 text-ink-mid dark:text-slate-300 text-xs font-semibold border border-stone-300 dark:border-slate-700 transition-all min-h-[44px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Link!" : "Copy Link"}</span>
            </button>
          </div>
        </div>
    </Modal>
  );
}
