import { Crown, HandCoins } from "lucide-react";
import type { MandaliMember } from "@shared/mandali/types.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { AlbumAvatar } from "./AlbumAvatar";
import { AlbumButton } from "./AlbumButton";
import { roleLabelKey } from "./roleLabel";

export interface PeopleListProps {
  members: MandaliMember[];
  currentUserId: string | null;
  /** Opens the coin sheet aimed at one person. Omit to hide the coin button. */
  onCoinsWith?: (memberId: string) => void;
}

const PRESENCE_KEY = {
  online: "mandali.people.presence.online",
  "in-game": "mandali.people.presence.inGame",
  idle: "mandali.people.presence.idle",
  offline: "mandali.people.presence.offline",
} as const;

/**
 * Everyone in the group, as people: a face, a name, and one quiet line saying
 * whether they are around. Presence is a sentence, not just a coloured dot, so
 * it reads the same to someone who cannot tell the colours apart.
 */
export function PeopleList({ members, currentUserId, onCoinsWith }: PeopleListProps) {
  const { t } = useTranslation();

  return (
    <ul className="m-0 list-none space-y-1 p-0">
      {members.map((member) => {
        const isSelf = member.playerId === currentUserId;
        const online = member.presence === "online" || member.presence === "in-game";
        return (
          <li key={member.memberId} className="group flex min-h-[64px] items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-album-field/60">
            <AlbumAvatar avatar={member.avatar} name="" online={online} />
            <div className="min-w-0 flex-1">
              <p className="m-0 flex items-center gap-1.5 truncate text-[15px] font-semibold leading-tight text-album-ink">
                <span className="truncate">{member.displayName}</span>
                {isSelf && <span className="text-sm font-normal text-album-ink3">({t("mandali.you")})</span>}
                {member.role === "OWNER" && <Crown className="h-4 w-4 flex-shrink-0 text-album-foil" aria-hidden="true" />}
              </p>
              <p className="m-0 mt-0.5 truncate text-sm leading-tight text-album-ink3">
                {t(roleLabelKey(member.role))} · {t(PRESENCE_KEY[member.presence] ?? PRESENCE_KEY.offline)}
              </p>
            </div>
            {!isSelf && onCoinsWith && (
              <AlbumButton
                variant="ghost"
                size="icon"
                onClick={() => onCoinsWith(member.playerId)}
                aria-label={t("mandali.people.coinsWith", { name: member.displayName })}
                title={t("mandali.people.coinsWith", { name: member.displayName })}
                className="hidden lg:flex lg:opacity-0 lg:transition-opacity lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
              >
                <HandCoins className="h-[18px] w-[18px]" aria-hidden="true" />
              </AlbumButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
