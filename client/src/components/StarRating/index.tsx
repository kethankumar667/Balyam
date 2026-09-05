import React, { useRef } from "react";
import { Star } from "lucide-react";

const STAR_COUNT = 5;

interface StarRatingProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

interface ControlledStarRatingProps extends StarRatingProps {
  readOnly?: false;
  onChange: (value: number) => void;
  label?: string;
}

interface ReadOnlyStarRatingProps extends StarRatingProps {
  readOnly: true;
  onChange?: never;
  label?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

/**
 * A 1-5 star rating control. Copies the accessible custom-radiogroup
 * pattern `ContactUsPage.tsx`'s category cards already established
 * (`role="radiogroup"` of `role="radio"` buttons, arrow-key navigation)
 * rather than inventing a second one — this codebase had no existing star
 * widget to build on.
 */
export default function StarRating(props: ControlledStarRatingProps | ReadOnlyStarRatingProps) {
  const { value, className = "", size = "md", label = "Rating" } = props;
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (props.readOnly) {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${value} out of ${STAR_COUNT} stars`}>
        {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => (
          <Star
            key={star}
            className={`${SIZE_CLASSES[size]} ${star <= value ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300 dark:text-slate-600"}`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  const { onChange } = props;

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      next = index < STAR_COUNT ? index + 1 : 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      next = index > 1 ? index - 1 : STAR_COUNT;
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 1;
    } else if (e.key === "End") {
      e.preventDefault();
      next = STAR_COUNT;
    }
    if (next !== null) {
      onChange(next);
      starRefs.current[next - 1]?.focus();
    }
  };

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} role="radiogroup" aria-label={label}>
      {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => {
        const isSelected = star === value;
        const isFilled = star <= value;
        return (
          <button
            key={star}
            ref={(el) => {
              starRefs.current[star - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            tabIndex={isSelected || (value === 0 && star === 1) ? 0 : -1}
            onClick={() => onChange(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            className="cursor-pointer p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
          >
            <Star
              className={`${SIZE_CLASSES[size]} transition-colors ${isFilled ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300 dark:text-slate-600"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
