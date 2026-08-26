import React from "react";
import { formatCoinString, AshthaKonaCoinIcon } from "./CoinAmount";

export type CoinDeltaType = "CREDIT" | "DEBIT" | "ESCROW" | "REFUND";

export interface CoinDeltaProps {
  /**
   * Delta amount string (e.g. "+150", "-500", "150").
   * Strings only — never accepts number primitives.
   */
  delta: string;
  type: CoinDeltaType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showBadgeText?: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<
  CoinDeltaType,
  {
    prefix: string;
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    ariaWord: string;
  }
> = {
  CREDIT: {
    prefix: "+",
    label: "CREDIT",
    textClass: "text-emerald-700 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    ariaWord: "Credit",
  },
  DEBIT: {
    prefix: "-",
    label: "DEBIT",
    textClass: "text-amber-800 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    ariaWord: "Debit",
  },
  ESCROW: {
    prefix: "",
    label: "ESCROW",
    textClass: "text-purple-700 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20",
    ariaWord: "Escrow voucher",
  },
  REFUND: {
    prefix: "+",
    label: "REFUND",
    textClass: "text-pink-700 dark:text-pink-400",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20",
    ariaWord: "Refund",
  },
};

/**
 * Presentational CoinDelta badge.
 * Complies with Color Independence (WCAG 1.4.1): Always renders explicit
 * semantic badge text (`[CREDIT]`, `[DEBIT]`, `[ESCROW]`, `[REFUND]`)
 * alongside directional symbols and color.
 */
export const CoinDelta: React.FC<CoinDeltaProps> = ({
  delta,
  type,
  size = "md",
  showIcon = true,
  showBadgeText = true,
  className = "",
}) => {
  const config = TYPE_CONFIG[type];
  const rawStr = delta.trim();
  const absStr = rawStr.replace(/^[+-]/, "");
  const formattedAbs = formatCoinString(absStr);
  const displayVal = `${config.prefix}${formattedAbs}`;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  }[size];

  const iconSizes = { sm: 12, md: 14, lg: 16 }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md font-sans font-semibold border tabular-nums ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses} ${className}`}
      aria-label={`${config.ariaWord} of ${formattedAbs} coins`}
    >
      {showIcon && <AshthaKonaCoinIcon size={iconSizes} className="opacity-90" />}
      <span>{displayVal}</span>
      {showBadgeText && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 ml-0.5"
          aria-hidden="true"
        >
          {config.label}
        </span>
      )}
    </span>
  );
};

export default CoinDelta;
