import { cn } from "../../../lib/cn";

/**
 * A sticker-style achievement card for the achievement overlay and (later) the
 * sticker album. A peel-corner sticker look with an icon glyph, title and
 * description. Decorative; the title/description carry the meaning.
 */
export interface AchievementStickerProps {
  title: string;
  description: string;
  glyph?: string;
  className?: string;
  /** Muted/greyscale rendering for a not-yet-earned catalog entry. The
   *  description still shows — telling the player what to do, not hiding it
   *  as a mystery box. */
  locked?: boolean;
}

export function AchievementSticker({ title, description, glyph = "🏅", className, locked = false }: AchievementStickerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 px-4 py-4 text-center shadow-md",
        locked ? "border-[#E4D3AC] bg-[#FFFBF0]/60 grayscale opacity-60" : "border-[#E4B128] bg-[#FFFBF0]",
        className,
      )}
    >
      <span aria-hidden className="absolute right-0 top-0 h-6 w-6 bg-[#E4B128]/40 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
      <span className="text-4xl" aria-hidden>{locked ? "🔒" : glyph}</span>
      <p className="mt-1 font-display text-xl text-[#9A6E1A]">{title}</p>
      <p className="mt-0.5 text-sm text-[#6D4323]/85">{description}</p>
    </div>
  );
}
