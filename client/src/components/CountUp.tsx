import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * GSAP-driven count-up ticker.
 *
 * Reveals an integer (or formatted-with-comma integer) by tweening from
 * zero when the element first enters the viewport. Tied to a
 * one-shot IntersectionObserver so the count only runs once per session
 * — perfect for the StatsStrip "12,543 kids playing today" social-proof.
 *
 * Reduced-motion: jumps straight to the final value with no tween.
 */
export default function CountUp({
  to,
  duration = 1.6,
  prefix = "",
  suffix = "",
  format = "comma",
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: "comma" | "raw";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paint(n: number) {
      const v = Math.round(n);
      const text =
        format === "comma" ? v.toLocaleString("en-IN") : String(v);
      el!.textContent = `${prefix}${text}${suffix}`;
    }

    if (reduced) {
      paint(to);
      return;
    }

    paint(0);
    let started = false;

    if (typeof IntersectionObserver === "undefined") {
      const tween = gsap.to({ v: 0 }, {
        v: to,
        duration,
        ease: "power2.out",
        onUpdate() {
          paint(this.targets()[0].v);
        },
      });
      return () => { tween.kill(); };
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            gsap.to({ v: 0 }, {
              v: to,
              duration,
              ease: "power2.out",
              onUpdate() {
                paint(this.targets()[0].v);
              },
            });
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration, prefix, suffix, format]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}
