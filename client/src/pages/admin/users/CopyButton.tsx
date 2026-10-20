import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

const FEEDBACK_MS = 1800;

/** Copies a value to the clipboard and says so, for the ids an operator pastes into other tools. */
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [outcome, setOutcome] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setOutcome("copied");
    } catch {
      setOutcome("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOutcome("idle"), FEEDBACK_MS);
  };

  return (
    // `relative` holds the screen-reader text where it is: an absolutely-positioned element with no positioned
    // ancestor is placed against the page root and can stretch it into a second scrollbar.
    <span className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        onClick={() => void copy()}
        className="-my-2.5 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--chrome-ink-soft)] transition-colors hover:bg-[var(--chrome-control)] hover:text-[var(--chrome-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        {outcome === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      </button>
      <span role="status" className="sr-only">
        {outcome === "copied" ? "Copied" : outcome === "failed" ? "Copy failed" : ""}
      </span>
    </span>
  );
}
