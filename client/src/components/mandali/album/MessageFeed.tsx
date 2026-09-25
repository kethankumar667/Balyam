import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, MoreHorizontal, Pin, Trash2 } from "lucide-react";
import type { MandaliCoinRequest, MandaliMember, MandaliMessage } from "@shared/mandali/types.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { LOCALE_BY_ID } from "../../../i18n/types";
import RoomInviteCard from "../RoomInviteCard";
import CoinRequestCard from "../CoinRequestCard";
import { AlbumAvatar } from "./AlbumAvatar";
import { AlbumButton } from "./AlbumButton";
import { DayCaption } from "./DayCaption";
import { groupMessagesByDay } from "./groupByDay";

/** Warm, family-sized reactions. Anything else people have already sent still shows. */
const QUICK_REACTIONS = ["❤️", "👍", "😂", "🙏", "👏"] as const;
/** One person's lines within this window read as one run, with a single name and face. */
const RUN_WINDOW_MS = 5 * 60 * 1000;
/** Within this many pixels of the bottom counts as "reading the latest". */
const STICK_TO_BOTTOM_PX = 96;
/** Scrolled this far up, offer a way back down. */
const SHOW_JUMP_PX = 280;

export interface MessageFeedProps {
  messages: MandaliMessage[];
  members: MandaliMember[];
  mandaliName: string;
  currentUserId: string | null;
  selfId: string | null;
  coinRequests: Record<string, MandaliCoinRequest>;
  canManageMembers: boolean;
  /** phone: fuller-width bubbles, tighter gutters. desktop: roomier. */
  variant: "phone" | "desktop";
  onReact: (messageId: string, emoji: string) => void;
  onPin: (channelId: string, messageId: string, pinned: boolean) => unknown;
  onDelete: (channelId: string, messageId: string) => unknown;
  onPayCoinRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * The conversation: the page of the album that fills with lines.
 *
 * Content stays flat and fast — this is where people spend their time, so it
 * carries almost no ornament. The only decoration is the handwritten caption
 * that opens each day, and photo corners on anything pinned to the page.
 */
export function MessageFeed({
  messages,
  members,
  mandaliName,
  currentUserId,
  selfId,
  coinRequests,
  canManageMembers,
  variant,
  onReact,
  onPin,
  onDelete,
  onPayCoinRequest,
}: MessageFeedProps) {
  const { t, locale } = useTranslation();
  const localeTag = LOCALE_BY_ID[locale]?.tag ?? "en";
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [openOptionsId, setOpenOptionsId] = useState<string | null>(null);

  const days = useMemo(
    () =>
      groupMessagesByDay(messages, {
        now: Date.now(),
        locale: localeTag,
        labels: { today: t("mandali.day.today"), yesterday: t("mandali.day.yesterday") },
      }),
    // `t` changes with the language, which is exactly when the day words must change.
    [messages, localeTag, t],
  );

  const last = messages[messages.length - 1];
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Something you just sent always brings you to it; otherwise only follow if you were already at the bottom.
    if (stickRef.current || last?.senderId === currentUserId) {
      el.scrollTop = el.scrollHeight;
      stickRef.current = true;
      setShowJump(false);
    }
  }, [messages.length, last?.senderId, currentUserId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = gap < STICK_TO_BOTTOM_PX;
    setShowJump(gap >= SHOW_JUMP_PX);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="album-hand m-0 text-4xl leading-none text-album-foil">{t("mandali.feed.empty.title")}</p>
        <p className="mb-0 mt-3 max-w-xs text-[15px] leading-relaxed text-album-ink2">
          {t("mandali.feed.empty.body", { name: mandaliName })}
        </p>
      </div>
    );
  }

  const gutter = variant === "desktop" ? "px-6" : "px-3";
  const bubbleWidth = variant === "desktop" ? "max-w-[68%]" : "max-w-[84%]";

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label={t("mandali.feed.label")}
        aria-live="polite"
        aria-relevant="additions"
        className={`album-scroll h-full overflow-y-auto ${gutter} pb-4 pt-1`}
      >
        {days.map((day) => (
          <section key={day.key} aria-label={day.label}>
            <DayCaption label={day.label} />
            {day.messages.map((message, index) => {
              const previous = day.messages[index - 1];
              const isRun =
                !!previous &&
                previous.senderId === message.senderId &&
                !message.kind &&
                !previous.kind &&
                message.timestamp - previous.timestamp < RUN_WINDOW_MS;
              return (
                <Row
                  key={message.messageId}
                  message={message}
                  isRun={isRun}
                  isMine={message.senderId === currentUserId}
                  members={members}
                  selfId={selfId}
                  currentUserId={currentUserId}
                  coinRequest={coinRequests[message.messageId]}
                  canManageMembers={canManageMembers}
                  bubbleWidth={bubbleWidth}
                  isLatest={message.messageId === last?.messageId}
                  localeTag={localeTag}
                  optionsOpen={openOptionsId === message.messageId}
                  onToggleOptions={() => setOpenOptionsId((id) => (id === message.messageId ? null : message.messageId))}
                  onReact={onReact}
                  onPin={onPin}
                  onDelete={onDelete}
                  onPayCoinRequest={onPayCoinRequest}
                />
              );
            })}
          </section>
        ))}
      </div>

      {showJump && (
        <AlbumButton
          variant="quiet"
          onClick={jumpToLatest}
          icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-lg"
        >
          {t("mandali.feed.latest")}
        </AlbumButton>
      )}
    </div>
  );
}

interface RowProps {
  message: MandaliMessage;
  isRun: boolean;
  isMine: boolean;
  members: MandaliMember[];
  selfId: string | null;
  currentUserId: string | null;
  coinRequest: MandaliCoinRequest | undefined;
  canManageMembers: boolean;
  bubbleWidth: string;
  /** The newest line keeps its "…" visible, so people can see that a message can be tapped. */
  isLatest: boolean;
  localeTag: string;
  optionsOpen: boolean;
  onToggleOptions: () => void;
  onReact: MessageFeedProps["onReact"];
  onPin: MessageFeedProps["onPin"];
  onDelete: MessageFeedProps["onDelete"];
  onPayCoinRequest: MessageFeedProps["onPayCoinRequest"];
}

function Row({
  message,
  isRun,
  isMine,
  members,
  selfId,
  currentUserId,
  coinRequest,
  canManageMembers,
  bubbleWidth,
  isLatest,
  localeTag,
  optionsOpen,
  onToggleOptions,
  onReact,
  onPin,
  onDelete,
  onPayCoinRequest,
}: RowProps) {
  const { t } = useTranslation();

  if (message.kind === "SYSTEM") {
    return <p className="m-0 my-2 text-center text-sm leading-snug text-album-ink3">{message.content}</p>;
  }

  const withFace = (card: ReactNode) => (
    <div className={`mt-3 flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
      <AlbumAvatar avatar={message.senderAvatar} name="" size="sm" className="mt-1" />
      {card}
    </div>
  );

  if (message.kind === "ROOM_INVITE") return withFace(<RoomInviteCard message={message} selfId={selfId} />);
  if (message.kind === "COIN_REQUEST") {
    return withFace(
      <CoinRequestCard message={message} request={coinRequest} selfId={selfId} members={members} onPay={onPayCoinRequest} />,
    );
  }

  const time = new Date(message.timestamp).toLocaleTimeString(localeTag, { hour: "numeric", minute: "2-digit" });
  const canModerate = isMine || canManageMembers;
  const hasContent = Boolean(message.content);
  const reactions = Object.entries(message.reactions ?? {}).filter(([, people]) => people && people.length > 0);
  const optionsId = `options-${message.messageId}`;

  const bubble = isMine
    ? "bg-album-mine border border-album-foil/25 rounded-2xl rounded-tr-md"
    : "bg-album-raised border border-album-line rounded-2xl rounded-tl-md";

  // Tapping a line opens its options — except when the tap is really the end of
  // selecting text to copy, which must not be interrupted.
  const onBubbleClick = () => {
    if (window.getSelection?.()?.toString()) return;
    onToggleOptions();
  };

  return (
    <div className={`group flex gap-2.5 ${isRun ? "mt-0.5" : "mt-3"} ${isMine ? "flex-row-reverse" : ""}`}>
      {!isMine && (isRun ? <span className="w-8 flex-shrink-0" aria-hidden="true" /> : <AlbumAvatar avatar={message.senderAvatar} name="" size="sm" className="mt-0.5" />)}

      <div className={`flex min-w-0 ${bubbleWidth} flex-col ${isMine ? "items-end" : "items-start"}`}>
        {!isRun && (
          <p className="m-0 mb-1 flex items-center gap-2 px-1 text-sm leading-none text-album-ink3">
            {!isMine && <span className="font-semibold text-album-ink2">{message.senderName}</span>}
            {message.senderRole === "OWNER" && !isMine && (
              <span className="rounded-md bg-album-foilfill/20 px-1.5 py-0.5 text-xs font-semibold text-album-foil">{t("mandali.role.host")}</span>
            )}
            <time dateTime={new Date(message.timestamp).toISOString()}>{time}</time>
          </p>
        )}

        {message.pinned && (
          <p className="m-0 mb-1 flex items-center gap-1 px-1 text-sm font-medium text-album-foil">
            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
            {t("mandali.message.pinned")}
          </p>
        )}

        <div className={`flex items-end gap-1 ${isMine ? "flex-row-reverse" : ""}`}>
          {/* The line itself is the tap target; the "…" beside it is for keyboards and the newest line. */}
          <div
            onClick={hasContent ? onBubbleClick : undefined}
            className={`${bubble} ${message.pinned ? "album-corners" : ""} select-text whitespace-pre-wrap px-3.5 py-2 text-[15px] leading-relaxed text-album-ink [overflow-wrap:anywhere] ${
              hasContent ? "cursor-pointer" : ""
            }`}
          >
            {hasContent ? message.content : <span className="italic text-album-ink3">{t("mandali.message.deleted")}</span>}
          </div>

          {hasContent && (
            <button
              type="button"
              onClick={onToggleOptions}
              aria-expanded={optionsOpen}
              aria-controls={optionsId}
              aria-label={t("mandali.message.options")}
              className={`album-focus album-hit relative mb-0.5 flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-album-ink3 transition-opacity hover:bg-album-field hover:text-album-ink focus-visible:opacity-100 group-hover:opacity-100 ${
                isLatest || optionsOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}
        </div>

        {optionsOpen && hasContent && (
          <div
            id={optionsId}
            role="group"
            aria-label={t("mandali.message.options")}
            className="mt-1.5 rounded-2xl border border-album-line bg-album-raised p-1.5 shadow-sm"
          >
            <div className="flex items-center gap-0.5">
              {QUICK_REACTIONS.map((emoji) => {
                const reacted = currentUserId ? (message.reactions?.[emoji] ?? []).includes(currentUserId) : false;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(message.messageId, emoji)}
                    aria-pressed={reacted}
                    aria-label={t("mandali.message.react", { emoji })}
                    className={`album-focus flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-xl transition-transform active:scale-110 ${
                      reacted ? "bg-album-foilfill/25" : "hover:bg-album-field"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {(canManageMembers || canModerate) && (
              <div className="mt-1 flex items-center gap-1 border-t border-album-line pt-1">
                {canManageMembers && (
                  <AlbumButton
                    variant="ghost"
                    onClick={() => onPin(message.channelId, message.messageId, !message.pinned)}
                    icon={<Pin className="h-4 w-4" aria-hidden="true" />}
                  >
                    {message.pinned ? t("mandali.message.unpin") : t("mandali.message.pin")}
                  </AlbumButton>
                )}
                {canModerate && (
                  <AlbumButton
                    variant="ghost"
                    onClick={() => onDelete(message.channelId, message.messageId)}
                    icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    className="!text-album-danger"
                  >
                    {t("mandali.message.delete")}
                  </AlbumButton>
                )}
              </div>
            )}
          </div>
        )}

        {reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("mandali.message.reactions")}>
            {reactions.map(([emoji, people]) => {
              const reacted = currentUserId ? people.includes(currentUserId) : false;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.messageId, emoji)}
                  aria-pressed={reacted}
                  aria-label={t("mandali.message.react", { emoji })}
                  className={`album-focus album-hit relative flex h-8 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-sm ${
                    reacted
                      ? "border-album-foil/60 bg-album-foilfill/20 text-album-ink"
                      : "border-album-line bg-album-raised text-album-ink2 hover:border-album-ink3"
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span className="text-sm font-semibold">{people.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
