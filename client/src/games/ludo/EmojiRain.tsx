import { useMemo } from "react";

/**
 * Renders a brief downpour of a single emoji across the viewport.
 * Auto-removed by the parent after ~2.6s.
 */
export default function EmojiRain({ emoji, count = 26 }: { emoji: string; count?: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.3,
        size: 1.8 + Math.random() * 1.8,
        rotate: Math.random() * 360,
        rotateEnd: (Math.random() - 0.5) * 720,
        swayKey: i,
      })),
    [count, emoji]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {drops.map((d, i) => (
        <span
          key={`${emoji}-${i}-${d.swayKey}`}
          className="emoji-rain-drop"
          style={{
            left: `${d.left}%`,
            top: "-12vh",
            fontSize: `${d.size}rem`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ["--rot-start" as any]: `${d.rotate}deg`,
            ["--rot-end" as any]: `${d.rotate + d.rotateEnd}deg`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
