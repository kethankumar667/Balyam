import type { MetricDisplayFormat } from "@shared/profile/MetricRegistry";

/**
 * Standardized metric formatter for BHALYAM game statistics, scoreboards, and leaderboards.
 */
export function formatGameMetricValue(
  value: number | string | undefined | null,
  format: MetricDisplayFormat = "raw_number"
): string {
  if (value === undefined || value === null || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;

  // A numeric NaN (e.g. an upstream divide-by-zero on a percentage/rate
  // metric) must not render as the literal text "NaN" — that's what this
  // was doing. A non-numeric STRING (never actually seen in practice, but
  // the type allows it) still falls through to its own text as-is.
  if (isNaN(num)) return typeof value === "number" ? "-" : String(value);

  switch (format) {
    case "duration_seconds": {
      // Round the TOTAL seconds once, up front — rounding minutes and
      // seconds separately let a value like 119.5 come out as "1m 60s"
      // (secs rounds up to 60 before the minute carry happens).
      const totalSecs = Math.round(num);
      if (totalSecs < 60) {
        return `${totalSecs}s`;
      }
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    }

    case "percentage":
      return `${Math.round(num)}%`;

    case "runs":
      return `${num.toLocaleString()} runs`;

    case "turns":
      return `${num.toLocaleString()} turns`;

    case "penalty_pts":
      return num === 0 ? "0 (Pure Show)" : `${num.toLocaleString()} pts`;

    case "apples":
      return `${num.toLocaleString()} 🍎`;

    case "tiles":
      return `${num.toLocaleString()}`;

    case "discs":
      return `${num.toLocaleString()} discs`;

    case "lines":
      return `${num.toLocaleString()} lines`;

    case "boxes":
      return `${num.toLocaleString()} boxes`;

    case "coins":
      return `${num.toLocaleString()} coins`;

    case "raw_number":
    default:
      return num.toLocaleString();
  }
}

export interface TrendMomentum {
  direction: "UP" | "DOWN" | "STABLE";
  percentageChange: number;
  isPositiveTrend: boolean;
  label: string;
}

/**
 * Evaluates momentum across recent scores relative to scoring direction.
 */
export function calculateTrendMomentum(
  recentScores: number[],
  scoringDirection: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER"
): TrendMomentum {
  if (!recentScores || recentScores.length < 2) {
    return {
      direction: "STABLE",
      percentageChange: 0,
      isPositiveTrend: true,
      label: "Steady Baseline",
    };
  }

  const latest = recentScores[0] ?? 0;
  const previous = recentScores[1] ?? latest;

  if (previous === 0 && latest === 0) {
    return {
      direction: "STABLE",
      percentageChange: 0,
      isPositiveTrend: true,
      label: "Steady Form",
    };
  }

  const denominator = Math.max(1, Math.abs(previous));
  const diff = latest - previous;
  const pct = Math.round((Math.abs(diff) / denominator) * 100);

  if (diff === 0) {
    return {
      direction: "STABLE",
      percentageChange: 0,
      isPositiveTrend: true,
      label: "Consistent Pacing",
    };
  }

  if (scoringDirection === "HIGHER_IS_BETTER") {
    const isUp = diff > 0;
    return {
      direction: isUp ? "UP" : "DOWN",
      percentageChange: pct,
      isPositiveTrend: isUp,
      label: isUp ? `🔥 Surging (+${pct}%)` : `📉 Off-Pace (-${pct}%)`,
    };
  } else {
    // LOWER_IS_BETTER: dropping points/turns is positive
    const isLower = diff < 0;
    return {
      direction: isLower ? "DOWN" : "UP",
      percentageChange: pct,
      isPositiveTrend: isLower,
      label: isLower ? `⚡ Sharp Shave (-${pct}%)` : `⚠️ Turn Inflation (+${pct}%)`,
    };
  }
}

