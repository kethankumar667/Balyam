import React from "react";

export type CoinAmountSize = "sm" | "md" | "lg" | "xl" | "hero" | "podium";

export interface CoinAmountProps {
  /**
   * Canonical decimal string representing the coin amount (e.g. "5000", "9007199254740993").
   * Strictly strings only — never accepts numbers or floating-point primitives to ensure
   * zero precision loss across 64-bit BigInt boundaries.
   */
  amount: string;
  size?: CoinAmountSize;
  showIcon?: boolean;
  iconPosition?: "left" | "right";
  className?: string;
  iconClassName?: string;
  suffix?: string;
  /**
   * Optional custom accessible label. If omitted, defaults to "{formatted} coins".
   */
  ariaLabel?: string;
}

/**
 * Bigint-safe decimal string formatter that inserts thousands separators
 * using pure string manipulation without parseInt, Number, or parseFloat.
 */
export function formatCoinString(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "---";
  const str = String(raw).trim();
  if (str === "---") return "---";
  if (!str) return "0";

  const isNegative = str.startsWith("-");
  const cleaned = isNegative ? str.slice(1) : str;

  // Split on decimal if present (coins are integer only in V1, but safe string handling is maintained)
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/\D/g, "");
  const decPart = parts.length > 1 ? "." + parts[1].replace(/\D/g, "") : "";

  if (!intPart && !decPart) return "0";

  // Group thousands from right to left using pure string manipulation
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = (isNegative ? "-" : "") + (formattedInt || "0") + decPart;
  return result;
}

/**
 * Struck Antique Gold Ashtha-Kona 8-Pointed Solar Star Coin Emblem.
 */
export function AshthaKonaCoinIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 text-economy-coin ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Outer milled rim */}
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      {/* Ashtha-Kona 8-Pointed Star Motif */}
      <path
        d="M12 4.5L14.2 9.2L19.5 9.5L15.5 13.2L16.8 18.5L12 15.8L7.2 18.5L8.5 13.2L4.5 9.5L9.8 9.2L12 4.5Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      {/* Center Specular Core */}
      <circle cx="12" cy="12" r="2.2" fill="#FFFDF7" fillOpacity="0.7" />
    </svg>
  );
}

const SIZE_CLASSES: Record<CoinAmountSize, { text: string; icon: number; gap: string }> = {
  sm: { text: "text-xs font-semibold", icon: 13, gap: "gap-1" },
  md: { text: "text-sm font-semibold", icon: 15, gap: "gap-1.5" },
  lg: { text: "text-base font-bold", icon: 18, gap: "gap-1.5" },
  xl: { text: "text-lg sm:text-xl font-bold", icon: 22, gap: "gap-2" },
  hero: { text: "text-2xl sm:text-3xl font-extrabold", icon: 28, gap: "gap-2.5" },
  podium: { text: "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight", icon: 38, gap: "gap-3" },
};

/**
 * Presentational CoinAmount component for strict, bigint-safe coin rendering.
 * Enforces fixed-width tabular numerals (`tabular-nums`) to prevent layout jitter.
 */
export const CoinAmount: React.FC<CoinAmountProps> = ({
  amount,
  size = "md",
  showIcon = true,
  iconPosition = "left",
  className = "",
  iconClassName = "",
  suffix,
  ariaLabel,
}) => {
  const formatted = formatCoinString(amount);
  const sizeConfig = SIZE_CLASSES[size];
  const computedAriaLabel = ariaLabel || (formatted === "---" ? "Coins unavailable" : `${formatted} coins`);

  return (
    <span
      className={`inline-flex items-center ${sizeConfig.gap} font-sans tabular-nums text-ink-hi dark:text-text-hi ${sizeConfig.text} ${className}`}
      aria-label={computedAriaLabel}
    >
      {showIcon && iconPosition === "left" && (
        <AshthaKonaCoinIcon size={sizeConfig.icon} className={iconClassName} />
      )}
      <span>{formatted}</span>
      {suffix && <span className="text-ink-lo dark:text-text-lo text-xs font-medium ml-0.5">{suffix}</span>}
      {showIcon && iconPosition === "right" && (
        <AshthaKonaCoinIcon size={sizeConfig.icon} className={iconClassName} />
      )}
    </span>
  );
};

export default CoinAmount;
