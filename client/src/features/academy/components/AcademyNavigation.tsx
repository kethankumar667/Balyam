import React from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { GameAcademySpec } from "../types/academy";
import { readableTextColor } from "../utils/readableTextColor";

interface AcademyNavigationProps {
  spec: GameAcademySpec;
  currentStep: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onSelectStep: (step: number) => void;
  /** Attached to the Next/Finish button so the dialog can focus the primary action on open. */
  nextRef?: React.Ref<HTMLButtonElement>;
}

export const AcademyNavigation: React.FC<AcademyNavigationProps> = ({
  spec,
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onSelectStep,
  nextRef,
}) => {
  return (
    <div className="pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
      {/* Progress Dots */}
      <div role="group" className="flex flex-wrap items-center justify-center" aria-label="Tutorial step progress">
        {spec.slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectStep(idx)}
            className="flex items-center justify-center min-h-[44px] min-w-[28px] cursor-pointer"
            aria-label={`Go to slide ${idx + 1}`}
            aria-current={idx === currentStep ? "step" : undefined}
          >
            {/* The visible dot stays small; the button around it is the touch target. */}
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-7"
                  : idx < currentStep
                  ? "w-2.5 bg-amber-400/50"
                  : "w-2 bg-stone-800"
              }`}
              style={idx === currentStep ? { background: spec.primaryAccent } : undefined}
            />
          </button>
        ))}
        <span className="text-[11px] font-mono text-stone-400 ml-2" aria-hidden="true">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {!isLastStep && (
          <button
            type="button"
            onClick={onSkip}
            className="px-3 min-h-[44px] text-xs font-mono font-bold text-stone-400 hover:text-stone-200 transition cursor-pointer"
          >
            Skip Intro
          </button>
        )}

        {!isFirstStep && (
          <button
            type="button"
            onClick={onPrev}
            className="px-3.5 min-h-[44px] rounded-xl border border-stone-800 hover:bg-stone-800 text-stone-300 font-mono font-bold text-xs transition flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}

        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className="flex-1 sm:flex-none px-5 min-h-[44px] rounded-xl font-black font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          style={{ background: spec.primaryAccent, color: readableTextColor(spec.primaryAccent) }}
        >
          {isLastStep ? (
            <>
              <Check aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Ready to Play!</span>
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight aria-hidden="true" className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
