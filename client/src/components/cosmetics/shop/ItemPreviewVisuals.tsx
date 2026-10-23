/**
 * BHALYAM — Cosmetics shop: what an item looks like on the shopper's own look.
 *
 * One entry point, `ItemPreviewVisual`, draws the selected cosmetic the way it will appear in play: a frame on the
 * shopper's avatar, a dice skin with a roll preview, a token on the board, a card back. Presentation only: nothing
 * here touches the game engine, the network, or the RNG.
 *
 * Shop-only presentation keeps the real cosmetic materials without coupling previews to a game engine.
 */

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Grid, RotateCw, Star } from "lucide-react";
import type { CosmeticCatalogItem, CosmeticCategory, CosmeticGameScope } from "@shared/cosmetics";
import SeatAvatar from "../../profile/SeatAvatar";
import { isFrameId } from "../frames/frameDesigns";
import type { PreviewMode } from "../previewModes";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import {
  getDiceSkinConfig,
  getRummyCardBackConfig,
  getTokenSkinConfig,
  getUnoCardBackConfig,
} from "../../../lib/cosmeticsResolver";
import { PawnGlyph } from "../../../games/ludo/PawnGlyph";
import { COLOR_HEX, COLOR_HEX_DARK } from "../../../games/ludo/board-layout";

/** No real seat exists at shop-preview time — every token preview shows
 *  this one fixed "showcase" seat color, matching CosmeticsItemCard's
 *  thumbnail, so a finish's own technique is what's being compared. */
const TOKEN_SHOWCASE_COLOR = COLOR_HEX.blue;
const TOKEN_SHOWCASE_COLOR_DARK = COLOR_HEX_DARK.blue;

export interface ItemPreviewVisualProps {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  mode: PreviewMode;
  displayName: string;
  avatarId: string | null;
}

export function ItemPreviewVisual({ item, category, scope, mode, displayName, avatarId }: ItemPreviewVisualProps) {
  switch (category) {
    case "DICE_SKIN":
      return <EnchantedDiceSkinPreview skinId={item.id} mode={mode} />;
    case "AVATAR_AURA":
      return <EnchantedAvatarAuraPreview auraId={item.id} mode={mode} displayName={displayName} avatarId={avatarId} />;
    case "TOKEN_SKIN":
      return <EnchantedTokenSkinPreview skinId={item.id} mode={mode} />;
    case "CARD_BACK":
      return <EnchantedCardBackPreview cardId={item.id} mode={mode} scope={scope} />;
    case "TABLE_THEME":
      return <EnchantedTableThemePreview skinId={item.id} mode={mode} />;
    case "PODIUM_TITLE":
      return <EnchantedPodiumTitlePreview skinId={item.id} titleName={item.name} displayName={displayName} mode={mode} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENCHANTED 3D DICE SKIN PREVIEW (136x136px, Tactile Materials, 3 Modes)
// ─────────────────────────────────────────────────────────────────────────────

interface DiceFaceProps {
  value: number;
  skinId: string;
  pipStyle: React.CSSProperties;
}

function DiceFacePipGrid({ value, skinId, pipStyle }: DiceFaceProps) {
  // Return standard pip positions for 1-6
  const pips = [];
  const isOne = value === 1;
  const isTwo = value === 2;
  const isThree = value === 3;
  const isFour = value === 4;
  const isFive = value === 5;
  const isSix = value === 6;

  // Dot 1: Top-Left
  if (isTwo || isThree || isFour || isFive || isSix) {
    pips.push(
      <span key="tl" className="w-3.5 h-3.5 rounded-full col-start-1 row-start-1" style={pipStyle} />,
    );
  }
  // Dot 2: Top-Right
  if (isFour || isFive || isSix) {
    pips.push(
      <span key="tr" className="w-3.5 h-3.5 rounded-full col-start-3 row-start-1" style={pipStyle} />,
    );
  }
  // Dot 3: Center-Left
  if (isSix) {
    pips.push(
      <span key="cl" className="w-3.5 h-3.5 rounded-full col-start-1 row-start-2" style={pipStyle} />,
    );
  }
  // Dot 4: Center — the classic ivory die's traditional red ace pip, a fixed
  // override on top of the config since it's a naming convention (an "ace"),
  // not a material property.
  if (isOne || isThree || isFive) {
    const isIvoryAce = isOne && skinId === "dice_classic_ivory";
    pips.push(
      <span
        key="cc"
        className="w-3.5 h-3.5 rounded-full col-start-2 row-start-2"
        style={isIvoryAce ? { ...pipStyle, background: "#DC2626", transform: "scale(1.25)" } : pipStyle}
      />,
    );
  }
  // Dot 5: Center-Right
  if (isSix) {
    pips.push(
      <span key="cr" className="w-3.5 h-3.5 rounded-full col-start-3 row-start-2" style={pipStyle} />,
    );
  }
  // Dot 6: Bottom-Left
  if (isFour || isFive || isSix) {
    pips.push(
      <span key="bl" className="w-3.5 h-3.5 rounded-full col-start-1 row-start-3" style={pipStyle} />,
    );
  }
  // Dot 7: Bottom-Right
  if (isTwo || isThree || isFour || isFive || isSix) {
    pips.push(
      <span key="br" className="w-3.5 h-3.5 rounded-full col-start-3 row-start-3" style={pipStyle} />,
    );
  }

  return (
    <div className="w-20 h-20 grid grid-cols-3 grid-rows-3 p-1.5 items-center justify-items-center">
      {pips}
    </div>
  );
}

/** Opposite faces sum to seven; depth tracks edge size in both shelf and stage views. */
function ShopDie({ skinId, value = 5, size = 144, tumbling = false }: {
  skinId: string;
  value?: number;
  size?: number;
  tumbling?: boolean;
}) {
  const dice = getDiceSkinConfig(skinId);
  const edge = size * 0.625;
  const pairs = [1, 2, 3].filter((pip) => pip !== value && pip !== 7 - value);
  const faces = [
    { value, rotation: "" },
    { value: 7 - value, rotation: "rotateY(180deg)" },
    { value: pairs[0], rotation: "rotateX(90deg)" },
    { value: 7 - pairs[0], rotation: "rotateX(-90deg)" },
    { value: pairs[1], rotation: "rotateY(90deg)" },
    { value: 7 - pairs[1], rotation: "rotateY(-90deg)" },
  ];
  return (
    <div
      aria-hidden
      data-dice-material={skinId}
      className="relative shrink-0"
      style={{ width: size, height: size, perspective: size * 5 }}
    >
      <motion.div
        data-die-cube
        className="absolute left-1/2 top-1/2"
        animate={tumbling
          ? { rotateX: [-24, 336], rotateY: [-34, 326] }
          : { rotateX: -24, rotateY: -34 }}
        transition={tumbling
          ? { duration: 0.56, repeat: Infinity, ease: "linear" }
          : { duration: 0 }}
        style={{ width: edge, height: edge, marginLeft: -edge / 2, marginTop: -edge / 2, transformStyle: "preserve-3d" }}
      >
        {faces.map((face, index) => (
          <div
            key={index}
            data-die-face={face.value}
            className="absolute inset-0 flex items-center justify-center border"
            style={{
              transform: `${face.rotation} translateZ(${edge / 2}px)`,
              backfaceVisibility: "hidden",
              borderRadius: edge * 0.08,
              background: dice.faceBg,
              borderColor: dice.faceBorder,
              boxShadow: `inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.4)${dice.glow ? `, ${dice.glow}` : ""}`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{
              background: index === 2
                ? "linear-gradient(135deg,rgba(255,255,255,0.28),transparent)"
                : index === 4
                  ? "linear-gradient(90deg,rgba(0,0,0,0.22),rgba(0,0,0,0.4))"
                  : "linear-gradient(135deg,rgba(255,255,255,0.08),rgba(0,0,0,0.1))",
            }} />
            {dice.wooden && (
              <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
                {[30, 50, 70].map((radius) => (
                  <circle key={radius} cx="15" cy="15" r={radius} fill="none" stroke="#fff" strokeWidth="0.8" />
                ))}
              </svg>
            )}
            <div className="relative" style={{ transform: `scale(${edge / 112})` }}>
              <DiceFacePipGrid value={face.value} skinId={skinId} pipStyle={{ background: dice.pipBg, boxShadow: dice.pipBorder }} />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function DiceMaterialSwatch({ skinId }: { skinId: string }) {
  return <ShopDie skinId={skinId} size={80} />;
}

function EnchantedDiceSkinPreview({
  skinId,
  mode,
}: {
  skinId: string;
  mode: PreviewMode;
}) {
  const [rollFace, setRollFace] = useState(5);
  const [isTumbling, setIsTumbling] = useState(false);
  const tumbleIntervalRef = useRef<number | null>(null);

  // Reactive reduced-motion preference — a live OS-level toggle mid-session
  // now actually takes effect, unlike the one-off matchMedia snapshot this
  // replaced (computed once per render, never updated again).
  const prefersReducedMotion = useReducedMotion();

  // Presentation-only roll preview trigger
  const triggerPresentationRoll = () => {
    if (isTumbling) return;
    if (prefersReducedMotion) {
      setRollFace((face) => face % 6 + 1);
      return;
    }
    setIsTumbling(true);
    let step = 0;
    const sequence = [2, 4, 1, 6, 3, 5, (Math.floor(Math.random() * 6) + 1)];
    tumbleIntervalRef.current = window.setInterval(() => {
      step++;
      if (step < sequence.length) {
        setRollFace(sequence[step]);
      } else {
        if (tumbleIntervalRef.current) clearInterval(tumbleIntervalRef.current);
        setIsTumbling(false);
      }
    }, 140);
  };

  useEffect(() => {
    if (mode === "ROLL_PREVIEW" && !prefersReducedMotion) {
      triggerPresentationRoll();
    }
    return () => {
      if (tumbleIntervalRef.current) clearInterval(tumbleIntervalRef.current);
      setIsTumbling(false);
    };
  }, [mode, prefersReducedMotion]);

  // Mode 1: IN_GAME Preview (Static presentational mockup, zero engine or network code)
  if (mode === "IN_GAME") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Static Mini Board Felt Mockup */}
        <div className="w-64 h-36 rounded-2xl bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 border-2 border-emerald-600/40 relative overflow-hidden flex items-center justify-center shadow-2xl">
          {/* Subtle felt texture lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          {/* Table track borders */}
          <div className="absolute inset-2 rounded-xl border border-dashed border-emerald-500/30 pointer-events-none" />

          {/* Tokens at corners */}
          <div className="absolute top-3 left-3 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-md" />
          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-md" />
          <div className="absolute bottom-3 left-3 w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-md" />
          <div className="absolute bottom-3 right-3 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-md" />

          {/* Dice placed in center of felt */}
          <div className="relative z-10 scale-75">
            <ShopDie skinId={skinId} value={6} />
          </div>
        </div>
        <span className="text-[10px] font-mono tracking-wider text-emerald-400/80 uppercase mt-2">
          In-Match Table Surface View
        </span>
      </div>
    );
  }

  // Mode 2: ROLL_PREVIEW (Presentation-only visual roll animation)
  if (mode === "ROLL_PREVIEW") {
    return (
      <div className="flex flex-col items-center justify-center">
        <ShopDie skinId={skinId} value={rollFace} tumbling={isTumbling && !prefersReducedMotion} />

        {/* Contact Shadow */}
        <div className="w-28 h-3 rounded-[100%] bg-black/70 blur-sm mt-2" />

        {/* Interactive Roll Again CTA */}
        <button
          type="button"
          onClick={triggerPresentationRoll}
          disabled={isTumbling}
          className="mt-3 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <RotateCw
            className={`w-3 h-3 text-amber-400 ${
              isTumbling && !prefersReducedMotion ? "animate-spin" : ""
            }`}
          />
          <span>{isTumbling ? "Rolling..." : "Roll Again"}</span>
        </button>
        <span className="text-[9px] font-mono text-zinc-500 mt-1">
          Visual Preview Only • Independent of game RNG
        </span>
      </div>
    );
  }

  // Mode 3: INSPECT (Default, 136x136px Large 3D Tilt Dice Showcase)
  return (
    <div className="flex flex-col items-center justify-center">
      <ShopDie skinId={skinId} />

      {/* Ground Contact Shadow */}
      <div className="w-32 h-4 rounded-[100%] bg-black/75 blur-md mt-3" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ENCHANTED AVATAR AURA PREVIEW (Profile, Game Seat, Podium)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An animated frame on the shopper's own avatar, in the three places it will be seen. `SeatAvatar` draws the
 * frame, so what is previewed is exactly what a table will see.
 */
function FramePreview({
  frameId,
  mode,
  displayName,
  avatarId,
}: {
  frameId: string;
  mode: PreviewMode;
  displayName: string;
  avatarId: string | null;
}) {
  const avatar = (size: string) => (
    <SeatAvatar avatar={avatarId ?? undefined} aura={frameId} name={displayName} className={`${size} rounded-full shadow-lg`} />
  );

  if (mode === "GAME_SEAT") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-56 h-36 rounded-2xl bg-[#0b1220] border-2 border-zinc-700/80 relative flex flex-col items-center justify-center p-3 shadow-xl">
          <div className="absolute top-2 left-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-ping" />
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Seat 1</span>
          </div>
          {avatar("w-14 h-14")}
          <span className="text-xs font-bold text-white mt-2">{displayName}</span>
        </div>
      </div>
    );
  }

  if (mode === "PODIUM") {
    return (
      <div className="flex flex-col items-center justify-center pt-5">
        {avatar("w-20 h-20")}
        <div className="w-32 py-1.5 mt-3 rounded-t-lg bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 text-black text-center font-black text-xs shadow-lg shadow-amber-500/30">
          #1 WINNER
        </div>
        <div className="w-40 h-2 bg-amber-800 rounded-b-md shadow-md" />
      </div>
    );
  }

  return <div className="flex items-center justify-center w-44 h-44">{avatar("w-28 h-28")}</div>;
}

function EnchantedAvatarAuraPreview({
  auraId,
  mode,
  displayName,
  avatarId,
}: {
  auraId: string;
  mode: PreviewMode;
  displayName: string;
  avatarId: string | null;
}) {
  if (isFrameId(auraId)) {
    return <FramePreview frameId={auraId} mode={mode} displayName={displayName} avatarId={avatarId} />;
  }

  const getAuraStyle = (id: string) => {
    switch (id) {
      case "aura_radiant_vanguard":
        return {
          glow: "from-amber-400/40 via-yellow-500/20 to-transparent",
          coreRing: "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.9)]",
          ringColor: "#f59e0b",
        };
      case "aura_ludo_king":
        return {
          glow: "from-rose-500/40 via-red-600/20 to-transparent",
          coreRing: "border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.9)]",
          ringColor: "#f43f5e",
        };
      case "aura_rummy_maestro":
        return {
          glow: "from-emerald-400/40 via-green-500/20 to-transparent",
          coreRing: "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.9)]",
          ringColor: "#34d399",
        };
      default:
        return {
          glow: "from-zinc-500/20 via-zinc-700/10 to-transparent",
          coreRing: "border-zinc-500 shadow-md",
          ringColor: "#71717a",
        };
    }
  };

  const style = getAuraStyle(auraId);

  // Mode: GAME_SEAT
  if (mode === "GAME_SEAT") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-56 h-36 rounded-2xl bg-[#0b1220] border-2 border-zinc-700/80 relative flex flex-col items-center justify-center p-3 shadow-xl">
          <div className="absolute top-2 left-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
              Seat 1
            </span>
          </div>
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full overflow-hidden border-2 ${style.coreRing} bg-zinc-900 shadow-lg`}
            >
              <SeatAvatar
                avatar={avatarId ?? undefined}
                name={displayName}
                className="w-full h-full"
              />
            </div>
          </div>
          <span className="text-xs font-bold text-white mt-1.5">
            {displayName}
          </span>
          <div className="w-24 h-1 rounded-full bg-amber-400/70 mt-1" />
        </div>
      </div>
    );
  }

  // Mode: PODIUM
  if (mode === "PODIUM") {
    return (
      <div className="flex flex-col items-center justify-center">
        <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] -mb-2 z-20" />
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full overflow-hidden border-3 ${style.coreRing} bg-zinc-900 shadow-2xl relative z-10`}
          >
            <SeatAvatar
              avatar={avatarId ?? undefined}
              name={displayName}
              className="w-full h-full"
            />
          </div>
          <Star className="w-5 h-5 text-amber-300 fill-amber-300 absolute -top-1 -right-2 motion-safe:animate-pulse z-20" />
        </div>
        <div className="w-32 py-1.5 mt-1 rounded-t-lg bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 text-black text-center font-black text-xs shadow-lg shadow-amber-500/30">
          #1 WINNER
        </div>
        <div className="w-40 h-2 bg-amber-800 rounded-b-md shadow-md" />
      </div>
    );
  }

  // Mode: PROFILE (Default)
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {/* Outer pulsing radiance halo */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${style.glow} blur-xl animate-pulse`}
      />

      {/* Rotating celestial rune ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full animate-spin [animation-duration:24s] [animation-timing-function:linear]"
          aria-hidden="true"
        >
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke={style.ringColor}
            strokeWidth="1.5"
            strokeDasharray="6 8"
            opacity="0.8"
          />
          <circle
            cx="80"
            cy="80"
            r="74"
            fill="none"
            stroke={style.ringColor}
            strokeWidth="1"
            strokeDasharray="2 6"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* 2x Scale Avatar with Core Aura Ring */}
      <div
        className={`w-28 h-28 rounded-full overflow-hidden border-4 ${style.coreRing} bg-zinc-900 shadow-2xl relative z-10`}
      >
        <SeatAvatar
          avatar={avatarId ?? undefined}
          name={displayName}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENCHANTED TOKEN SKIN PREVIEW (Inspect, Home Base, On Board)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedTokenSkinPreview({
  skinId,
  mode,
}: {
  skinId: string;
  mode: PreviewMode;
}) {
  const uid = useId().replace(/:/g, "");
  const tokenSkin = getTokenSkinConfig(skinId);
  const pawn = (sizeClass: string) => (
    <div className={sizeClass}>
      <PawnGlyph
        main={TOKEN_SHOWCASE_COLOR}
        dark={TOKEN_SHOWCASE_COLOR_DARK}
        tokenSkin={tokenSkin}
        uid={uid}
      />
    </div>
  );

  if (mode === "HOME_BASE") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Yard Mockup */}
        <div className="w-44 h-44 rounded-full bg-amber-950/40 border-4 border-amber-500/40 p-3 grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center shadow-2xl relative">
          {pawn("w-9 h-11")}
          {pawn("w-9 h-11")}
          {pawn("w-9 h-11")}
          {pawn("w-9 h-11")}
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-2">
          Home Base Yard View
        </span>
      </div>
    );
  }

  if (mode === "ON_BOARD") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Track Step Mockup */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-3 rounded-2xl border border-zinc-700 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-500 text-xs font-mono font-bold">
            24
          </div>
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg relative">
            {pawn("w-10 h-12")}
          </div>
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-500 text-xs font-mono font-bold">
            26
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-2">
          Board Track Movement View
        </span>
      </div>
    );
  }

  // INSPECT (Default)
  return (
    <div className="flex flex-col items-center justify-center relative">
      {pawn("w-24 h-32")}
      <div className="w-24 h-4 rounded-[100%] bg-black/60 blur-md mt-2" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ENCHANTED CARD BACK PREVIEW (Card Back, Draw Pile, In Hand)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedCardBackPreview({
  cardId,
  mode,
  scope,
}: {
  cardId: string;
  mode: PreviewMode;
  scope: CosmeticGameScope;
}) {
  const getCardDesign = (id: string) => {
    switch (id) {
      case "cardback_neon_cyber_uno":
        return {
          bg: "bg-zinc-950 border-cyan-400 text-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.5)]",
          pattern: "CYBER",
          badge: "bg-cyan-500/20 text-cyan-300 border border-cyan-400",
        };
      case "cardback_vintage_velvet_rummy":
        return {
          bg: "bg-gradient-to-br from-red-950 via-red-900 to-black border-amber-500/60 text-amber-400 shadow-[0_0_30px_rgba(185,28,28,0.5)]",
          pattern: "VELVET",
          badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
        };
      case "cardback_royal_sapphire_rummy":
        return {
          bg: "bg-gradient-to-br from-blue-900 via-blue-950 to-black border-slate-300/60 text-slate-200 shadow-[0_0_30px_rgba(30,58,138,0.5)]",
          pattern: "SAPPHIRE",
          badge: "bg-slate-500/20 text-slate-200 border border-slate-300/40",
        };
      case "cardback_dragon_ember_uno":
        return {
          bg: "bg-gradient-to-br from-orange-700 via-red-900 to-black border-orange-400/70 text-orange-300 shadow-[0_0_35px_rgba(234,88,12,0.55)]",
          pattern: "EMBER",
          badge: "bg-orange-500/20 text-orange-300 border border-orange-400/40",
        };
      default:
        // A back with no design of its own. The red "ONE" card is UNO's; it used to be the fallback for EVERY game,
        // so a Rummy default (Classic Navy Mandala) previewed as a red UNO card.
        if (scope === "uno" || id.includes("uno")) {
          return {
            bg: "bg-gradient-to-br from-rose-600 via-red-700 to-rose-900 border-white text-white shadow-2xl",
            pattern: "ONE",
            badge: "bg-black/30 text-white border border-white/40",
          };
        }
        return {
          bg: "bg-gradient-to-br from-blue-950 via-indigo-950 to-black border-amber-400/70 text-amber-300 shadow-2xl",
          pattern: "RUMMY",
          badge: "bg-amber-500/20 text-amber-300 border border-amber-400/40",
        };
    }
  };

  const style = getCardDesign(cardId);

  // Real illustrated card backs render the actual artwork instead of the
  // hand-authored gradient mockup above — more faithful than an approximated
  // color block, and avoids hand-writing a gradient case per artwork item.
  const isUno = scope === "uno" || cardId.includes("uno");
  const resolvedConfig = isUno ? getUnoCardBackConfig(cardId) : getRummyCardBackConfig(cardId);
  const imageSrc = resolvedConfig.kind === "image" ? resolvedConfig.imageSrc : null;

  if (imageSrc) {
    if (mode === "DRAW_PILE") {
      return (
        <div className="relative flex flex-col items-center justify-center">
          {/* Stacked Deck Layers */}
          <div className="w-28 h-40 rounded-xl bg-zinc-800 border border-zinc-700 absolute -top-2 left-2 shadow-md rotate-3" />
          <div className="w-28 h-40 rounded-xl bg-zinc-800 border border-zinc-700 absolute -top-1 left-1 shadow-md rotate-1" />
          <img src={imageSrc} alt="" className="w-28 h-40 rounded-xl object-cover relative shadow-2xl" />
          <span className="text-[10px] font-mono text-zinc-400 mt-3">
            Draw Pile Deck View
          </span>
        </div>
      );
    }

    if (mode === "IN_HAND") {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center h-44 w-52">
            <img src={imageSrc} alt="" className="w-24 h-36 rounded-xl object-cover absolute left-2 -rotate-12 shadow-xl" />
            <img src={imageSrc} alt="" className="w-24 h-36 rounded-xl object-cover absolute z-10 shadow-2xl" />
            <img src={imageSrc} alt="" className="w-24 h-36 rounded-xl object-cover absolute right-2 rotate-12 shadow-xl" />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 mt-1">
            Fanned Player Hand View
          </span>
        </div>
      );
    }

    // CARD_BACK (Default)
    return (
      <div className="flex flex-col items-center justify-center">
        <img src={imageSrc} alt="" className="w-32 h-44 rounded-2xl object-cover shadow-2xl" />
      </div>
    );
  }

  if (mode === "DRAW_PILE") {
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* Stacked Deck Layers */}
        <div className="w-28 h-40 rounded-xl bg-zinc-800 border border-zinc-700 absolute -top-2 left-2 shadow-md rotate-3" />
        <div className="w-28 h-40 rounded-xl bg-zinc-800 border border-zinc-700 absolute -top-1 left-1 shadow-md rotate-1" />
        <div
          className={`w-28 h-40 rounded-xl border-3 flex flex-col items-center justify-center relative shadow-2xl ${style.bg}`}
        >
          <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${style.badge}`}>
            {style.pattern}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-3">
          Draw Pile Deck View
        </span>
      </div>
    );
  }

  if (mode === "IN_HAND") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center h-44 w-52">
          {/* Card 1 */}
          <div
            className={`w-24 h-36 rounded-xl border-2 flex items-center justify-center absolute left-2 -rotate-12 shadow-xl ${style.bg}`}
          >
            <span className="text-[10px] font-black">{style.pattern}</span>
          </div>
          {/* Card 2 */}
          <div
            className={`w-24 h-36 rounded-xl border-2 flex items-center justify-center absolute z-10 shadow-2xl ${style.bg}`}
          >
            <span className="text-xs font-black">{style.pattern}</span>
          </div>
          {/* Card 3 */}
          <div
            className={`w-24 h-36 rounded-xl border-2 flex items-center justify-center absolute right-2 rotate-12 shadow-xl ${style.bg}`}
          >
            <span className="text-[10px] font-black">{style.pattern}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 mt-1">
          Fanned Player Hand View
        </span>
      </div>
    );
  }

  // CARD_BACK (Default)
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`w-32 h-44 rounded-2xl border-3 flex flex-col items-center justify-center relative shadow-2xl ${style.bg}`}
      >
        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${style.badge}`}>
          {style.pattern}
        </span>
        <div className="w-20 h-28 mt-2 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/50 uppercase">BHALYAM</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ENCHANTED TABLE THEME PREVIEW (Full Table, Player View, Mobile View)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedTableThemePreview({
  skinId,
  mode,
}: {
  skinId: string;
  mode: PreviewMode;
}) {
  const getThemeClass = (id: string) => {
    switch (id) {
      case "table_royal_mahogany":
        return "bg-gradient-to-br from-amber-950 via-yellow-950 to-stone-950 border-amber-700 shadow-[0_0_35px_rgba(180,83,9,0.4)]";
      case "table_crt_neon_90s":
        return "bg-gradient-to-br from-zinc-950 via-purple-950 to-cyan-950 border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.4)]";
      case "table_midnight_velvet":
        return "bg-gradient-to-br from-blue-950 via-indigo-950 to-black border-indigo-600 shadow-[0_0_35px_rgba(79,70,229,0.3)]";
      default:
        return "bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 border-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.3)]";
    }
  };

  if (mode === "MOBILE_VIEW") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Smartphone mockup */}
        <div className="w-32 h-44 rounded-3xl border-3 border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl relative">
          <div className="w-10 h-1.5 bg-zinc-800 rounded-full mx-auto mb-1" />
          <div
            className={`w-full h-[140px] rounded-2xl border flex flex-col items-center justify-center ${getThemeClass(
              skinId,
            )}`}
          >
            <Grid className="w-5 h-5 text-white/40" />
            <span className="text-[8px] font-mono text-white/50 uppercase mt-1">
              Mobile Table
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "PLAYER_VIEW") {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Player close-up view */}
        <div
          className={`w-64 h-36 rounded-2xl border-3 flex flex-col items-center justify-between p-3 relative overflow-hidden shadow-2xl ${getThemeClass(
            skinId,
          )}`}
        >
          <div className="w-full flex items-center justify-between text-[10px] text-white/60 font-mono">
            <span>Opponent Seat</span>
            <span>Reward Pool: 500 Coins</span>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-11 rounded bg-black/40 border border-white/20" />
            <div className="w-8 h-11 rounded bg-black/40 border border-white/20" />
            <div className="w-8 h-11 rounded bg-black/40 border border-white/20" />
          </div>
          <span className="text-[10px] font-bold text-white/80">Your Hand</span>
        </div>
      </div>
    );
  }

  // FULL_TABLE (Default)
  return (
    <div
      className={`w-64 h-36 rounded-2xl border-4 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ${getThemeClass(
        skinId,
      )}`}
    >
      <div className="w-32 h-20 rounded-xl border border-dashed border-white/25 flex flex-col items-center justify-center">
        <Grid className="w-6 h-6 text-white/50 animate-pulse" />
        <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase mt-1">
          FELT MAT
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ENCHANTED PODIUM TITLE PREVIEW (Profile, Lobby, Podium)
// ─────────────────────────────────────────────────────────────────────────────

function EnchantedPodiumTitlePreview({
  skinId,
  titleName,
  displayName,
  mode,
}: {
  skinId: string;
  titleName: string;
  displayName: string;
  mode: PreviewMode;
}) {
  if (mode === "LOBBY") {
    return (
      <div className="w-60 bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-3 flex items-center gap-3 shadow-xl">
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
          <Crown className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">
            {displayName}
          </div>
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {titleName}
          </span>
        </div>
      </div>
    );
  }

  if (mode === "PODIUM") {
    return (
      <div className="flex flex-col items-center justify-center">
        <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] mb-1" />
        <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/30">
          {titleName}
        </div>
        <div className="w-32 h-6 mt-2 rounded-t-lg bg-amber-800 text-amber-200 text-center text-[10px] font-bold py-1">
          #1 CHAMPION
        </div>
      </div>
    );
  }

  // PROFILE (Default)
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
      <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)] flex flex-col items-center">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
          AWARDED TITLE
        </span>
        <span className="text-sm font-black text-amber-300 uppercase tracking-wide mt-0.5">
          {titleName}
        </span>
      </div>
    </div>
  );
}
