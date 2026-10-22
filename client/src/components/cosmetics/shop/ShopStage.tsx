/**
 * BHALYAM — Cosmetics shop: the stage.
 *
 * One item at a time, large, on a plate in its rarity colour, shown on the shopper's OWN avatar / dice / token /
 * card back. The stage has no frame of its own: it sits on the showroom band, so the page reads as a place with a
 * stage in it, not a panel floating on a page.
 *
 * Depth is flat and honest: a ringed diamond plate, a solid pedestal, and ONE soft shadow with a real offset under
 * it. No glow halo, no spotlight beam, no radial gradient.
 *
 * Authored motion: when the selection changes the item settles onto the plate (a short rise and fade). Reduced
 * motion removes it; the colour change of the plate is a plain colour transition.
 */

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CosmeticCatalogItem, CosmeticCategory, CosmeticGameScope } from "@shared/cosmetics";
import { Button } from "../../../design-system/dls/Buttons";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { useRoomStore } from "../../../store/roomStore";
import { PREVIEW_MODES_BY_CATEGORY, type PreviewMode } from "../previewModes";
import { ItemPreviewVisual } from "./ItemPreviewVisuals";
import { shopRarityOf } from "./shopRarity";

export interface ShopStageProps {
  item: CosmeticCatalogItem;
  category: CosmeticCategory;
  scope: CosmeticGameScope;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  /** Step to the previous / next style. Omitted on a phone, where the thumbnail strip does this. */
  onStep?: (direction: -1 | 1) => void;
  /** Phone layout: the context switch moves to the bottom and the item is drawn a little smaller. */
  compact?: boolean;
}

/** One panel for every preview context, so each tab's `aria-controls` points at something that is always there. */
const PREVIEW_PANEL_ID = "preview-panel";

/** The plate and pedestal. Decorative; `--shop-rar` comes from the band it sits in. */
function StagePlate() {
  const shadowId = useId();
  const rar = "rgb(var(--shop-rar))";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 m-auto h-full w-full"
    >
      <defs>
        <filter id={shadowId} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g style={{ transition: "stroke 400ms, fill 400ms" }}>
        <rect
          x="95" y="75" width="210" height="210" rx="30" transform="rotate(45 200 180)"
          style={{ fill: "rgb(var(--shop-rar) / 0.26)", stroke: rar }} strokeWidth="4"
        />
        <rect
          x="128" y="108" width="144" height="144" rx="22" transform="rotate(45 200 180)"
          style={{ fill: "none", stroke: "rgb(var(--shop-rar) / 0.55)" }} strokeWidth="1.5"
        />
        <circle
          cx="200" cy="180" r="158" strokeDasharray="2 11" strokeLinecap="round"
          style={{ fill: "none", stroke: "rgb(var(--shop-rar) / 0.5)" }} strokeWidth="2"
        />
        {/* Pedestal: a soft shadow offset below it, the solid base, a lighter top face. */}
        <ellipse cx="200" cy="336" rx="134" ry="20" fill="#000" opacity="0.3" filter={`url(#${shadowId})`} />
        <ellipse cx="200" cy="322" rx="128" ry="21" style={{ fill: rar }} />
        <ellipse cx="200" cy="316" rx="112" ry="15" style={{ fill: "rgb(255 255 255 / 0.28)" }} />
      </g>
    </svg>
  );
}

export function ShopStage({ item, category, scope, mode, onModeChange, onStep, compact = false }: ShopStageProps) {
  const { playerName, avatarId } = useRoomStore();
  const displayName = playerName.trim() || "Player";
  const reduceMotion = useReducedMotion();
  const rarity = shopRarityOf(item.rarity);
  const modes = PREVIEW_MODES_BY_CATEGORY[category];

  const modeSwitch = (
    <div
      role="tablist"
      aria-label="Preview context"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--chrome-hairline)] bg-surface-1 p-1 shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
    >
      {modes.map((opt, index) => {
        const Icon = opt.icon;
        const isActive = mode === opt.id;
        const moveTo = (nextIndex: number) => {
          const next = modes[(nextIndex + modes.length) % modes.length];
          onModeChange(next.id);
          document.getElementById(`preview-tab-${next.id}`)?.focus();
        };
        return (
          <button
            key={opt.id}
            id={`preview-tab-${opt.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={PREVIEW_PANEL_ID}
            aria-label={opt.accessibleLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onModeChange(opt.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                moveTo(index + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                moveTo(index - 1);
              }
            }}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isActive ? "bg-ink-hi text-surface-1" : "text-ink-mid hover:text-ink-hi"
            }`}
          >
            {!compact && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative h-full min-h-[inherit] w-full">
      {/* The plate and the item share a zone that stops above the preview-context switch, so the switch can never
          sit on top of the plate, the item or the rarity badge (it did, on every size, before). */}
      <div className="absolute inset-x-0 top-0 bottom-[64px]">
        <StagePlate />
      </div>

      {/* The item. Scaled up from its intrinsic size so it fills the plate; `key` re-runs the settle on change. */}
      <div
        role="tabpanel"
        id={PREVIEW_PANEL_ID}
        aria-labelledby={`preview-tab-${mode}`}
        className="absolute inset-x-0 top-0 bottom-[64px] flex items-center justify-center pb-[6%]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${item.id}-${mode}`}
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Scaled up to fill the plate; down on a short screen, where the plate itself is small. */}
            <div
              className={`origin-center ${
                compact ? "scale-[1.05] [@media(max-height:700px)]:scale-[0.8]" : "scale-[1.55] short-land:scale-[1]"
              }`}
            >
              <ItemPreviewVisual
                item={item}
                category={category}
                scope={scope}
                mode={mode}
                displayName={displayName}
                avatarId={avatarId}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rarity badge: solid fill in the rarity colour, its name in text. */}
      <span
        className="absolute left-3 top-3 inline-flex min-h-[32px] items-center rounded-full px-3.5 text-[14px] font-bold sm:left-4 sm:top-4"
        style={{ background: "rgb(var(--shop-rar))", color: rarity.onSolid }}
      >
        {rarity.label}
      </span>

      <div className="absolute inset-x-3 bottom-2 flex justify-center">{modeSwitch}</div>

      {onStep && (
        <>
          <Button
            variant="secondary"
            size="iconOnly"
            aria-label="Previous style"
            onClick={() => onStep(-1)}
            className="absolute left-3 top-[calc(50%-32px)] -translate-y-1/2 !rounded-full"
            leftIcon={<ChevronLeft className="h-6 w-6" />}
          >
            Previous style
          </Button>
          <Button
            variant="secondary"
            size="iconOnly"
            aria-label="Next style"
            onClick={() => onStep(1)}
            className="absolute right-3 top-[calc(50%-32px)] -translate-y-1/2 !rounded-full"
            leftIcon={<ChevronRight className="h-6 w-6" />}
          >
            Next style
          </Button>
        </>
      )}
    </div>
  );
}
