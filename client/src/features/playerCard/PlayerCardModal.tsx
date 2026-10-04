import { useRef } from "react";
import { X } from "lucide-react";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { BHALYAM_GAMES } from "../../components/bhalyam/data";
import { getPodiumTitleConfig } from "../../lib/cosmeticsResolver";
import type { PublicPlayerCard, PublicPlayerCardCareer } from "@shared/profile/PublicPlayerCard";
import type { PlayerCardHint } from "./PlayerCardContext";

export type PlayerCardViewState =
  | { status: "loading" }
  | { status: "ready"; card: PublicPlayerCard }
  | { status: "error"; message: string; retryable: boolean };

interface PlayerCardModalProps {
  hint: PlayerCardHint;
  view: PlayerCardViewState;
  onClose: () => void;
  onRetry: () => void;
}

const KIND_LABEL: Record<PublicPlayerCard["kind"], string> = {
  member: "Member",
  guest: "Guest",
  bot: "Bot",
};

const KIND_NOTE: Record<PublicPlayerCard["kind"], string> = {
  member: "No finished matches yet.",
  guest: "No finished matches yet.",
  bot: "A BHALYAM bot. Bots do not keep a career record.",
};

/** "aura_radiant_vanguard" becomes "Radiant Vanguard". The catalogue has no display names for auras, only ids. */
function humanizeCosmeticId(id: string): string {
  return id
    .replace(/^aura_/, "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function gameTitle(kind: string): string {
  return BHALYAM_GAMES.find((game) => game.slug === kind)?.title ?? kind;
}

function formatMemberSince(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/**
 * The card shown when someone taps a face. One responsive dialog: a bottom
 * sheet on phones and a centred panel from `md:` up, the pattern `Modal`
 * already provides. A modal this small does not need two separate layout
 * shells the way a game board does.
 *
 * Every section here is a statement about data the server chose to publish.
 * When a section has nothing honest to say it says so in words instead of
 * drawing zeros or a locked-padlock placeholder.
 */
export default function PlayerCardModal({ hint, view, onClose, onRetry }: PlayerCardModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const card = view.status === "ready" ? view.card : null;
  const displayName = card?.displayName ?? hint.name;
  const avatar = card?.avatar ?? hint.avatar;

  return (
    <Modal
      open
      onClose={onClose}
      mobileSheet
      initialFocusRef={closeButtonRef}
      ariaLabelledBy="player-card-title"
      panelClassName="bhalyam-font relative w-full md:max-w-md max-h-[92dvh] overflow-hidden flex flex-col
                      bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                      border-2 border-bhalyam-cream-edge/70 dark:border-slate-800
                      rounded-t-3xl md:rounded-3xl
                      shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
      panelStyle={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="md:hidden flex justify-center pt-2">
        <span aria-hidden className="w-8 h-1 rounded-full bg-bhalyam-wood/30 dark:bg-slate-700" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
        <section className="relative rounded-2xl p-4 bg-bhalyam-cream-warm/70 dark:bg-[#182234] border border-bhalyam-cream-edge/60 dark:border-slate-700/60">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-2 right-2 w-11 h-11 rounded-full inline-flex items-center justify-center cursor-pointer
                       bg-bhalyam-cream-soft dark:bg-[#1E2738] hover:bg-bhalyam-cream-edge dark:hover:bg-[#2A374F]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark active:scale-95 transition"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <SeatAvatar
              avatar={avatar}
              aura={card?.cosmetics.avatarAura}
              level={card?.progression.level}
              name={displayName}
              className="w-20 h-20"
              textClassName="text-3xl"
            />
            <div className="min-w-0">
              <h2 id="player-card-title" className="font-bold text-xl leading-tight truncate">
                {displayName}
              </h2>
              {card && (
                <p className="mt-0.5 text-[11px] uppercase tracking-widest font-extrabold text-[#7B5024] dark:text-slate-400">
                  {KIND_LABEL[card.kind]}
                  {card.memberSince !== undefined && ` · Since ${formatMemberSince(card.memberSince)}`}
                </p>
              )}
              {card && card.progression.levelTitle && (
                <p className="mt-1 text-sm font-semibold" style={{ color: card.progression.tierColor || undefined }}>
                  {card.progression.levelTitle} · {card.progression.tierName}
                </p>
              )}
            </div>
          </div>

          {card && card.progression.levelTitle && <ExperienceBar progression={card.progression} />}
        </section>

        {view.status === "loading" && <LoadingBlocks />}

        {view.status === "error" && (
          <div role="alert" className="rounded-2xl p-4 text-center bg-bhalyam-cream-warm/70 dark:bg-[#182234] border border-bhalyam-cream-edge/60 dark:border-slate-700/60">
            <p className="text-sm">{view.message}</p>
            {view.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 min-h-[44px] px-5 rounded-xl font-bold text-sm cursor-pointer
                         bhalyam-gold-leaf border border-bhalyam-gold-dark text-bhalyam-wood-dark
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark active:scale-[0.98] transition"
            >
              Try again
            </button>
            )}
          </div>
        )}

        {card && <CardDetails card={card} />}
      </div>
    </Modal>
  );
}

function ExperienceBar({ progression }: { progression: PublicPlayerCard["progression"] }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-xs font-bold">
        <span>Level {progression.level}</span>
        <span className="tabular-nums">
          {progression.currentXP} / {progression.xpForNextLevel} XP
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progress to next level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progression.levelProgressPercent}
        className="mt-1 h-2.5 rounded-full overflow-hidden bg-bhalyam-wood/15 dark:bg-slate-700/70"
      >
        <div
          className="h-full rounded-full bhalyam-gold-leaf"
          style={{ width: `${progression.levelProgressPercent}%` }}
        />
      </div>
    </div>
  );
}

function CardDetails({ card }: { card: PublicPlayerCard }) {
  const auraId = card.cosmetics.avatarAura;
  const titleConfig = getPodiumTitleConfig(card.cosmetics.podiumTitle);
  const equipped: Array<{ label: string; value: string }> = [];
  if (auraId && auraId !== "aura_none") equipped.push({ label: "Aura", value: humanizeCosmeticId(auraId) });
  if (titleConfig) equipped.push({ label: "Title", value: titleConfig.label });

  return (
    <>
      {equipped.length > 0 && (
        <section aria-label="Equipped" className="rounded-2xl p-3 bg-bhalyam-cream-warm/70 dark:bg-[#182234] border border-bhalyam-cream-edge/60 dark:border-slate-700/60">
          <dl className="grid grid-cols-2 gap-3">
            {equipped.map((item) => (
              <div key={item.label}>
                <dt className="text-[10px] uppercase tracking-widest font-extrabold text-[#7B5024] dark:text-slate-400">{item.label}</dt>
                <dd className="mt-0.5 text-sm font-bold truncate">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {card.career ? (
        <CareerStats career={card.career} />
      ) : (
        <p className="rounded-2xl p-4 text-sm text-center bg-bhalyam-cream-warm/70 dark:bg-[#182234] border border-bhalyam-cream-edge/60 dark:border-slate-700/60">
          {KIND_NOTE[card.kind]}
        </p>
      )}
    </>
  );
}

function CareerStats({ career }: { career: PublicPlayerCardCareer }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Games won", value: `${career.wins} out of ${career.totalMatches}` },
    { label: "Win rate", value: `${career.winRatePercent}%` },
    { label: "Current win streak", value: String(career.currentWinStreak) },
    { label: "Best win streak", value: String(career.bestWinStreak) },
  ];
  if (career.favoriteGame) rows.push({ label: "Favourite game", value: gameTitle(career.favoriteGame) });

  return (
    <section aria-label="Career" className="rounded-2xl p-4 bg-bhalyam-cream-warm/70 dark:bg-[#182234] border border-bhalyam-cream-edge/60 dark:border-slate-700/60">
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt>{row.label}</dt>
            <dd className="font-bold tabular-nums text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LoadingBlocks() {
  return (
    <div role="status" aria-label="Loading profile" className="space-y-3 animate-pulse">
      <div className="h-16 rounded-2xl bg-bhalyam-wood/10 dark:bg-slate-800" />
      <div className="h-32 rounded-2xl bg-bhalyam-wood/10 dark:bg-slate-800" />
    </div>
  );
}
