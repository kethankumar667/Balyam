import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Coins, LockKeyhole, Shield, Star, UsersRound } from "lucide-react";
import { recordAgeAnswer } from "../../lib/privacy/ageGate";
import { useAgeGatePending } from "../../hooks/useAgeGatePending";
import Modal from "../Modal";
import "./safety-gateway.css";

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

function SafetyEmblem({ step }: { step: Step }) {
  const id = useId().replace(/:/g, "");
  return (
    <div aria-hidden="true" className="safety-emblem relative mx-auto h-[112px] w-40">
      <svg viewBox="0 0 160 112" fill="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`${id}-shield`} x1="55" y1="15" x2="110" y2="95" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--safety-shield-hi)" />
            <stop offset="1" stopColor="var(--safety-shield-lo)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="54" r="45" stroke="var(--safety-orbit)" />
        <circle cx="80" cy="54" r="52" stroke="var(--safety-orbit)" strokeDasharray="2 7" />
        <path d="M5 69h20l10-10h10m70 0h10l10-10h20M22 29h14l10 10m68 39 12 12h20" stroke="var(--safety-orbit)" />
        <g fill="var(--safety-accent)">
          <circle cx="5" cy="69" r="2.5" /><circle cx="155" cy="49" r="2.5" /><circle cx="146" cy="90" r="2.5" />
        </g>
        <path d="M80 12c-11 8-23 11-33 12v29c0 22 13 37 33 47 20-10 33-25 33-47V24c-10-1-22-4-33-12Z"
          fill={`url(#${id}-shield)`} stroke="var(--safety-shield-edge)" strokeWidth="1.5" />
        <path d="M80 21c-9 6-17 9-25 10v22c0 17 9 29 25 38 16-9 25-21 25-38V31c-8-1-16-4-25-10Z"
          stroke="var(--safety-shield-edge)" strokeOpacity=".4" />
      </svg>
      <div className="safety-emblem-symbol absolute left-1/2 top-[33px] grid h-10 w-10 -translate-x-1/2 place-items-center">
        {step === "ask" ? <Star className="h-7 w-7 fill-current" strokeWidth={1.3} /> :
          step === "guardian" ? <UsersRound className="h-8 w-8" strokeWidth={1.6} /> :
            <Shield className="h-7 w-7" strokeWidth={1.6} />}
      </div>
    </div>
  );
}

function SafetySteps({ step }: { step: Step }) {
  return (
    <ol aria-label="Safety setup" className="safety-steps mx-auto my-5 grid max-w-[280px] grid-cols-2 text-center">
      <li aria-current={step === "ask" ? "step" : undefined} className="relative flex flex-col items-center">
        <span aria-hidden="true" className="safety-step-dot relative z-10 grid h-6 w-6 place-items-center rounded-full">
          {step !== "ask" ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        <span className="mt-1.5 text-xs font-bold">Age</span>
        <span className="text-[10px] text-[var(--safety-muted)]">{step === "ask" ? "Choose your age group" : "Under 18 selected"}</span>
      </li>
      <li aria-current={step !== "ask" ? "step" : undefined} className="relative flex flex-col items-center">
        <span aria-hidden="true" className="safety-step-dot relative z-10 grid h-6 w-6 place-items-center rounded-full">
          {step !== "ask" && <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        <span className="mt-1.5 text-xs font-bold">Guardian</span>
        <span className="text-[10px] text-[var(--safety-muted)]">{step === "ask" ? "Only if under 18" : "Consent & supervision"}</span>
      </li>
    </ol>
  );
}

export default function AgeGateModal() {
  const [isReady, setIsReady] = useState(false);
  const [step, setStep] = useState<Step>("ask");
  const { pathname } = useLocation();
  const pending = useAgeGatePending();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Deferred a beat so it does not fight the page's first paint.
    const id = window.setTimeout(() => setIsReady(true), 400);
    return () => window.clearTimeout(id);
  }, []);

  // The policy pages stay readable, so someone can read before answering.
  const open = isReady && pending && pathname !== "/privacy" && pathname !== "/terms";
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open, step]);

  if (!open) return null;

  const titles: Record<Step, string> = {
    ask: "Choose your play experience",
    guardian: "A guardian needs to be present",
    blocked: "Come back with a guardian",
  };
  const descriptions: Record<Step, string> = {
    ask: "Are you 18 or older? Choose the option that applies to you.",
    guardian: "Under-18 play needs a parent or guardian's consent and supervision.",
    blocked: "You can come back whenever a parent or guardian is with you and agrees to supervise.",
  };

  return (
    <Modal
      open={open}
      initialFocusRef={titleRef}
      zIndex={70}
      closeOnBackdropClick={false}
      ariaLabelledBy="age-gate-title"
      ariaDescribedBy="age-gate-description"
      className="safety-gateway-backdrop"
      panelClassName="safety-gateway w-full max-w-[480px] rounded-[28px] p-6 sm:p-7"
    >
      <header className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.16em]">
        <span className="flex items-center gap-1.5"><Star aria-hidden="true" className="h-3 w-3 text-[var(--safety-accent)]" />BHALYAM</span>
        <span className="text-[var(--safety-muted)]">Safety setup</span>
      </header>
      <div className="relative mt-3 text-center">
        <SafetyEmblem step={step} />
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--safety-muted)]">
          {step === "ask" ? "Before you play" : step === "guardian" ? "Guardian check" : "No rush"}
        </p>
        <h2 ref={titleRef} tabIndex={-1} id="age-gate-title" className="mx-auto mt-2 max-w-[340px] text-[25px] font-bold leading-tight tracking-tight">
          {titles[step]}
        </h2>
        <p id="age-gate-description" className="mx-auto mt-3 max-w-[350px] text-[13px] leading-relaxed text-[var(--safety-muted)]">
          {descriptions[step]}
        </p>
      </div>
      <SafetySteps step={step} />
      <div className="relative">
        {step === "ask" && (
          <div className="space-y-3">
            {(["adult", "minor"] as const).map((band) => (
              <button
                key={band}
                type="button"
                aria-label={band === "adult" ? "I'm 18 or older" : "I'm under 18"}
                className="safety-choice flex min-h-[64px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left"
                onClick={() => band === "adult" ? recordAgeAnswer("adult", false) : setStep("guardian")}
              >
                <span aria-hidden="true" className="safety-choice-age grid h-9 w-14 shrink-0 place-items-center rounded-lg text-xs font-bold">
                  {band === "adult" ? "18+" : "< 18"}
                </span>
                <span className="flex-1 text-[13px] font-semibold">{band === "adult" ? "I'm 18 or older" : "I'm under 18"}</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--safety-muted)]" />
              </button>
            ))}
          </div>
        )}

        {step === "guardian" && (
          <>
            <section aria-labelledby="safety-mode-title" className="safety-protections rounded-2xl border p-4">
              <h3 id="safety-mode-title" className="text-xs font-bold">Under-18 mode on this device</h3>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs"><Coins aria-hidden="true" className="h-4 w-4 text-[var(--safety-muted)]" />Coin sending</span>
                <span className="safety-status rounded-md px-2 py-1 text-[10px] font-bold">Not offered</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--safety-muted)]">Coin-sending controls are hidden in under-18 mode. BHALYAM has no real-money gaming.</p>
            </section>
            <p className="my-4 text-center text-[13px] font-semibold leading-relaxed">Is a parent or guardian with you and okay to continue?</p>
            <div className="space-y-2">
              <button
                type="button"
                className="safety-continue flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                onClick={() => recordAgeAnswer("minor", true)}
              >
                Continue with guardian <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="safety-choice min-h-14 w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
                onClick={() => setStep("blocked")}
              >
                Not right now
              </button>
              <button type="button" onClick={() => setStep("ask")} className="safety-back mx-auto flex min-h-11 items-center justify-center gap-1.5 px-3 text-xs font-semibold">
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />Back to age choice
              </button>
            </div>
          </>
        )}

        {step === "blocked" && (
          <button type="button" className="safety-choice flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold" onClick={() => setStep("ask")}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />Go back
          </button>
        )}
      </div>
      <footer className="safety-privacy relative mt-5 border-t pt-4">
        <div className="flex items-start gap-2.5">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--safety-verification)]" />
          <div>
            <p className="text-xs font-semibold">Your answer stays on this device</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--safety-muted)]">
              {step === "ask" ? "This check saves your age group and when you answer, not your birth date." :
                "This is a self-declared check, not verified guardian consent. No answer is saved until you confirm."}
            </p>
          </div>
        </div>
        <a className="safety-back mx-auto mt-1 flex min-h-11 w-fit items-center px-3 text-xs font-semibold underline underline-offset-4" href="/privacy">Privacy notice</a>
      </footer>
    </Modal>
  );
}
