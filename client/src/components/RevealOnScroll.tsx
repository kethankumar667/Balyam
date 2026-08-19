import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { fadeUp, stagger } from "../lib/motion";

/**
 * Generic scroll-reveal wrapper using Framer Motion's `whileInView`.
 *
 * Children fade-and-rise into view once the wrapper crosses the viewport
 * threshold (defaults to 15%). When `staggerChildren` is true the wrapper
 * orchestrates a cascade across its direct children — each child should
 * either be a `motion.*` element with the `fadeUp` variants, or a wrapped
 * `<RevealItem>` (also exported below).
 *
 * Reduced-motion: returns the children with no motion at all so the
 * accessibility preference is preserved (Framer Motion's
 * `useReducedMotion()` is consulted via the `MotionGlobalConfig`).
 */
export function RevealOnScroll({
  children,
  staggerChildren = false,
  amount = 0.15,
  delay = 0,
  className,
  as: As = "div",
  ...rest
}: {
  children: React.ReactNode;
  staggerChildren?: boolean;
  amount?: number;
  delay?: number;
  className?: string;
  as?: keyof typeof motion;
} & Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport">) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Tag = (As as unknown) as React.ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[As] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={staggerChildren ? stagger(0.07, delay + 0.05) : fadeUp}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Convenience child for `RevealOnScroll` with stagger. Wraps a `motion.div`
 * with the `fadeUp` variants so the parent can orchestrate the cascade.
 */
/**
 * One staggered child of a `RevealOnScroll`.
 *
 * ── Why `as` exists ───────────────────────────────────────────────────
 * It used to always render a `motion.div`. When the parent was `as="ul"` and
 * the caller put an `<li>` inside, the resulting DOM was
 * `ul > div > li` — and a `<li>` whose parent is a `div` is an orphan. axe
 * reported 24 `listitem` violations plus 4 `list` violations on the home page's
 * game grid: assistive technology announced the tiles as list items belonging to
 * no list, and lost the item count that makes a list worth being one.
 *
 * The wrapper is unavoidable (it carries the stagger variants), so the fix is to
 * let it BE the list item rather than sit inside one.
 */
export function RevealItem({
  children,
  className,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const MotionTag = As === "li" ? motion.li : motion.div;
  return (
    <MotionTag variants={fadeUp} className={className}>
      {children}
    </MotionTag>
  );
}
