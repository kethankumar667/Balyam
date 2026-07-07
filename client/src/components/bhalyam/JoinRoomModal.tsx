import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/roomStore";
import { ArrowRightIcon } from "./icons";

/* ──────────────────────────────────────────────────────────────────────────
 * BHALYAM Join Room Modal
 *
 * Standalone "join an existing room" surface for the Home header. Distinct
 * from `GameRoomSheet` (the per-game create flow) — this one has no game
 * choice because joining inherits the host's game.
 *
 * Layout mirrors GameRoomSheet for visual consistency:
 *   - bottom-sheet on mobile (<md), centered modal on desktop (≥md)
 *   - paper-cream surface, gold accents, wood text
 *   - same backdrop + safe-area handling
 *
 * Accessibility (per ui-ux-pro-max skill):
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - ESC to close, backdrop click to close
 *   - First input auto-focused on open
 *   - Body scroll locked while open
 *   - All buttons ≥44px touch target with visible focus ring
 *   - SVG icons only (no emoji in chrome)
 * ───────────────────────────────────────────────────────────────────────── */

export interface JoinRoomModalProps {
  open: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
  const navigate = useNavigate();
  const { playerName, setPlayerName, setPlayerId, playerId } = useRoomStore();

  const [name, setName] = useState(playerName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Per-field validation errors live next to the field that produced them,
  // not in a footer banner. `formError` is reserved for cross-field /
  // server-side failures that don't belong on a single input.
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Reset transient state every time the modal opens; rehydrate the
  // name from the store so a returning player doesn't retype it.
  useEffect(() => {
    if (open) {
      setNameError(null);
      setCodeError(null);
      setFormError(null);
      setBusy(false);
      setCode("");
      setName(playerName);
    }
  }, [open, playerName]);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open so the page doesn't jiggle behind the sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus the most useful field on open: name if empty (first-time visitor),
  // otherwise the code box (returning player who already gave their name).
  useEffect(() => {
    if (!open) return;
    const target = playerName ? codeInputRef.current : nameInputRef.current;
    // setTimeout 0 lets the fade-in start before we steal focus; without
    // this, screen readers may announce the field before the dialog role.
    const t = window.setTimeout(() => target?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, playerName]);

  if (!open) return null;

  function trimmedName(): string {
    return name.trim().slice(0, 20);
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const n = trimmedName();
    const c = code.trim().toUpperCase();
    // Validate both fields independently so the user sees every problem
    // at once, not a one-at-a-time game of whack-a-mole. The first
    // offending field gets focus.
    const nextNameError = !n ? "Enter your name first" : null;
    const nextCodeError = c.length !== 6 ? "Room code must be 6 characters" : null;
    setNameError(nextNameError);
    setCodeError(nextCodeError);
    setFormError(null);
    if (nextNameError) {
      nameInputRef.current?.focus();
      return;
    }
    if (nextCodeError) {
      codeInputRef.current?.focus();
      return;
    }
    setBusy(true);
    setPlayerName(n);
    const socket = getSocket();
    socket.emit(
      "room:join",
      { name: n, code: c, playerId: playerId ?? undefined },
      (res) => {
        setBusy(false);
        if (!res.ok) {
          // Server-side errors ("Room not found", "Game already in progress")
          // map most naturally to the code field — they reject the specific
          // room the user tried to join. Show inline under the code box.
          setCodeError(res.error ?? "Couldn't join that room");
          codeInputRef.current?.focus();
          return;
        }
        if (res.playerId) setPlayerId(res.playerId);
        onClose();
        navigate(`/room/${c}`);
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center
                 bg-bhalyam-wood-dark/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-room-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bhalyam-font relative w-full md:max-w-md
                   max-h-[92dvh] overflow-y-auto
                   bg-bhalyam-cream-soft text-bhalyam-wood-dark
                   border-2 border-bhalyam-cream-edge/70
                   rounded-t-3xl md:rounded-3xl
                   shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)]
                   md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Pull handle (mobile bottom-sheet only) */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span aria-hidden className="w-10 h-1.5 rounded-full bg-bhalyam-wood/30" />
        </div>

        {/* Header */}
        <header className="flex items-center gap-3 p-4 pb-3 border-b-2 border-bhalyam-cream-edge/50">
          <span
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-bhalyam-cream-soft flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #EA5A1F, #B53917)",
              boxShadow: "0 6px 14px -4px #B5391766",
            }}
            aria-hidden
          >
            <DoorIcon className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="join-room-modal-title"
              className="font-bold text-bhalyam-wood-dark text-lg leading-tight truncate"
            >
              Join a room
            </h2>
            <div className="text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood">
              Got a code? Hop in.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full inline-flex items-center justify-center
                       bg-bhalyam-cream-warm text-bhalyam-wood-dark cursor-pointer
                       hover:bg-bhalyam-cream-edge active:scale-95
                       focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                       transition-all duration-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <form className="p-4 space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <Field htmlFor="join-name" label="Your name" error={nameError}>
            <input
              ref={nameInputRef}
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Sri Krishna"
              maxLength={20}
              autoComplete="given-name"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "join-name-error" : undefined}
              className={`w-full min-h-[44px] px-3 rounded-xl
                         bg-bhalyam-cream-soft border-2
                         text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/40
                         font-semibold
                         focus:outline-none focus:ring-2
                         transition-all duration-200
                         ${nameError
                           ? "border-bhalyam-ludo-red/70 focus:border-bhalyam-ludo-red focus:ring-bhalyam-ludo-red/30"
                           : "border-bhalyam-cream-edge/80 focus:border-bhalyam-gold-dark focus:ring-bhalyam-gold/40"}`}
            />
          </Field>

          {/* Room code */}
          <Field
            htmlFor="join-code"
            label="Room code"
            error={codeError}
            helpId="join-code-help"
            help="The 6-character code your friend shared with you."
          >
            <input
              ref={codeInputRef}
              id="join-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                if (codeError) setCodeError(null);
              }}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              aria-invalid={codeError ? true : undefined}
              aria-describedby={
                codeError ? "join-code-error" : "join-code-help"
              }
              className={`w-full min-h-[52px] px-3 rounded-xl
                         bg-bhalyam-cream-soft border-2
                         text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/30
                         font-mono font-black text-2xl tracking-[0.45em] text-center
                         focus:outline-none focus:ring-2
                         transition-all duration-200
                         ${codeError
                           ? "border-bhalyam-ludo-red/70 focus:border-bhalyam-ludo-red focus:ring-bhalyam-ludo-red/30"
                           : "border-bhalyam-cream-edge/80 focus:border-bhalyam-gold-dark focus:ring-bhalyam-gold/40"}`}
            />
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2
                       min-h-[52px] rounded-2xl cursor-pointer
                       bhalyam-gold-leaf text-bhalyam-wood-dark font-bold text-[15px]
                       border border-bhalyam-gold-dark
                       disabled:opacity-50 disabled:cursor-wait
                       active:scale-[0.98] bhalyam-press-feedback
                       focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/70 focus:ring-offset-2 focus:ring-offset-bhalyam-cream-soft
                       transition-all duration-200
                       shadow-[0_6px_14px_-4px_rgba(228,177,40,0.6)]"
          >
            {busy ? "Joining…" : (
              <>
                Join Room <ArrowRightIcon className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Form-level error fallback — used only for failures that aren't
              attributable to a single input (rare; most errors land on a
              specific field above). */}
          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="text-sm text-bhalyam-ludo-red font-bold text-center
                         bg-bhalyam-ludo-red/10 border border-bhalyam-ludo-red/30
                         rounded-xl p-2"
            >
              {formError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function Field({
  label,
  htmlFor,
  children,
  error,
  help,
  helpId,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  /** Field-level validation message rendered directly below the input. */
  error?: string | null;
  /** Static helper text shown when there is no error (e.g. format hint). */
  help?: string;
  /** Used as the `aria-describedby` target for the input's help text. */
  helpId?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] uppercase tracking-widest font-bold text-bhalyam-wood"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          aria-live="polite"
          className="text-[12px] font-semibold text-bhalyam-ludo-red leading-tight pl-0.5"
        >
          {error}
        </p>
      ) : help ? (
        <p
          id={helpId ?? `${htmlFor}-help`}
          className="text-[11px] text-bhalyam-wood-dark/70 leading-tight pl-0.5"
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" className={className} aria-hidden>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function DoorIcon({ className }: { className?: string }) {
  // Wooden door silhouette — matches the "join" metaphor without leaning
  // on emoji. Stroke style intentionally matches the header chrome.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 21h16" />
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
