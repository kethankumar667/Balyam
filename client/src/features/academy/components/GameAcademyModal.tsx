import React, { useCallback, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lightbulb, MousePointerClick, ShieldCheck } from "lucide-react";
import type { GameAcademySpec, AcademyMode, AcademySlide } from "../types/academy";
import { useGameAcademy } from "../hooks/useGameAcademy";
import { useAcademyKeyboard } from "../hooks/useAcademyKeyboard";
import { AcademyHeader } from "./AcademyHeader";
import { AcademyNavigation } from "./AcademyNavigation";
import { QuickCheatsheetTab } from "./QuickCheatsheetTab";
import { SandboxRenderer, hasSandbox } from "./sandboxes/SandboxRenderer";
import Modal from "../../../components/Modal";

export interface GameAcademyModalProps {
  open: boolean;
  spec: GameAcademySpec;
  initialMode?: AcademyMode;
  onClose: () => void;
}

interface SlideViewProps {
  slide: AcademySlide;
  spec: GameAcademySpec;
  showSandbox: boolean;
  isSandboxComplete: boolean;
  onSandboxComplete: () => void;
}

/** One walkthrough slide: briefing on the left, an optional practice demo on the right. */
const SlideView: React.FC<SlideViewProps> = ({
  slide,
  spec,
  showSandbox,
  isSandboxComplete,
  onSandboxComplete,
}) => (
  <motion.div
    key={slide.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
  >
    <div className={`${showSandbox ? "lg:col-span-6" : "lg:col-span-12"} space-y-3.5 text-left`}>
      <span
        className="inline-block text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full text-stone-100"
        style={{
          background: `${spec.primaryAccent}33`,
          border: `1px solid ${spec.primaryAccent}88`,
        }}
      >
        {slide.badge}
      </span>

      <h3 className="text-lg sm:text-xl font-black text-stone-100 tracking-tight">{slide.title}</h3>

      <p className="text-xs sm:text-sm font-mono text-stone-300 leading-relaxed">{slide.summary}</p>

      <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 text-xs font-mono space-y-1">
        <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
          Core Rule
        </span>
        <p className="text-stone-200 leading-relaxed font-semibold">{slide.keyRule}</p>
      </div>

      {slide.proTip && (
        <div className="p-3 rounded-xl bg-stone-900/40 border border-stone-800 text-xs font-mono space-y-1">
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Lightbulb aria-hidden="true" className="w-3.5 h-3.5" />
            Pro Tip
          </span>
          <p className="text-stone-400 text-[11px] leading-relaxed">{slide.proTip}</p>
        </div>
      )}
    </div>

    {showSandbox && (
      <div className="lg:col-span-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
            <MousePointerClick aria-hidden="true" className="w-3.5 h-3.5" />
            Try it
          </h4>
          {isSandboxComplete && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
              <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
              Demo complete
            </span>
          )}
        </div>
        <SandboxRenderer
          kind={slide.sandboxKind}
          config={slide.sandboxConfig}
          onComplete={onSandboxComplete}
        />
      </div>
    )}
  </motion.div>
);

function describeStatus(
  spec: GameAcademySpec,
  mode: AcademyMode,
  step: number,
  slide: AcademySlide | undefined,
  isSandboxComplete: boolean,
): string {
  if (mode === "cheatsheet") return `${spec.title} tactical cheatsheet`;
  const position = `Step ${step + 1} of ${spec.slides.length}`;
  const title = slide ? `: ${slide.title}` : "";
  return `${position}${title}${isSandboxComplete ? ". Practice demo complete." : ""}`;
}

export const GameAcademyModal: React.FC<GameAcademyModalProps> = ({
  open,
  spec,
  initialMode = "walkthrough",
  onClose,
}) => {
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const {
    mode,
    setMode,
    currentStep,
    setCurrentStep,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    completedSandboxes,
    markSandboxComplete,
    completeAndClose,
  } = useGameAcademy(spec, initialMode, onClose);

  // Arrow keys only browse; finishing (which persists "seen" and closes) is an
  // explicit action on the Next/Finish button, never a stray keypress.
  const stepForwardFromKeyboard = useCallback(() => {
    if (!isLastStep) nextStep();
  }, [isLastStep, nextStep]);

  useAcademyKeyboard({
    enabled: open && mode === "walkthrough",
    containerRef: panelRef,
    onNext: stepForwardFromKeyboard,
    onPrev: prevStep,
  });

  if (!open) return null;

  const currentSlide: AcademySlide | undefined = spec.slides[currentStep];
  const isSandboxComplete = currentSlide ? completedSandboxes.has(currentSlide.id) : false;
  // Only a demo that really renders gets a sandbox area; the Next button is never gated on it.
  const showSandbox = currentSlide ? hasSandbox(currentSlide.sandboxKind) : false;

  return (
    <Modal
      open={open}
      onClose={completeAndClose}
      initialFocusRef={nextBtnRef}
      ariaLabelledBy={titleId}
      panelClassName="w-full max-w-4xl max-h-[92dvh] flex flex-col"
    >
      <div
        ref={panelRef}
        className="relative w-full rounded-3xl bg-slate-950/95 border border-stone-800 p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col text-stone-100 backdrop-blur-2xl"
      >
        {/* Announces step changes and demo completion to screen readers */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {describeStatus(spec, mode, currentStep, currentSlide, isSandboxComplete)}
        </div>

        {/* Dynamic Holographic Background Aura */}
        <div
          aria-hidden="true"
          className={`absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br ${spec.glowAura} blur-3xl pointer-events-none transition-all duration-700`}
        />

        <AcademyHeader
          spec={spec}
          mode={mode}
          onSetMode={setMode}
          onClose={completeAndClose}
          titleId={titleId}
        />

        {/* Body Content: Switch between Walkthrough & Cheatsheet */}
        <div className="py-4 flex-1 min-h-0 overflow-y-auto">
          {mode === "cheatsheet" ? (
            <QuickCheatsheetTab spec={spec} />
          ) : (
            <AnimatePresence mode="wait">
              {currentSlide && (
                <SlideView
                  key={currentSlide.id}
                  slide={currentSlide}
                  spec={spec}
                  showSandbox={showSandbox}
                  isSandboxComplete={isSandboxComplete}
                  onSandboxComplete={() => markSandboxComplete(currentSlide.id)}
                />
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Navigation (only in walkthrough mode) */}
        {mode === "walkthrough" && (
          <AcademyNavigation
            spec={spec}
            currentStep={currentStep}
            totalSteps={spec.slides.length}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={completeAndClose}
            onSelectStep={setCurrentStep}
            nextRef={nextBtnRef}
          />
        )}
      </div>
    </Modal>
  );
};

export default GameAcademyModal;
