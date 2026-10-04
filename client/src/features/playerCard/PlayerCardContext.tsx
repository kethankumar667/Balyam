import { createContext, useContext, type MouseEvent, type ReactNode } from "react";

/**
 * How anything on screen asks for "show me this player's card".
 *
 * ── Why a context and not a prop passed down ───────────────────────────
 * Avatars live in more than forty places: every game board, the lobby lists,
 * the Mandali. Threading an `onOpenProfile` callback through all of them would
 * touch every layout shell for a feature none of them own. One provider
 * mounted once, and one trigger component wrapped around a face, keeps each
 * call site to a single added element.
 *
 * ── Two ways to name a person ──────────────────────────────────────────
 * At a table the client knows a SEAT id, and the server alone knows which
 * account sits there, so a seat is resolved server-side. In the Mandali and on
 * leaderboards the client already holds an account id and can ask for it
 * directly. The two are different arguments on purpose: passing a seat id to
 * the account route would silently return "no such player" for everyone.
 */
export interface PlayerCardHint {
  /** Shown instantly in the header while the real card loads. */
  name: string;
  avatar?: string;
}

export interface PlayerCardOpener {
  openSeatCard: (seatId: string, hint: PlayerCardHint) => void;
  openAccountCard: (accountId: string, hint: PlayerCardHint) => void;
}

export const PlayerCardContext = createContext<PlayerCardOpener | null>(null);

/**
 * Null outside a provider. Components and their unit tests render without one,
 * and a missing provider must mean "avatars are simply not tappable", never a
 * crash.
 */
export function usePlayerCardOpener(): PlayerCardOpener | null {
  return useContext(PlayerCardContext);
}

export type PlayerCardTargetProps = {
  /** A seat at the viewer's table. Resolved by the server, because only it knows the account behind a seat. */
  seatId?: string | null;
  /** An account id already held by the caller (Mandali, leaderboards). */
  accountId?: string | null;
  /** Used for the accessible label and the instant header. */
  name: string;
  avatar?: string;
};

/**
 * Widens a small face's tap area by 8px on every side via a pseudo-element.
 * Seat avatars are drawn at 20 to 32px and the layout standard asks for a 44px
 * touch target; widening the hit area meets it without moving a single pixel
 * of any board's layout.
 */
export const PLAYER_CARD_BUTTON_CLASSES =
  "relative cursor-pointer before:absolute before:-inset-2 before:content-[''] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark " +
  "active:scale-95 transition-transform";

export interface PlayerCardButtonProps {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  "aria-label": string;
}

/**
 * The props that make an element open a player's card, or null when there is
 * no provider or no target, so the caller can render the face as plain,
 * untappable art.
 *
 * Shared by `PlayerCardTrigger` and by `SeatAvatar`, which turns its own outer
 * element into the button rather than adding a wrapper: a wrapper would change
 * the size of faces that sit in fixed boxes using `w-full h-full`.
 */
export function usePlayerCardButtonProps(target: PlayerCardTargetProps | null): PlayerCardButtonProps | null {
  const opener = usePlayerCardOpener();
  if (!opener || !target) return null;
  const { seatId, accountId, name, avatar } = target;
  // An empty id means the roster entry is still a placeholder; asking the
  // server about "" could only ever fail, so the face stays plain art.
  if (!seatId && !accountId) return null;
  // A seat id takes precedence; naming both is a caller bug, and the seat is
  // the one that reaches the right person at a table.
  return {
    "aria-label": `View ${name || "player"}'s profile`,
    onClick: (event) => {
      // Several faces sit inside rows that are themselves tappable; opening
      // the card must not also fire the row's own action.
      event.stopPropagation();
      if (seatId) opener.openSeatCard(seatId, { name, avatar });
      else if (accountId) opener.openAccountCard(accountId, { name, avatar });
    },
  };
}

export type PlayerCardTriggerProps = PlayerCardTargetProps & {
  children: ReactNode;
  className?: string;
};

/** Wraps arbitrary content (the Mandali's `AlbumAvatar`, say) so tapping it opens the card. */
export function PlayerCardTrigger({ children, className = "", ...target }: PlayerCardTriggerProps) {
  const buttonProps = usePlayerCardButtonProps(target);
  if (!buttonProps) return <>{children}</>;
  // Round by default so the focus ring follows a circular face, but let a
  // caller with a square face supply its own `rounded-*` without a fight.
  const rounding = /(^|\s)rounded/.test(className) ? "" : "rounded-full";
  return (
    <button type="button" {...buttonProps} className={`inline-flex flex-shrink-0 ${rounding} ${PLAYER_CARD_BUTTON_CLASSES} ${className}`}>
      {children}
    </button>
  );
}
