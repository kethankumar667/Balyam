import { useState, useCallback, useEffect, useRef } from "react";
import type { GameAcademySpec, AcademyMode } from "../types/academy";
import { HapticsManager } from "../../../services/HapticsManager";

export interface UseGameAcademyReturn {
  mode: AcademyMode;
  setMode: (mode: AcademyMode) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  nextStep: () => void;
  prevStep: () => void;
  /** Slide ids whose practice demo has been completed this session. */
  completedSandboxes: ReadonlySet<string>;
  /** Idempotent per slide: repeat calls for an already-completed slide are ignored. */
  markSandboxComplete: (slideId: string) => void;
  completeAndClose: () => void;
}

export function useGameAcademy(
  spec: GameAcademySpec,
  initialMode: AcademyMode = "walkthrough",
  onClose?: () => void,
): UseGameAcademyReturn {
  const [mode, setModeState] = useState<AcademyMode>(initialMode);
  const [currentStep, setCurrentStepState] = useState<number>(0);
  const [completedSandboxes, setCompletedSandboxes] = useState<ReadonlySet<string>>(new Set());

  // Callers hand over a fresh `onClose` closure every render. Reading it through
  // a ref keeps `completeAndClose` referentially stable, so the shared Modal's
  // focus-trap effect (which depends on it) does not re-run on every parent
  // render and yank focus back to the first control.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // The ref is the source of truth for de-duplication so two completions
  // reported in the same tick (before a re-render) still count once.
  const completedRef = useRef<ReadonlySet<string>>(completedSandboxes);

  const totalSteps = spec.slides.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const setMode = useCallback((newMode: AcademyMode) => {
    HapticsManager.getInstance().subtle();
    setModeState(newMode);
  }, []);

  const setCurrentStep = useCallback(
    (step: number) => {
      HapticsManager.getInstance().subtle();
      setCurrentStepState(Math.max(0, Math.min(totalSteps - 1, step)));
    },
    [totalSteps],
  );

  // Declared before `nextStep`, which calls it. Only the spec's own completion
  // flag is written (declared in the privacy inventory); it is never read back.
  const completeAndClose = useCallback(() => {
    try {
      localStorage.setItem(spec.storageKey, "1");
    } catch {
      // Storage can be blocked (private mode, quota); closing must still work.
    }
    HapticsManager.getInstance().subtle();
    onCloseRef.current?.();
  }, [spec.storageKey]);

  const nextStep = useCallback(() => {
    HapticsManager.getInstance().subtle();
    if (currentStep < totalSteps - 1) {
      setCurrentStepState((s) => s + 1);
    } else {
      completeAndClose();
    }
  }, [currentStep, totalSteps, completeAndClose]);

  const prevStep = useCallback(() => {
    HapticsManager.getInstance().subtle();
    setCurrentStepState((s) => Math.max(0, s - 1));
  }, []);

  const markSandboxComplete = useCallback((slideId: string) => {
    if (completedRef.current.has(slideId)) return;
    // A practice demo is not a reward: haptic feedback only, nothing is granted.
    HapticsManager.getInstance().win();
    completedRef.current = new Set(completedRef.current).add(slideId);
    setCompletedSandboxes(completedRef.current);
  }, []);

  return {
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
  };
}
