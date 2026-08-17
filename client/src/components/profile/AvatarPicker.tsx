import { useCallback, useEffect, useRef } from "react";
import { Check, User as UserIcon, X } from "lucide-react";
import { AVATARS, findAvatar } from "../../lib/avatars";

/**
 * Pick an avatar from the ones BHALYAM ships.
 *
 * A radiogroup rather than a grid of buttons, because that is what it is:
 * one choice out of many, mutually exclusive.
 *
 * ── Colour is self-contained, deliberately ────────────────────────────
 * This used to be styled from `--auth-*`, which are declared by `.auth-shell`
 * on the profile page. The settings modal does not carry that class, so every
 * one of those variables resolved to nothing there: no field background, no
 * borders, no ink colour. The picker looked broken in one of its two homes
 * and nobody could see why from reading the component.
 *
 * A component mounted in more than one place cannot inherit its palette from
 * an ancestor it does not control, so the colours here are explicit and
 * theme-aware on their own. Values match the app's shipped surface ladder.
 *
 * ── Arrow keys actually move now ──────────────────────────────────────
 * The roving tabindex was already here and the docstring already promised
 * that "arrow keys move between options" — but no key handler existed, so
 * exactly one of the fifty avatars could be reached from a keyboard and the
 * other forty-nine were unreachable by any means. The handler below is the
 * other half of that contract. Columns are read from the live grid rather
 * than assumed, so Up/Down stay correct across breakpoints.
 *
 * Selection applies immediately. There is no Save: the choice is one value,
 * reversible in a tap, and a confirm step on something this small is
 * ceremony.
 */
export interface AvatarPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  /**
   * Hide the chosen-avatar summary strip and its Remove button.
   *
   * The profile card puts Remove in its own header, next to the title, which
   * is where the comp puts it. Leaving this strip on as well shipped two
   * Remove buttons and two copies of "shown next to your name" in one card.
   */
  hideSummary?: boolean;
}

export default function AvatarPicker({ value, onChange, hideSummary = false }: AvatarPickerProps) {
  const chosen = findAvatar(value);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /** Which tile owns the single tab stop. Falls back to the first. */
  const activeIndex = Math.max(
    0,
    AVATARS.findIndex((a) => a.id === value),
  );

  /**
   * Columns, measured rather than hardcoded.
   *
   * The grid is 5-up on a phone and 6-up from `sm`, so a fixed stride would
   * send Down two rows on one breakpoint and half a row on the other.
   */
  const columnCount = useCallback(() => {
    const el = gridRef.current;
    if (!el) return 6;
    const cols = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
    return Math.max(1, cols);
  }, []);

  const focusTile = useCallback((i: number) => {
    const next = Math.max(0, Math.min(AVATARS.length - 1, i));
    const el = tileRefs.current[next];
    if (!el) return;
    el.focus();
    // `nearest` so a tile already on screen does not jump under the cursor.
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const cols = columnCount();
    let next: number;
    switch (e.key) {
      case "ArrowRight": next = index + 1; break;
      case "ArrowLeft":  next = index - 1; break;
      case "ArrowDown":  next = index + cols; break;
      case "ArrowUp":    next = index - cols; break;
      case "Home":       next = 0; break;
      case "End":        next = AVATARS.length - 1; break;
      case " ":
      case "Enter":
        e.preventDefault();
        onChange(AVATARS[index].id);
        return;
      default: return;
    }
    if (next < 0 || next >= AVATARS.length) return;
    e.preventDefault();
    focusTile(next);
  }

  // Bring the chosen avatar into view when the picker opens, so a player who
  // already has one is not dropped at the top of a fifty-tile scroller with
  // no idea where their current pick sits.
  useEffect(() => {
    if (!value) return;
    const el = tileRefs.current[activeIndex];
    el?.scrollIntoView({ block: "center", behavior: "auto" });
    // Intentionally on mount only — re-running on every change would yank
    // the grid while someone is browsing with the mouse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3.5">
      {!hideSummary && (
        <div className="flex items-center gap-3.5 rounded-2xl p-3 border
                        border-[#E4D4B4] bg-[#FAF3E4]
                        dark:border-[#2A3346] dark:bg-[#1E2739]">
          <span className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center
                           border-2 border-[#A17C4E] bg-[#FFFDF8]
                           dark:border-[#66799A] dark:bg-[#131926]">
            {chosen ? (
              <img
                src={chosen.src}
                alt=""
                className="w-full h-full object-cover scale-[1.25] origin-center"
              />
            ) : (
              <UserIcon className="w-7 h-7 text-[#6B5340] dark:text-[#9FB0C6]" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[#2A221B] dark:text-[#F1F5F9] truncate">
              {chosen ? chosen.label : "No avatar yet"}
            </p>
            <p className="text-[12.5px] leading-snug text-[#6B5340] dark:text-[#9FB0C6]">
              {chosen
                ? "Shown next to your name on this device."
                : "Pick one below, or keep the plain silhouette."}
            </p>
          </div>

          {/* A bordered control, not a bare text link. Remove is destructive
              enough to deserve a hit area you can see the edges of. */}
          {chosen && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl
                         text-[13px] font-bold border transition-colors duration-150 cursor-pointer
                         border-[#A17C4E] text-[#6B5340] hover:bg-[#F2E4CB] hover:text-[#2A221B]
                         dark:border-[#66799A] dark:text-[#9FB0C6] dark:hover:bg-[#27324A] dark:hover:text-[#F1F5F9]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] dark:focus-visible:ring-[#FBBF24]"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              Remove
            </button>
          )}
        </div>
      )}

      <div className="flex items-baseline justify-between px-0.5">
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6B5340] dark:text-[#9FB0C6]">
          {AVATARS.length} avatars
        </span>
        <span className="text-[11px] text-[#6B5340] dark:text-[#9FB0C6]">
          Arrow keys to browse
        </span>
      </div>

      {/* No bordered box around the grid. The old one nested a card inside the
          modal's card, which is what made this read as two stacked panels
          rather than one surface. The grid scrolls directly, and the fade
          below is the only edge treatment it needs. */}
      <div className="relative">
        <div
          ref={gridRef}
          role="radiogroup"
          aria-label="Choose an avatar"
          className="avatar-scroll grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-[292px] overflow-y-auto
                     px-0.5 pt-0.5 pb-8"
        >
          {AVATARS.map((a, i) => {
            const selected = a.id === value;
            return (
              <button
                key={a.id}
                ref={(el) => {
                  tileRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={a.label}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={() => onChange(a.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`group relative aspect-square rounded-full cursor-pointer
                            transition-[transform,box-shadow] duration-200 ease-out
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                            focus-visible:ring-[#C2410C] focus-visible:ring-offset-[#FFFDF8]
                            dark:focus-visible:ring-[#FBBF24] dark:focus-visible:ring-offset-[#131926]
                            ${
                              selected
                                ? "ring-[3px] ring-[#C2410C] dark:ring-[#FBBF24] scale-[1.06] shadow-[0_6px_16px_-4px_rgba(194,65,12,0.55)] dark:shadow-[0_6px_18px_-4px_rgba(251,191,36,0.5)]"
                                : "ring-1 ring-[#E4D4B4] dark:ring-[#2A3346] hover:ring-[#A17C4E] dark:hover:ring-[#66799A] hover:scale-[1.06] hover:-translate-y-0.5"
                            }`}
              >
                <img
                  src={a.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full rounded-full object-cover scale-[1.25] origin-center"
                />
                {/* The state is not carried by the ring alone. A tick is a
                    shape, so it survives greyscale, colour-vision deficiency
                    and a low-quality screen. */}
                {selected && (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center
                               bg-[#C2410C] dark:bg-[#FBBF24]
                               ring-2 ring-[#FFFDF8] dark:ring-[#131926]"
                  >
                    <Check
                      className="w-3 h-3 text-white dark:text-[#131926]"
                      strokeWidth={3.5}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Fifty faces in a fixed-height box almost always cuts a row through
            the middle. Bare, that reads as a clipping bug; under a fade it
            reads as "keep going", which is what it means. A sibling overlay
            rather than a mask, so it stays still while the grid moves. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10
                     bg-gradient-to-t from-[#FFFDF8] via-[#FFFDF8]/85 to-transparent
                     dark:from-[#131926] dark:via-[#131926]/85 dark:to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}
