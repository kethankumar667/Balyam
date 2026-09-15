/**
 * Character-themed token accessories.
 *
 * A different cosmetic category from `TokenFinishOverlay`'s material
 * finishes: instead of re-texturing the seat-colored body, a theme adds a
 * distinctive icon/badge on top of it — the same pattern the original 6
 * accessory skins (Golden Crown, Solar Flare, Cyber Pulse, Diamond Elite,
 * Phoenix Wing) already established in `PawnGlyph.tsx`. Like those, each
 * icon carries its own fixed signature colors (a crown is always gold, a
 * shuriken is always steel) — only the pawn's BODY stays tied to the
 * player's own seat color, never the badge. A theme and a finish are
 * mutually exclusive on any one skin.
 */

export type TokenThemeId =
  | "ninja"
  | "thunderHammer"
  | "superHero"
  | "arcaneWizard"
  | "starVoyager"
  | "dragonKnight"
  | "pirateCaptain"
  | "cyberBot"
  | "samurai"
  | "vampireCount"
  | "desertSultan"
  | "arcticRanger"
  | "steamInventor"
  | "jungleScout"
  | "imperialGeneral"
  | "voidReaper";

export function TokenThemeOverlay({ theme }: { theme: TokenThemeId | undefined }) {
  if (!theme) return null;

  switch (theme) {
    case "ninja":
      // A shuriken badge on the head, dark steel with a red center rivet.
      return (
        <g transform="translate(0, -37)">
          <path
            d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z"
            fill="#27272A"
            stroke="#71717A"
            strokeWidth="1.2"
          />
          <circle cx="0" cy="0" r="3" fill="#DC2626" stroke="#450A0A" strokeWidth="1" />
        </g>
      );

    case "thunderHammer":
      // A mallet resting against the shoulder with a small lightning bolt.
      return (
        <g>
          <rect x="-6" y="-58" width="12" height="10" rx="1.5" fill="#71717A" stroke="#27272A" strokeWidth="1.2" />
          <rect x="-1.6" y="-48" width="3.2" height="16" fill="#78350F" stroke="#451A03" strokeWidth="0.8" />
          <path d="M 8 -38 L 3 -30 L 7 -30 L 1 -20 L 10 -31 L 6 -31 Z" fill="#F5C542" stroke="#78350F" strokeWidth="0.8" />
        </g>
      );

    case "superHero":
      // A small cape behind the shoulders + a star emblem on the chest.
      return (
        <g>
          <path d="M -18 -18 Q -26 10 -16 40 L -10 20 Q -14 -2 -8 -18 Z" fill="#B91C1C" stroke="#450A0A" strokeWidth="1" opacity="0.92" />
          <path d="M 18 -18 Q 26 10 16 40 L 10 20 Q 14 -2 8 -18 Z" fill="#B91C1C" stroke="#450A0A" strokeWidth="1" opacity="0.92" />
          <path
            d="M 0 4 L 2.4 10 L 9 10 L 3.6 14 L 5.6 20 L 0 16 L -5.6 20 L -3.6 14 L -9 10 L -2.4 10 Z"
            fill="#F5C542"
            stroke="#78350F"
            strokeWidth="1"
          />
        </g>
      );

    case "arcaneWizard":
      // A pointed hat with a brim, plus a small sparkle trail.
      return (
        <g>
          <path d="M 0 -66 L 11 -40 L -11 -40 Z" fill="#5B21B6" stroke="#2E1065" strokeWidth="1.2" />
          <ellipse cx="0" cy="-40" rx="15" ry="4" fill="#4C1D95" stroke="#2E1065" strokeWidth="1" />
          <circle cx="0" cy="-53" r="2" fill="#F5C542" />
          <g fill="#F5C542">
            <circle cx="14" cy="-28" r="1.6" />
            <circle cx="19" cy="-20" r="1.1" />
            <circle cx="12" cy="-16" r="1.3" />
          </g>
        </g>
      );

    case "starVoyager":
      // A rounded helmet visor arc over the head, plus a couple of stars.
      return (
        <g>
          <path
            d="M -19 -37 A 19 19 0 0 1 19 -37 L 19 -30 Q 0 -42 -19 -30 Z"
            fill="#A5F3FC"
            opacity="0.4"
            stroke="#0E7490"
            strokeWidth="1.2"
          />
          <path d="M -14 -40 A 14 14 0 0 1 14 -40" fill="none" stroke="white" strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
          <g fill="white">
            <path d="M -20 -12 l 1.2 2.4 2.6 0.2 -2 1.8 0.6 2.6 -2.4 -1.4 -2.4 1.4 0.6 -2.6 -2 -1.8 2.6 -0.2 Z" />
            <circle cx="18" cy="-6" r="1.4" />
          </g>
        </g>
      );

    case "dragonKnight":
      // Angular wing spikes flanking the head, plus a small shield emblem.
      return (
        <g>
          <path d="M -18 -44 L -30 -50 L -24 -36 L -16 -38 Z" fill="#065F46" stroke="#022C22" strokeWidth="1" />
          <path d="M 18 -44 L 30 -50 L 24 -36 L 16 -38 Z" fill="#065F46" stroke="#022C22" strokeWidth="1" />
          <path
            d="M 0 4 L 8 8 L 8 18 Q 8 26 0 30 Q -8 26 -8 18 L -8 8 Z"
            fill="#B45309"
            stroke="#78350F"
            strokeWidth="1.2"
          />
          <path d="M 0 10 L 4 12 L 4 18 Q 4 22 0 24 Q -4 22 -4 18 L -4 12 Z" fill="#065F46" opacity="0.85" />
        </g>
      );

    case "pirateCaptain":
      // A wide tricorn hat + a skull-and-crossbones badge on the chest.
      return (
        <g>
          <path
            d="M -20 -44 Q 0 -58 20 -44 Q 8 -38 0 -40 Q -8 -38 -20 -44 Z"
            fill="#1C1917"
            stroke="#000000"
            strokeWidth="1.2"
          />
          <circle cx="0" cy="-45" r="2" fill="#F5C542" />
          <g transform="translate(0, 14)">
            <circle cx="0" cy="0" r="6" fill="#F5F5F4" stroke="#44403C" strokeWidth="1" />
            <circle cx="-2" cy="-1" r="1" fill="#1C1917" />
            <circle cx="2" cy="-1" r="1" fill="#1C1917" />
            <path d="M -6 5 L 6 -5 M -6 -5 L 6 5" stroke="#1C1917" strokeWidth="1.4" />
          </g>
        </g>
      );

    case "cyberBot":
      // A glowing visor band across the eyes + a blinking antenna.
      return (
        <g>
          <rect x="-16" y="-42" width="32" height="7" rx="3.5" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
          <rect x="-13" y="-40.5" width="26" height="4" rx="2" fill="#22D3EE" opacity="0.9" />
          <line x1="0" y1="-56" x2="0" y2="-63" stroke="#71717A" strokeWidth="1.4" />
          <circle cx="0" cy="-64" r="2.4" fill="#F87171">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
      );

    case "samurai":
      // A kabuto-style crescent crest on the helmet + a katana hilt accent.
      return (
        <g>
          <path
            d="M -16 -44 Q -22 -54 -12 -56 Q 0 -50 12 -56 Q 22 -54 16 -44"
            fill="none"
            stroke="#F5C542"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <ellipse cx="0" cy="-40" rx="17" ry="4" fill="#1C1917" opacity="0.85" />
          <g transform="translate(14, 18) rotate(35)">
            <rect x="-1.4" y="-16" width="2.8" height="16" fill="#E7E5E4" stroke="#78716C" strokeWidth="0.6" />
            <rect x="-3.4" y="-2" width="6.8" height="2.4" fill="#B45309" />
            <rect x="-2" y="0" width="4" height="7" fill="#1C1917" />
          </g>
        </g>
      );

    case "vampireCount":
      // A popped collar behind the neck + a small bat-wing badge.
      return (
        <g>
          <path d="M -12 -22 L -22 -8 L -10 -16 Z" fill="#18181B" stroke="#000000" strokeWidth="1" />
          <path d="M 12 -22 L 22 -8 L 10 -16 Z" fill="#18181B" stroke="#000000" strokeWidth="1" />
          <path d="M -12 -22 L -6 -14 L -10 -16 Z" fill="#7F1D1D" />
          <path d="M 12 -22 L 6 -14 L 10 -16 Z" fill="#7F1D1D" />
          <path
            d="M 0 8 Q -8 4 -10 10 Q -6 10 -3 8 L 0 12 L 3 8 Q 6 10 10 10 Q 8 4 0 8 Z"
            fill="#4C0519"
            stroke="#1C1917"
            strokeWidth="0.8"
          />
        </g>
      );

    case "desertSultan":
      // A draped turban wrap + a crescent-and-gem front piece.
      return (
        <g>
          <path d="M -18 -42 Q 0 -60 18 -42 Q 10 -46 0 -46 Q -10 -46 -18 -42 Z" fill="#FAF5EE" stroke="#D6D3D1" strokeWidth="1" />
          <path d="M -14 -44 Q 0 -52 14 -44" fill="none" stroke="#E7E0D3" strokeWidth="1.6" />
          <path d="M -4 -40 A 4 4 0 1 0 4 -40 A 3.2 3.2 0 1 1 -4 -40 Z" fill="#F5C542" />
          <circle cx="0" cy="-40" r="1.6" fill="#0E7490" />
        </g>
      );

    case "arcticRanger":
      // A scalloped fur hood trim + a snowflake badge on the chest.
      return (
        <g>
          <path
            d="M -19 -32 Q -20 -46 -12 -52 Q 0 -56 12 -52 Q 20 -46 19 -32 Q 12 -38 0 -38 Q -12 -38 -19 -32 Z"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <g stroke="#7DD3FC" strokeWidth="1.2" transform="translate(0, 16)">
            <line x1="-6" y1="0" x2="6" y2="0" />
            <line x1="0" y1="-6" x2="0" y2="6" />
            <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" />
            <line x1="-4.2" y1="4.2" x2="4.2" y2="-4.2" />
          </g>
        </g>
      );

    case "steamInventor":
      // A pair of brass goggles on the forehead + a small gear emblem.
      return (
        <g>
          <line x1="-16" y1="-40" x2="16" y2="-40" stroke="#78716C" strokeWidth="1.4" />
          <circle cx="-8" cy="-40" r="6" fill="#B45309" stroke="#78350F" strokeWidth="1.4" />
          <circle cx="-8" cy="-40" r="3.2" fill="#7DD3FC" opacity="0.8" />
          <circle cx="8" cy="-40" r="6" fill="#B45309" stroke="#78350F" strokeWidth="1.4" />
          <circle cx="8" cy="-40" r="3.2" fill="#7DD3FC" opacity="0.8" />
          <g transform="translate(0, 18)" fill="#B45309" stroke="#78350F" strokeWidth="0.8">
            <circle cx="0" cy="0" r="6" />
            <rect x="-1" y="-8.5" width="2" height="3" />
            <rect x="-1" y="5.5" width="2" height="3" />
            <rect x="-8.5" y="-1" width="3" height="2" />
            <rect x="5.5" y="-1" width="3" height="2" />
            <circle cx="0" cy="0" r="2.4" fill="#78350F" />
          </g>
        </g>
      );

    case "jungleScout":
      // A leaf headband + a compass badge on the chest.
      return (
        <g>
          <path d="M -16 -40 Q 0 -46 16 -40" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" />
          <path d="M -6 -46 Q -8 -52 -2 -54 Q 2 -50 -2 -45 Z" fill="#22C55E" stroke="#14532D" strokeWidth="0.8" />
          <path d="M 6 -46 Q 8 -52 2 -54 Q -2 -50 2 -45 Z" fill="#22C55E" stroke="#14532D" strokeWidth="0.8" />
          <g transform="translate(0, 16)">
            <circle cx="0" cy="0" r="7" fill="#B45309" stroke="#78350F" strokeWidth="1.2" />
            <path d="M 0 -4 L 2 0 L 0 4 L -2 0 Z" fill="#DC2626" />
          </g>
        </g>
      );

    case "imperialGeneral":
      // A sweeping plume crest + a ribboned medal on the chest.
      return (
        <g>
          <path
            d="M 0 -56 Q -10 -46 -6 -32 Q -2 -44 4 -50 Q 8 -42 4 -30 Q 10 -42 8 -54 Q 4 -58 0 -56 Z"
            fill="#1E3A8A"
            stroke="#0F172A"
            strokeWidth="0.8"
          />
          <g transform="translate(0, 16)">
            <path d="M -5 -8 L 0 -2 L 5 -8" fill="none" stroke="#B91C1C" strokeWidth="3" />
            <circle cx="0" cy="4" r="6" fill="#F5C542" stroke="#78350F" strokeWidth="1" />
            <circle cx="0" cy="4" r="2.4" fill="#B91C1C" />
          </g>
        </g>
      );

    case "voidReaper":
      // A deep hood with a faint inner glow + a small scythe accent.
      return (
        <g>
          <path
            d="M -20 -36 Q -22 -58 0 -62 Q 22 -58 20 -36 Q 12 -44 0 -44 Q -12 -44 -20 -36 Z"
            fill="#09090B"
            stroke="#000000"
            strokeWidth="1"
          />
          <ellipse cx="0" cy="-38" rx="10" ry="5" fill="#6D28D9" opacity="0.35" />
          <g transform="translate(15, 10) rotate(20)">
            <line x1="0" y1="-14" x2="0" y2="10" stroke="#44403C" strokeWidth="1.6" />
            <path d="M 0 -14 Q 8 -18 10 -10 Q 4 -10 0 -8 Z" fill="#D4D4D8" stroke="#78716C" strokeWidth="0.6" />
          </g>
        </g>
      );

    default:
      return null;
  }
}
