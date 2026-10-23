/**
 * BHALYAM — Cosmetics shop: the stage.
 *
 * One item at a time, large, on a plate in its rarity colour, shown on the shopper's OWN avatar / dice / token /
 * card back. The stage has no frame of its own: it sits on the showroom band, so the page reads as a place with a
 * stage in it, not a panel floating on a page.
 *
 * A luminous orbital pedestal frames the real cosmetic renderer, never a substitute product illustration.
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
  /** Step to the previous / next style; omitted for a category with fewer than two styles. */
  onStep?: (direction: -1 | 1) => void;
  /** Phone layout: the context switch moves to the bottom and the item is drawn a little smaller. */
  compact?: boolean;
}

/** One panel for every preview context, so each tab's `aria-controls` points at something that is always there. */
const PREVIEW_PANEL_ID = "preview-panel";

/** Decorative showroom lighting stays isolated from the actual cosmetic material. */
function StagePlate() {
  const shadowId = useId();
  const glowId = useId();
  const rar = "rgb(var(--shop-rar))";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 m-auto h-full w-full"
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={rar} stopOpacity="0.48" />
          <stop offset="70%" stopColor={rar} stopOpacity="0.1" />
          <stop offset="100%" stopColor={rar} stopOpacity="0" />
        </radialGradient>
        <filter id={shadowId} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g style={{ transition: "stroke 400ms, fill 400ms" }}>
        <circle cx="200" cy="180" r="190" fill={`url(#${glowId})`} />
        <circle
          cx="200" cy="180" r="148" strokeDasharray="1 13" strokeLinecap="round"
          style={{ fill: "none", stroke: "rgb(var(--shop-rar) / 0.65)" }} strokeWidth="2"
        />
        <path d="M62 180 A138 138 0 0 1 200 42 M338 180 A138 138 0 0 1 200 318" fill="none" stroke={rar} strokeWidth="1" opacity="0.3" />
        <ellipse cx="200" cy="336" rx="134" ry="20" fill="#000" opacity="0.3" filter={`url(#${shadowId})`} />
        <path d="M72 312 L72 329 A128 23 0 0 0 328 329 L328 312 Z" fill="#291E16" stroke={rar} strokeWidth="1" />
        <ellipse cx="200" cy="312" rx="128" ry="23" fill="#3B2B1C" stroke={rar} strokeWidth="2" />
        <ellipse cx="200" cy="312" rx="112" ry="17" fill={`url(#${glowId})`} stroke={rar} strokeWidth="1" />
        <ellipse cx="200" cy="312" rx="96" ry="12" fill="none" stroke="#FFF1B8" strokeWidth="1" opacity="0.6" />
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
