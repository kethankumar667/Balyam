import { Crown, HandCoins, ShieldCheck } from "lucide-react";
import type { GameKind } from "@shared/types";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import type { MandaliMember } from "@shared/mandali/types.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { LOCALE_BY_ID } from "../../../i18n/types";
import { AlbumAvatar } from "./AlbumAvatar";
import { AlbumButton } from "./AlbumButton";
import { AlbumSheet } from "./AlbumSheet";
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
 * Someone in the group, up close: who they are, what they are to the group, whether
 * they are around, and since when.
 *
 * Every line here is something the People list and member roster already show every
 * other member. Nothing new crosses the wire for this card, and it deliberately
 * leaves out a wallet balance, a contribution score and anything about activity
 * outside this group: a friend is not a leaderboard row.
 */
export function MemberProfileSheet({ member, isSelf, onClose, onCoinsWith }: MemberProfileSheetProps) {
  const { t, locale } = useTranslation();
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

  return (
    <AlbumSheet open onClose={onClose} title={t("mandali.profile.title")}>
      {/* The portrait, mounted on the page with photo corners like every pinned thing in the album. */}
      <div className="album-corners album-rise mx-auto mt-1 flex w-full flex-col items-center rounded-2xl bg-album-field/60 px-6 pb-6 pt-8 text-center">
        <span className="rounded-full p-1 ring-2 ring-album-foilfill/60 ring-offset-4 ring-offset-album-field">
          <AlbumAvatar avatar={member.avatar} name="" size="xl" presence={member.presence} />
        </span>
        <h3 className="m-0 mt-5 flex items-baseline justify-center gap-2 text-2xl font-semibold leading-tight text-album-ink">
          <span className="break-words">{member.displayName}</span>
          {isSelf && <span className="text-sm font-normal text-album-ink3">({t("mandali.you")})</span>}
        </h3>
        <p
          className={`m-0 mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
            isLeader ? "bg-album-foilfill/20 text-album-foil" : "bg-album-page text-album-ink2"
          }`}
        >
          {roleKey === "mandali.role.host" && <Crown className="h-4 w-4" aria-hidden="true" />}
          {roleKey === "mandali.role.admin" && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          <span>{t(roleKey)}</span>
        </p>
      </div>

      <dl className="m-0 mt-5 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm text-album-ink3">{t("mandali.profile.status")}</dt>
          <dd className="m-0 inline-flex items-center gap-2 text-[15px] font-semibold text-album-ink">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${PRESENCE_DOT[member.presence] ?? PRESENCE_DOT.offline}`} />
            {activity}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-album-line pt-3">
          <dt className="text-sm text-album-ink3">{t("mandali.profile.joined")}</dt>
          <dd className="m-0 text-[15px] text-album-ink2">{joined}</dd>
        </div>
      </dl>

      {!isSelf && onCoinsWith && (
        <AlbumButton
          variant="primary"
          size="lg"
          icon={<HandCoins className="h-5 w-5" aria-hidden="true" />}
          onClick={() => {
            onClose();
            onCoinsWith(member.playerId);
          }}
          className="mt-4 w-full"
        >
          {t("mandali.profile.coins")}
        </AlbumButton>
      )}
    </AlbumSheet>
  );
}
