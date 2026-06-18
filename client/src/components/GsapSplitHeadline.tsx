import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Character-by-character headline reveal powered by GSAP.
 *
 * The headline is split into individual <span> per character so GSAP can
 * stagger the entrance — each glyph drops from -22px with an overshoot
 * curve and a subtle rotation, producing the bouncy "letters arriving on
 * the slate" effect used by entertainment hero sections.
 *
 * Lines come in sequentially with a 0.18 s offset between them. Words
 * never break — whitespace stays as a single span.
 *
 * Reduced-motion: detected at mount; if active, the animation is replaced
 * with an instant opacity flip so the headline is still readable but does
 * not move.
 */
export default function GsapSplitHeadline({
  lines,
  className,
  lineClassName,
  charStagger = 0.025,
  lineDelay = 0.18,
  style,
}: {
  lines: { text: string; className?: string }[];
  className?: string;
  lineClassName?: string;
  charStagger?: number;
  lineDelay?: number;
  style?: React.CSSProperties;
}) {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = root.current;
    if (!el) return;

    const allChars = el.querySelectorAll<HTMLSpanElement>("[data-glyph]");
    if (allChars.length === 0) return;

    if (reduced) {
      gsap.set(allChars, { opacity: 1, y: 0, rotate: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(allChars, { opacity: 0, y: -22, rotate: -8 });
      const tl = gsap.timeline({ delay: 0.15 });

      const byLine = new Map<number, HTMLSpanElement[]>();
      allChars.forEach((c) => {
        const lineIdx = Number(c.dataset.line ?? "0");
        if (!byLine.has(lineIdx)) byLine.set(lineIdx, []);
        byLine.get(lineIdx)!.push(c);
      });

      [...byLine.entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([lineIdx, chars]) => {
          tl.to(
            chars,
            {
              opacity: 1,
              y: 0,
              rotate: 0,
              duration: 0.65,
              ease: "back.out(2.2)",
              stagger: charStagger,
            },
            lineIdx === 0 ? 0 : `+=${lineDelay - 0.55}`,
          );
        });
    }, el);

    return () => ctx.revert();
  }, [lines, charStagger, lineDelay]);

  return (
    <div ref={root} className={className} style={style}>
      {lines.map((line, li) => (
        <span
          key={li}
          className={`block ${lineClassName ?? ""} ${line.className ?? ""}`}
        >
          {Array.from(line.text).map((ch, ci) => (
            <span
              key={`${li}-${ci}`}
              data-glyph
              data-line={li}
              className="inline-block will-change-transform"
              style={{ whiteSpace: "pre" }}
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
