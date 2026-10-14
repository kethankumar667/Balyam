import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { recordAgeAnswer } from "../../lib/privacy/ageGate";
import { useAgeGatePending } from "../../hooks/useAgeGatePending";
import Modal from "../Modal";

/**
 * First-run age question. It comes before the privacy choice, because what a
 * player may be asked to agree to depends on whether they are an adult.
 *
 * Like the privacy choice it must be answered, not dismissed: Escape and the
 * backdrop do nothing, and both answers are buttons of equal weight so neither
 * is a nudge. The answer is self-declared and kept on this device only; see
 * lib/privacy/ageGate.ts for what that does and does not give us.
 */
type Step = "ask" | "guardian" | "blocked";

export default function AgeGateModal() {
  const [isReady, setIsReady] = useState(false);
  const [step, setStep] = useState<Step>("ask");
  const { pathname } = useLocation();
  const pending = useAgeGatePending();
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Deferred a beat so it does not fight the page's first paint.
    const id = window.setTimeout(() => setIsReady(true), 400);
    return () => window.clearTimeout(id);
  }, []);

  // The policy pages stay readable, so someone can read before answering.
  const open = isReady && pending && pathname !== "/privacy" && pathname !== "/terms";
  if (!open) return null;

  const buttonBase =
    "min-h-[48px] w-full rounded-2xl border px-4 py-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600";

  return (
    <Modal
      open={open}
      initialFocusRef={firstButtonRef}
      mobileSheet
      zIndex={70}
      closeOnBackdropClick={false}
      ariaLabelledBy="age-gate-title"
    >
      <div className="mx-auto w-[min(94vw,440px)] rounded-3xl border border-amber-200 bg-[#FFFBF2] p-5 text-stone-900 shadow-2xl">
        {step === "ask" && (
          <>
            <h2 id="age-gate-title" className="text-xl font-black">
              Before you play
            </h2>
            <p className="mt-2 text-sm text-stone-700">
              BHALYAM is a place for friends to play together. Are you 18 or older?
            </p>
            <div className="mt-4 space-y-2">
              <button
                ref={firstButtonRef}
                type="button"
                className={`${buttonBase} border-stone-300 bg-white`}
                onClick={() => recordAgeAnswer("adult", false)}
              >
                I'm 18 or older
              </button>
              <button
                type="button"
                className={`${buttonBase} border-stone-300 bg-white`}
                onClick={() => setStep("guardian")}
              >
                I'm under 18
              </button>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              We keep only your answer, on this device. No birthday is stored.{" "}
              <a className="font-semibold underline" href="/privacy">
                Read the privacy notice
              </a>
            </p>
          </>
        )}

        {step === "guardian" && (
          <>
            <h2 id="age-gate-title" className="text-xl font-black">
              A parent or guardian first
            </h2>
            <p className="mt-2 text-sm text-stone-700">
              BHALYAM does not offer real-money gaming. If you are under 18 you may play only with the consent and
              supervision of a parent or guardian. In this mode, sending or asking for coins between players is
              switched off.
            </p>
            <p className="mt-2 text-sm font-semibold text-stone-800">Is a parent or guardian with you, and is it OK with them?</p>
            <div className="mt-4 space-y-2">
              <button
                ref={firstButtonRef}
                type="button"
                className={`${buttonBase} border-stone-300 bg-white`}
                onClick={() => recordAgeAnswer("minor", true)}
              >
                Yes, they are with me and agree
              </button>
              <button
                type="button"
                className={`${buttonBase} border-stone-300 bg-white`}
                onClick={() => setStep("blocked")}
              >
                No, not right now
              </button>
            </div>
          </>
        )}

        {step === "blocked" && (
          <>
            <h2 id="age-gate-title" className="text-xl font-black">
              Come back with a parent or guardian
            </h2>
            <p className="mt-2 text-sm text-stone-700">
              Please ask a parent or guardian to open BHALYAM with you. They can say yes on the next screen.
            </p>
            <div className="mt-4">
              <button
                ref={firstButtonRef}
                type="button"
                className={`${buttonBase} border-stone-300 bg-white`}
                onClick={() => setStep("ask")}
              >
                Go back
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
