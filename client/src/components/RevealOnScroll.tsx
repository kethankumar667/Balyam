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
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
