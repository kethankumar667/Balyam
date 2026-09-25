import type { ReactNode } from "react";
import { coverClothClass } from "./coverCloth";

/**
 * Ornament #2 — the satin bookmark ribbon: "something is new in here".
 *
 * It replaces the red numbered badge. It hangs from the top edge of whatever
 * `relative` element contains it; the number is decorative, and the spoken
 * label says what it means.
 */
export function Ribbon({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="album-ribbon" role="img" aria-label={label}>
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
    </span>
  );
}

export interface AlbumCoverProps {
  /** Decides the cloth; the same id always gets the same one. */
  mandaliId: string;
  name: string;
  /** A short line under the name: who is here, the handle. */
  subtitle?: ReactNode;
  /**
   * band — the strip that heads a conversation (mobile header, desktop page header)
   * card — the larger cover at the top of the desktop side rail
   * tile — a whole album standing on the shelf
   */
  variant: "band" | "card" | "tile";
  /** Band only: sits at the start (a back button). */
  leading?: ReactNode;
  /** Band only: sits at the end (menu, invite). */
  trailing?: ReactNode;
  /** Tile and card: how many things are new. Draws the bookmark ribbon. */
  unread?: number;
  unreadLabel?: string;
  /** Tile only: member faces along the foot of the cover. */
  faces?: ReactNode;
  className?: string;
}

/**
 * Ornament #1 — the leatherette cover with a gold-stamped name.
 *
 * One component in three sizes so a group looks like itself on the shelf, at
 * the top of its conversation and in the side rail.
 */
export function AlbumCover({
  mandaliId,
  name,
  subtitle,
  variant,
  leading,
  trailing,
  unread = 0,
  unreadLabel = "",
  faces,
  className = "",
}: AlbumCoverProps) {
  const cloth = coverClothClass(mandaliId);

  if (variant === "band") {
    return (
      <header className={`album-cover ${cloth} flex items-center gap-1 px-2 py-2 ${className}`}>
        {leading}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="album-stamp m-0 truncate text-[17px] font-semibold leading-snug">{name}</h1>
          {subtitle && <p className="m-0 truncate text-sm leading-snug text-[rgb(var(--album-cover-foil)/0.82)]">{subtitle}</p>}
        </div>
        {trailing}
      </header>
    );
  }

  if (variant === "card") {
    return (
      <div className={`album-cover ${cloth} rounded-2xl px-6 py-7 text-center ${className}`}>
        <Ribbon count={unread} label={unreadLabel} />
        <h1 className="album-stamp m-0 text-2xl font-semibold leading-tight">{name}</h1>
        {subtitle && <p className="mt-1.5 mb-0 text-sm text-[rgb(var(--album-cover-foil)/0.82)]">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div
      className={`album-cover ${cloth} flex min-h-[144px] flex-col ${faces ? "justify-between" : "justify-center"} rounded-2xl px-5 pb-5 pt-8 transition-transform duration-200 ${className}`}
    >
      <Ribbon count={unread} label={unreadLabel} />
      <div className="text-center">
        <h2 className="album-stamp m-0 text-xl font-semibold leading-tight [overflow-wrap:anywhere]">{name}</h2>
        {subtitle && <p className="mt-1.5 mb-0 text-sm text-[rgb(var(--album-cover-foil)/0.82)]">{subtitle}</p>}
      </div>
      {faces && <div className="mt-4 flex justify-center">{faces}</div>}
    </div>
  );
}
