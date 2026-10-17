/**
 * The slow movement that makes a world feel inhabited: bubbles rising, light moving through water, seaweed
 * swaying, a lamp flame flickering, petals falling, a scan line crossing the glass. It is all CSS, started
 * by `data-bvw` on an element, and none of it runs for anyone who asked for less motion.
 */

const CSS = `
@keyframes bvw-bubble { 0% { transform: translate3d(0,0,0) scale(0.7); opacity: 0; } 12% { opacity: 0.8; } 100% { transform: translate3d(var(--bvw-drift, 14px),-112vh,0) scale(1.1); opacity: 0; } }
@keyframes bvw-ray { 0%,100% { opacity: 0.12; transform: skewX(-18deg) translateX(0); } 50% { opacity: 0.3; transform: skewX(-18deg) translateX(28px); } }
@keyframes bvw-caustic { 0% { background-position: 0 0, 40px 24px; } 100% { background-position: 160px 96px, -120px 120px; } }
@keyframes bvw-sway { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
@keyframes bvw-flicker { 0%,100% { transform: scale(1,1); opacity: 0.95; } 30% { transform: scale(0.92,1.1); opacity: 1; } 60% { transform: scale(1.05,0.94); opacity: 0.88; } }
@keyframes bvw-petal { 0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; } 10% { opacity: 0.9; } 100% { transform: translate3d(var(--bvw-drift, 40px),108vh,0) rotate(540deg); opacity: 0; } }
@keyframes bvw-scan { 0% { transform: translateY(-20%); } 100% { transform: translateY(120%); } }
@keyframes bvw-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes bvw-twinkle { 0%,100% { opacity: 0.25; } 50% { opacity: 0.9; } }
@media (prefers-reduced-motion: reduce) { [data-bvw] { animation: none !important; } }
`;

export function WorldMotion() {
  return <style>{CSS}</style>;
}

/** An animation shorthand for an element carrying `data-bvw`. */
export const motion = (name: string, seconds: number, options: { delay?: number; timing?: string; direction?: string } = {}): string =>
  `bvw-${name} ${seconds}s ${options.timing ?? "linear"} ${options.delay ?? 0}s infinite ${options.direction ?? "normal"}`;
