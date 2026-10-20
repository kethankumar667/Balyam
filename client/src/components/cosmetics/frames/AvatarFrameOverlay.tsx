import { useId } from "react";
import { getFrameDesign } from "./frameDesigns";
import "./avatar-frames.css";

/**
 * A frame drawn round an avatar. It is an overlay: place it inside a `position: relative` box the size of the
 * avatar and it fills 124% of it, so the frame sits just outside the avatar's edge. It carries no pointer events
 * and is hidden from assistive technology, being decoration.
 *
 * Every piece that moves does so in CSS (see avatar-frames.css), which also stops all of it under a
 * reduced-motion preference.
 */
export default function AvatarFrameOverlay({ frameId }: { frameId: string }) {
  // useId returns something like ":r4:"; ids inside an SVG must survive being used in `url(#…)`.
  const uid = `af${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const design = getFrameDesign(frameId);
  if (!design) return null;
  const { Component } = design;
  return (
    <svg viewBox="0 0 100 100" className="af-svg" aria-hidden="true" focusable="false" data-frame={frameId}>
      <Component uid={uid} />
    </svg>
  );
}
