import { Crown, HandCoins, ShieldCheck } from "lucide-react";
import type { GameKind } from "@shared/types";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import type { MandaliMember } from "@shared/mandali/types.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { useMemberGameRecord } from "../../../hooks/useMemberGameRecord";
import { LOCALE_BY_ID } from "../../../i18n/types";
import { AlbumAvatar } from "./AlbumAvatar";
import { AlbumButton } from "./AlbumButton";
import { AlbumSheet } from "./AlbumSheet";
import { LevelPanel, RecordPanel, RecordSkeleton, RecordUnavailable } from "./MemberRecordPanels";
import { roleLabelKey } from "./roleLabel";

export interface MemberProfileSheetProps {
  /** The member to show, or null when the card is closed. */
  member: MandaliMember | null;
  isSelf: boolean;
  onClose: () => void;
  /** Opens the coin sheet aimed at this person. Omit to hide the coin button. */
  onCoinsWith?: (memberId: string) => void;
}

const PRESENCE_KEY = {
  online: "mandali.people.presence.online",
  "in-game": "mandali.people.presence.inGame",
  idle: "mandali.people.presence.idle",
  offline: "mandali.people.presence.offline",
} as const;

/** The same colour each state wears on the avatar badge, so the dot and the badge never disagree. */
const PRESENCE_DOT = {
  online: "bg-album-success",
  "in-game": "bg-album-danger",
  idle: "bg-album-foilfill",
  offline: "border-[1.5px] border-album-ink3/70 bg-transparent",
} as const;

/**
 * Someone in the group, up close, the way a game shows a player card: their face and level up top,
 * their XP bar, then how they play (games played, won, win rate), and one tap to send or ask for coins.
 *
 * Who they are, whether they are around and since when are what the People list already shows every
 * other member. The game record is the public career total the leaderboards are built from (see
 * `useMemberGameRecord`): a level, XP, played, won, lost, drawn, best streak, favourite game. It
 * leaves out a wallet balance, match history, who they played, achievement progress and any rank
 * against other people: a friend is a person to play with, not a leaderboard row.
 */
export function MemberProfileSheet({ member, isSelf, onClose, onCoinsWith }: MemberProfileSheetProps) {
  const { t, locale } = useTranslation();
  const record = useMemberGameRecord(member?.playerId ?? null);
  if (!member) return null;

  const localeTag = LOCALE_BY_ID[locale]?.tag ?? "en";
  // UTC on purpose: the same join date reads the same for every member, whatever their timezone.
  const joined = new Date(member.joinedAt).toLocaleDateString(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const presence = t(PRESENCE_KEY[member.presence] ?? PRESENCE_KEY.offline);
  const activity =
    member.presence === "in-game" && member.activeGame
      ? t("mandali.profile.playing", { game: GAME_DISPLAY_NAMES[member.activeGame as GameKind] ?? member.activeGame })
      : presence;
  const roleKey = roleLabelKey(member.role);

  const isLeader = roleKey === "mandali.role.host" || roleKey === "mandali.role.admin";
  const tier = record.progression?.tier;
  const canSendCoins = !isSelf && Boolean(onCoinsWith);

  return (
    <AlbumSheet
      open
      onClose={onClose}
      title={t("mandali.profile.title")}
      footer={
        canSendCoins ? (
          <AlbumButton
            variant="primary"
            size="lg"
            icon={<HandCoins className="h-5 w-5" aria-hidden="true" />}
            onClick={() => {
              onClose();
              onCoinsWith?.(member.playerId);
            }}
            className="w-full"
          >
            {t("mandali.profile.coins")}
          </AlbumButton>
        ) : undefined
      }
    >
      {/* The player card, mounted on the page with photo corners like every pinned thing in the album. */}
      <div className="album-corners album-rise relative mx-auto mt-1 w-full overflow-hidden rounded-2xl bg-album-field/60 px-6 pb-6 pt-8 text-center">
        {tier && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: `linear-gradient(180deg, ${tier.themeColor}38 0%, ${tier.themeColor}00 70%)` }}
          />
        )}
        <div className="relative flex flex-col items-center">
          <span className="relative">
            <span
              className="block rounded-full p-1 ring-2 ring-offset-4 ring-offset-album-field"
              style={{ ["--tw-ring-color" as string]: tier ? tier.themeColor : "rgb(var(--album-foil-fill) / 0.6)" }}
            >
              <AlbumAvatar avatar={member.avatar} name="" size="xl" presence={member.presence} />
            </span>
            {record.progression && (
              <span
                className="absolute -bottom-1 -left-3 rounded-full border-2 bg-album-raised px-2 py-0.5 text-xs font-bold tabular-nums leading-tight text-album-ink shadow-sm"
                style={{ borderColor: record.progression.tier.themeColor }}
              >
                {t("mandali.profile.level", { level: record.progression.currentLevel })}
              </span>
            )}
          </span>

          <h3 className="m-0 mt-5 flex items-baseline justify-center gap-2 text-2xl font-semibold leading-tight text-album-ink">
            <span className="break-words">{member.displayName}</span>
            {isSelf && <span className="text-sm font-normal text-album-ink3">({t("mandali.you")})</span>}
          </h3>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <p
              className={`m-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                isLeader ? "bg-album-foilfill/20 text-album-foil" : "bg-album-page text-album-ink2"
              }`}
            >
              {roleKey === "mandali.role.host" && <Crown className="h-4 w-4" aria-hidden="true" />}
              {roleKey === "mandali.role.admin" && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              <span>{t(roleKey)}</span>
            </p>
            <p className="m-0 inline-flex items-center gap-2 rounded-full bg-album-page px-3 py-1 text-sm font-medium text-album-ink2">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${PRESENCE_DOT[member.presence] ?? PRESENCE_DOT.offline}`} />
              {activity}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {record.status === "loading" ? (
          <RecordSkeleton />
        ) : record.progression || record.stats ? (
          <>
            {record.progression && <LevelPanel progression={record.progression} />}
            {record.stats && <RecordPanel stats={record.stats} name={member.displayName} />}
          </>
        ) : (
          <RecordUnavailable />
        )}
      </div>

      <dl className="m-0 mt-4 flex items-center justify-between gap-3 border-t border-album-line pt-3">
        <dt className="text-sm text-album-ink3">{t("mandali.profile.joined")}</dt>
        <dd className="m-0 text-[15px] text-album-ink2">{joined}</dd>
      </dl>
    </AlbumSheet>
  );
}
