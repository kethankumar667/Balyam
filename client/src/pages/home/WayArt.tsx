import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";
import type { BhalyamGameSlug } from "../../components/bhalyam/data";
import { TILE_ART_BY_GAME } from "./gameArt";
import type { PlayWay } from "./playWay";
import { Chai, SeatRing, Table } from "./WayScenes";

/**
 * The picture on each "box lid" of the way cards.
 *
 * ── Why people, and why drawn scenes ──────────────────────────────────
 * The first version was objects: a table, a handheld, pawns. It was neat and it
 * left people cold, because BHALYAM is about people who already love each other
 * and nobody was in it. So "together" is a table with smiling faces round it and
 * a seat saved for you (see `WayScenes`), and "alone" is a quiet corner with a
 * glass of chai and a handheld, its snake chasing a pixel heart. Drawn rather than
 * photographed so they can move, and so they cost almost no bytes.
 *
 * Pieces fan out on hover and on selection, so the card looks like it is inviting
 * a hand.
 *
 * ── Tailwind note ─────────────────────────────────────────────────────
 * Every class is written out in full, including the `group-hover:` twins. Built
 * from string pieces, the JIT would never see them and the hover would silently
 * do nothing.
 *
 * ── Weight ────────────────────────────────────────────────────────────
 * Tile pictures go AVIF first, then WebP, PNG last. The paths are `encodeURI`d
 * because several file names contain spaces, and an unencoded space ends a
 * `srcset` URL: the AVIF/WebP sources would be silently skipped and the browser
 * would fall back to a 1.6 MB PNG.
 */

type Art = { slug: BhalyamGameSlug; width: number; height: number };

interface Piece {
  /** A picture from the tile art, or a drawn piece (`custom`). Exactly one of the two. */
  art?: Art;
  custom?: "handheld" | "table" | "chai";
  /** Position and size inside the art zone. */
  place: string;
  /** Resting pose, spread pose (chosen), and the same spread when hovered. */
  rest: string;
  spread: string;
  hover: string;
  /** App-icon tiles have their own rounded corners to clip to. */
  roundedIcon?: boolean;
}

/** Back to front: the last piece is the one in front. */
const PIECES: Record<PlayWay, readonly Piece[]> = {
  friends: [
    {
      // The table: four friends round it and one seat saved for you.
      custom: "table",
      place: "bottom-1 right-5 h-[112px] w-[112px] xl:right-12 xl:h-[160px] xl:w-[160px]",
      rest: "rotate-0",
      spread: "rotate-[3deg] scale-[1.05]",
      hover: "group-hover:rotate-[3deg] group-hover:scale-[1.05]",
    },
  ],
  solo: [
    {
      art: { slug: "brainvita", width: 800, height: 800 },
      place: "left-2 top-9 h-[50px] w-[50px] xl:h-[80px] xl:w-[80px]",
      rest: "-rotate-6",
      spread: "-rotate-[13deg] -translate-x-1.5 -translate-y-1",
      hover: "group-hover:-rotate-[13deg] group-hover:-translate-x-1.5 group-hover:-translate-y-1",
      roundedIcon: true,
    },
    {
      // A glass of chai, in front of the puzzle: somebody has made you tea.
      custom: "chai",
      place: "bottom-1 left-3 h-[44px] w-[33px] xl:left-6 xl:h-[64px] xl:w-[48px]",
      rest: "rotate-0",
      spread: "scale-[1.08]",
      hover: "group-hover:scale-[1.08]",
    },
    {
      // The pocket handheld: the pixel snake on its screen is the "alone" idea,
      // a game of your own in your own corner. Drawn, not photographed, so the
      // snake can actually move.
      custom: "handheld",
      // `right-14` leaves the corner to the pawn's cushion.
      place: "bottom-1 right-14 h-[104px] w-[62px] xl:right-20 xl:h-[150px] xl:w-[89px]",
      rest: "rotate-[5deg]",
      spread: "rotate-[2deg] scale-[1.07] -translate-y-1",
      hover: "group-hover:rotate-[2deg] group-hover:scale-[1.07] group-hover:-translate-y-1",
    },
  ],
};

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** `/Snake Game Tile.png` -> `/Snake%20Game%20Tile.avif`. */
function sourceFor(path: string, extension: "avif" | "webp" | "png"): string {
  return encodeURI(path.replace(/\.(png|jpg|jpeg)$/i, `.${extension}`));
}

function ArtImage({ art }: { art: Art }) {
  const png = TILE_ART_BY_GAME[art.slug];
  return (
    <picture>
      <source type="image/avif" srcSet={sourceFor(png, "avif")} />
      <source type="image/webp" srcSet={sourceFor(png, "webp")} />
      <img
        src={sourceFor(png, "png")}
        alt=""
        width={art.width}
        height={art.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(74,44,22,0.28)]"
      />
    </picture>
  );
}

/**
 * A serpentine route through the LCD on an 8-unit grid, the way a snake game
 * sweeps a screen row by row. 36 + 8 + 32 + 8 + 32 + 8 + 36 = 160 units.
 */
const SNAKE_PATH = "M13 22 H49 V30 H17 V38 H49 V46 H13";
const SNAKE_PATH_LENGTH = 160;
const SNAKE_SEGMENTS = 7;
const SNAKE_SEGMENT = 3.4;
const SNAKE_JOINT = 0.9;
/**
 * `dasharray` for ONE segmented snake on a path of this length: seven pixels
 * with hairline joints, then a gap that fills the rest of the lap. Animating the
 * dash offset by a full lap slides it along the route and, because the pattern
 * repeats once per lap, it re-enters at the start like an arcade wrap-around.
 */
const SNAKE_DASH = (() => {
  const body = SNAKE_SEGMENTS * SNAKE_SEGMENT + (SNAKE_SEGMENTS - 1) * SNAKE_JOINT;
  const pattern: number[] = [];
  for (let i = 0; i < SNAKE_SEGMENTS; i += 1) {
    pattern.push(SNAKE_SEGMENT);
    pattern.push(i === SNAKE_SEGMENTS - 1 ? SNAKE_PATH_LENGTH - body : SNAKE_JOINT);
  }
  return pattern.join(" ");
})();

/** The snake's food, as the pixel heart it would be on a real LCD: 5 by 4 pixels. */
const HEART_ROWS = ["01010", "11111", "01110", "00100"] as const;
const HEART_PIXEL = 1.6;
const HEART_X = 9.8;
const HEART_Y = 43.8;

/**
 * The pocket handheld on the "Play alone" box: a dark body, an olive LCD with a
 * faint scanline, and a pixel snake working its way down the screen toward a
 * pixel heart.
 *
 * The snake is the invitation, so it moves when it matters: it crawls while the
 * box is hovered or chosen (`active`), and takes a single lap the first time the
 * section scrolls into view, as a hint that this thing is alive. At rest it
 * stops, which keeps the page quiet (nothing loops forever on its own). Reduced
 * motion shows the snake still. Drawn rather than photographed so it can move,
 * and so it costs no image bytes.
 */
function Handheld({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });

  useEffect(() => {
    // Always start a run from the resting pose, so a stopped snake never freezes mid-turn.
    controls.set({ strokeDashoffset: 0 });
    if (reduceMotion) return undefined;
    const lap = { strokeDashoffset: [0, -SNAKE_PATH_LENGTH] };
    if (active) {
      void controls.start(lap, { duration: 6, ease: "linear", repeat: Infinity });
    } else if (seen) {
      void controls.start(lap, { duration: 4, ease: "easeInOut" });
    }
    return () => controls.stop();
  }, [active, seen, reduceMotion, controls]);

  const beating = active && !reduceMotion;

  return (
    <svg
      ref={ref}
      data-handheld=""
      viewBox="0 0 64 108"
      focusable="false"
      aria-hidden="true"
      className={`h-full w-full overflow-visible transition-[filter] duration-500 ${
        active
          ? "drop-shadow-[0_0_10px_rgba(168,190,60,0.6)]"
          : "drop-shadow-[0_8px_8px_rgba(74,44,22,0.3)]"
      }`}
    >
      <defs>
        <linearGradient id="way-hh-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2B3E66" />
          <stop offset="1" stopColor="#15213B" />
        </linearGradient>
        <pattern id="way-hh-scan" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="1" fill="#26331A" opacity="0.1" />
        </pattern>
      </defs>

      <rect x="2" y="2" width="60" height="104" rx="15" fill="url(#way-hh-body)" />
      <rect x="2.75" y="2.75" width="58.5" height="102.5" rx="14.5" fill="none" stroke="#4A6199" strokeOpacity="0.6" strokeWidth="1.2" />
      <rect x="24" y="8" width="16" height="2.4" rx="1.2" fill="#0B1426" />

      <rect x="8" y="15" width="48" height="40" rx="5" fill="#0B1426" />
      <rect x="10" y="17" width="44" height="36" rx="3" fill="#A8BE3C" />
      <rect x="10" y="17" width="44" height="36" rx="3" fill="url(#way-hh-scan)" />

      {/* The route, barely there, so the snake reads as following a path. */}
      <path d={SNAKE_PATH} fill="none" stroke="#26331A" strokeOpacity="0.12" strokeWidth="3.4" />
      <motion.path
        d={SNAKE_PATH}
        fill="none"
        stroke="#26331A"
        strokeWidth="3.4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeDasharray={SNAKE_DASH}
        initial={{ strokeDashoffset: 0 }}
        animate={controls}
      />
      {/* What the snake is heading for: a pixel heart, which beats while the box is active. */}
      <motion.g
        data-pixel-heart=""
        animate={beating ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
        transition={{ duration: 0.9, repeat: beating ? Infinity : 0 }}
      >
        {HEART_ROWS.flatMap((row, r) =>
          [...row].map((cell, c) =>
            cell === "1" ? (
              <rect
                key={`${r}-${c}`}
                x={HEART_X + c * HEART_PIXEL}
                y={HEART_Y + r * HEART_PIXEL}
                width={HEART_PIXEL}
                height={HEART_PIXEL}
                fill="#26331A"
              />
            ) : null,
          ),
        )}
      </motion.g>

      <circle cx="32" cy="68" r="8" fill="#22345A" stroke="#4A6199" strokeOpacity="0.5" />
      <circle cx="32" cy="68" r="3.2" fill="#3C5287" />
      {[0, 1, 2].map((i) => (
        <rect key={`a${i}`} x={11 + i * 15} y="82" width="12" height="6" rx="3" fill="#E8D8B4" />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={`b${i}`} x={11 + i * 15} y="92" width="12" height="6" rx="3" fill="#D9C7A0" />
      ))}
    </svg>
  );
}

/**
 * The art zone of one card. Decorative: the card's own text names the choice, so
 * this is hidden from assistive tech and every image has an empty alt.
 *
 * The player's pawn ends up INSIDE this zone: in the empty seat at the table, or
 * on the cushion beside the handheld. `selected` is what seats it.
 */
export function WayArt({
  way,
  selected,
  dimmed,
  active,
}: {
  way: PlayWay;
  selected: boolean;
  /** Another way is chosen: this one steps back a little, without disappearing. */
  dimmed: boolean;
  /** Hovered or chosen: the moving parts (the snake, the die, the steam) run. */
  active: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      // Big art waits for `xl`: a box is only ~350px wide from 640px up to 1279px
      // (two columns, and from 1024px the sidebar takes 288px), and wider art
      // there squeezed "Play together" onto two lines.
      className={`pointer-events-none relative w-[150px] shrink-0 transition-[opacity,filter] duration-300 xl:w-[250px] ${
        dimmed ? "opacity-70 saturate-50" : ""
      }`}
    >
      {PIECES[way].map((piece, index) => (
        // Entrance and pose live on two nested elements: framer owns `transform`
        // on the outer one, so the Tailwind rotate/translate would be overwritten
        // if they shared it.
        <motion.span
          key={piece.custom ?? piece.art?.slug}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: index * 0.09, ease: EASE_OUT_EXPO }}
          className={`absolute block ${piece.place}`}
        >
          <span
            className={`block h-full w-full origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              selected ? piece.spread : piece.rest
            } ${piece.hover} ${piece.roundedIcon ? "overflow-hidden rounded-[22%]" : ""}`}
          >
            {piece.custom === "handheld" ? (
              <Handheld active={active} />
            ) : piece.custom === "table" ? (
              <Table active={active} pawnHere={selected} />
            ) : piece.custom === "chai" ? (
              <Chai active={active} />
            ) : piece.art ? (
              <ArtImage art={piece.art} />
            ) : null}
          </span>
        </motion.span>
      ))}

      {/* "Alone" has no table, so the pawn's seat is a cushion beside the handheld. */}
      {way === "solo" && (
        <span className="absolute bottom-2 right-2 h-9 w-9 xl:bottom-3 xl:right-5 xl:h-12 xl:w-12">
          <SeatRing occupied={selected} ringColor="#2E9E5B" fillClass="bg-emerald-500/10" className="h-full w-full" />
        </span>
      )}
    </div>
  );
}
