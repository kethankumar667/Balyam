/**
 * paper/ — reusable "handcrafted notebook" UI primitives.
 *
 * A small, composable kit (roughjs ink borders, torn-paper chips, sketch
 * headings, sticky-note stamps) that renders the Hand Cricket scrapbook skin.
 * Built on Tailwind + CVA + the shared `cn()` helper; every piece is
 * game-agnostic and reusable app-wide.
 */
export { RoughFrame } from "./RoughFrame";
export { PaperCard, type PaperCardProps } from "./PaperCard";
export { PaperButton, type PaperButtonProps } from "./PaperButton";
export { PaperBadge, ROLE_BADGE_TONE, ROLE_BADGE_LABEL, type PaperBadgeProps } from "./PaperBadge";
export { PaperPanel, type PaperPanelProps } from "./PaperPanel";
export { SketchHeading } from "./SketchHeading";
export { TornChip, TapeDecoration } from "./TornChip";
export { StickyNote, type StickyNoteProps } from "./StickyNote";
