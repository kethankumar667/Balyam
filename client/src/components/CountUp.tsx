import React from "react";
import ReactCountUp from "react-countup";

export interface CountUpProps {
  /** Target numeric value (standard react-countup prop) */
  end?: number;
  /** Legacy alias for end */
  to?: number;
  /** Start value, defaults to 0 */
  start?: number;
  /** Animation duration in seconds, defaults to 1.8 */
  duration?: number;
  /** Number of decimal places, defaults to 0 */
  decimals?: number;
  /** Decimal separator, defaults to "." */
  decimal?: string;
  /** Thousands separator, defaults to "," */
  separator?: string;
  /** String prefix (e.g. "$", "#", "+", "LVL ") */
  prefix?: string;
  /** String suffix (e.g. "%", " XP", "d") */
  suffix?: string;
  /** Format preset: "comma" (default) or "raw" (no comma separator) */
  format?: "comma" | "raw";
  /** Custom CSS classes */
  className?: string;
  /** Preserve value on re-renders */
  preserveValue?: boolean;
}

/**
 * Standardized animated numeric ticker powered by `react-countup`.
 * Used exclusively for Coins, XP, Rankings, and Statistics across BHALYAM.
 *
 * Features:
 * - Viewport trigger with `enableScrollSpy` & `scrollSpyOnce`
 * - Clean thousand separators and prefix/suffix support
 * - Reduced-motion and test environment awareness (instant paint)
 */
export default function CountUp({
  end,
  to,
  start = 0,
  duration = 1.8,
  decimals = 0,
  decimal = ".",
  separator,
  prefix = "",
  suffix = "",
  format = "comma",
  className,
  preserveValue = true,
}: CountUpProps) {
  const targetEnd = end ?? to ?? 0;
  const effectiveSeparator = separator !== undefined ? separator : format === "raw" ? "" : ",";

  const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST === "true");
  const isReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (isTest || isReducedMotion) {
    const formatted = decimals > 0
      ? targetEnd.toFixed(decimals)
      : effectiveSeparator
      ? targetEnd.toLocaleString("en-IN")
      : String(targetEnd);

    return <span className={className}>{prefix}{formatted}{suffix}</span>;
  }

  return (
    <ReactCountUp
      start={start}
      end={targetEnd}
      duration={duration}
      decimals={decimals}
      decimal={decimal}
      separator={effectiveSeparator}
      prefix={prefix}
      suffix={suffix}
      className={className}
      enableScrollSpy
      scrollSpyOnce
      preserveValue={preserveValue}
    />
  );
}
