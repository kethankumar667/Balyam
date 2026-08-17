import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/roomStore";
import { currentAccessToken, currentAccountKind, useCapabilities } from "../../store/authStore";
import SignInWall from "../auth/SignInWall";
import { ArrowRightIcon } from "./icons";
import QrScannerModal from "../QrScannerModal";
import { isCompleteRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from "../../lib/roomCode";
import type { RoomPublicState } from "@shared/types";

/** Shape of the `room:join` acknowledgement (see shared/types.ts). */
type JoinAck = { ok: boolean; playerId?: string; seatToken?: string; state?: RoomPublicState; error?: string };

/**
 * How long to wait for the server to acknowledge a join.
 *
 * Generous rather than snappy: the target is a sleeping free-tier server
 * waking up, which takes tens of seconds, not a fast server being slow. Too
 * short and we would tell someone the join failed while it was still on its
 * way, which is the one wrong answer here — they would rejoin and take a
 * second seat.
 */
const JOIN_TIMEOUT_MS = 20_000;

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
  const { playerName, setPlayerName, setPlayerId, rememberSeat, seatFor, avatarId } =
    useRoomStore();

  const [name, setName] = useState(playerName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  // Per-field validation errors live next to the field that produced them,
  // not in a footer banner. `formError` is reserved for cross-field /
  // server-side failures that don't belong on a single input.
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  /**
   * The in-flight guard, held in a ref rather than reading `busy`.
   *
   * Auto-join fires from a change handler, so the check and the send happen
   * inside one render's closure — `busy` there is the value from the render
   * that installed the handler, which is still `false` for the keystroke that
   * started the join. A ref is the state both the handler and the ack agree
   * on, and it is what stops a pasted code and its trailing keystroke from
   * taking two seats.
   */
  const busyRef = useRef(false);

  const caps = useCapabilities();
  /**
   * A guest reaches a room by being invited, never by typing into a box —
   * shared/permissions.ts explains where that line falls and why the QR
   * scanner stays open to them. So for a guest this modal is not a form: it
   * is a scanner with a name on it, and the code only ever arrives from a
   * camera. `code` state is shared by both paths, which is why the scan
   * handler below is the sole writer of it when `joinByCode` is off.
   */
  const canType = caps.joinByCode;

  // Reset transient state every time the modal opens; rehydrate the
  // name from the store so a returning player doesn't retype it.
  useEffect(() => {
    if (open) {
      getSocket();
      setNameError(null);
      setCodeError(null);
      setFormError(null);
      setBusy(false);
      busyRef.current = false;
      setScannerOpen(false);
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

  /**
   * The one join path.
   *
   * Typing, pasting and scanning all end here. They used to each carry their
   * own copy of this emit, which is how the typed path came to be the slow
   * one: the scanner had already learned to submit by itself, and the
   * keyboard never did, so the same six characters cost an extra deliberate
   * tap depending only on how they arrived.
   */
  function joinWithCode(rawCode: string, n: string) {
    const c = normalizeRoomCode(rawCode);
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFormError(null);
    setPlayerName(n);

    /**
     * A join that never answers.
     *
     * `socket.emit` with an ack buffers silently while the socket is down —
     * and the server sleeps on its host after idle, so the first join of the
     * evening routinely lands during a cold start. The callback then fires
     * whenever the server wakes, or never, and the button sat on "Joining…"
     * the whole time with nothing to read. `.timeout()` turns that into an
     * answer we can put on screen.
     */
    getSocket()
      .timeout(JOIN_TIMEOUT_MS)
      .emit(
        "room:join",
        {
          name: n,
          code: c,
          avatar: avatarId ?? undefined,
          accountKind: currentAccountKind(),
          accessToken: currentAccessToken(),
          ...(seatFor(c) ?? {}),
        },
        (timeoutErr: unknown, res: JoinAck) => {
          busyRef.current = false;
          setBusy(false);
          if (timeoutErr) {
            setFormError(
              "The server is taking a while to answer — it may be waking up. Try again in a moment.",
            );
            return;
          }
          if (!res?.ok) {
            // Server-side errors ("Room not found", "Game already in progress")
            // map most naturally to the code field — they reject the specific
            // room the user tried to join. Show inline under the code box.
            setCodeError(res?.error ?? "Couldn't join that room");
            codeInputRef.current?.focus();
            return;
          }
          if (res.state) useRoomStore.getState().setRoomState(res.state);
          if (res.playerId) setPlayerId(res.playerId);
          if (res.playerId && res.seatToken) rememberSeat(c, res.playerId, res.seatToken);
          onClose();
          navigate(`/room/${c}`);
        },
      );
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const n = trimmedName();
    const c = normalizeRoomCode(code);
    // Validate both fields independently so the user sees every problem
    // at once, not a one-at-a-time game of whack-a-mole. The first
    // offending field gets focus.
    const nextNameError = !n ? "Enter your name first" : null;
    const nextCodeError = !isCompleteRoomCode(c)
      ? canType
        ? `Room code must be ${ROOM_CODE_LENGTH} characters`
        : "Scan your friend's QR code to join their room"
      : null;
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
    joinWithCode(c, n);
  }

  /**
   * Typing the last character is the submit.
   *
   * A six-character code has exactly one moment where it becomes joinable,
   * and asking for a button press after it is asking the player to confirm
   * something they already finished. This is what the QR path has always
   * done; the difference in "speed" between the two was mostly this.
   *
   * Only fires when the name is already filled, so it can never race a
   * half-finished form, and `busyRef` keeps a fast typist from firing twice.
   */
  function handleCodeChange(raw: string) {
    const next = normalizeRoomCode(raw);
    setCode(next);
    if (codeError) setCodeError(null);
    if (formError) setFormError(null);

    const n = trimmedName();
    if (n && isCompleteRoomCode(next) && !busyRef.current) {
      joinWithCode(next, n);
    }
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
                   bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                   border-2 border-bhalyam-cream-edge/70 dark:border-slate-800
                   rounded-t-3xl md:rounded-3xl
                   shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)]
                   md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Pull handle (mobile bottom-sheet only) */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span aria-hidden className="w-10 h-1.5 rounded-full bg-bhalyam-wood/30 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <header className="flex items-center gap-3 p-4 pb-3 border-b-2 border-bhalyam-cream-edge/50 dark:border-slate-800">
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
              className="font-bold text-bhalyam-wood-dark dark:text-slate-100 text-lg leading-tight truncate"
            >
              Join a room
            </h2>
            <div className="text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood dark:text-slate-400">
              {canType ? "Got a code? Hop in." : "Scan your friend's QR."}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full inline-flex items-center justify-center
                       bg-bhalyam-cream-warm dark:bg-[#1E2738] text-bhalyam-wood-dark dark:text-slate-200 cursor-pointer
                       hover:bg-bhalyam-cream-edge dark:hover:bg-[#2A374F] active:scale-95
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
                         bg-bhalyam-cream-soft dark:bg-[#0B0F19] border-2
                         text-bhalyam-wood-dark dark:text-slate-100 placeholder:text-bhalyam-wood-dark/40 dark:placeholder:text-slate-500
                         font-semibold
                         focus:outline-none focus:ring-2
                         transition-all duration-200
                         ${nameError
                           ? "border-bhalyam-ludo-red/70 focus:border-bhalyam-ludo-red focus:ring-bhalyam-ludo-red/30"
                           : "border-bhalyam-cream-edge/80 dark:border-slate-700/80 focus:border-bhalyam-gold-dark dark:focus:border-amber-400 focus:ring-bhalyam-gold/40"}`}
            />
          </Field>

          {/* Scan QR Code — a quiet link beside the code box for a member, the
              main event for a guest, who has no other way in from here. */}
          {canType ? (
            <div className="flex justify-end -mb-1">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-bhalyam-wood dark:text-amber-400
                           hover:text-bhalyam-wood-dark dark:hover:text-amber-300 active:scale-95 transition cursor-pointer"
              >
                <ScanIcon className="w-4 h-4 text-[#EA5A1F]" />
                Scan QR Code
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2.5
                         min-h-[56px] rounded-2xl cursor-pointer
                         bhalyam-gold-leaf text-bhalyam-wood-dark font-bold text-[15px]
                         border border-bhalyam-gold-dark
                         active:scale-[0.98] bhalyam-press-feedback
                         focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/70
                         focus:ring-offset-2 focus:ring-offset-bhalyam-cream-soft
                         transition-all duration-200
                         shadow-[0_6px_14px_-4px_rgba(228,177,40,0.6)]"
            >
              <ScanIcon className="w-5 h-5" />
              Scan your friend&apos;s QR
            </button>
          )}

          {/* What a guest has scanned, shown read-only. They could not have
              typed it, so an editable box would invite them to change it into
              a code they were never given. */}
          {!canType && code ? (
            <div
              className="rounded-xl border-2 border-bhalyam-cream-edge/80 dark:border-slate-700/80
                         bg-bhalyam-cream-soft dark:bg-[#0B0F19] px-3 py-2.5 text-center"
            >
              <div className="text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood dark:text-slate-400">
                Scanned code
              </div>
              <div className="font-mono font-black text-xl tracking-[0.4em] text-bhalyam-wood-dark dark:text-slate-100">
                {code}
              </div>
            </div>
          ) : null}

          {!canType && codeError ? (
            <p
              role="alert"
              aria-live="polite"
              className="text-[12px] font-semibold text-bhalyam-ludo-red leading-tight text-center"
            >
              {codeError}
            </p>
          ) : null}

          {/* Room code */}
          {canType && (
          <Field
            htmlFor="join-code"
            label="Room code"
            error={codeError}
            helpId="join-code-help"
            help={`${ROOM_CODE_LENGTH} characters — paste your friend's link here too. It joins on the last character.`}
          >
            <div className="relative">
              <input
                ref={codeInputRef}
                id="join-code"
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="ABC123"
                maxLength={ROOM_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                aria-invalid={codeError ? true : undefined}
                aria-describedby={
                  codeError ? "join-code-error" : "join-code-help"
                }
                className={`w-full min-h-[52px] px-3 rounded-xl
                           bg-bhalyam-cream-soft dark:bg-[#0B0F19] border-2
                           text-bhalyam-wood-dark dark:text-slate-100 placeholder:text-bhalyam-wood-dark/30 dark:placeholder:text-slate-600
                           font-mono font-black text-2xl tracking-[0.45em] text-center
                           focus:outline-none focus:ring-2
                           transition-all duration-200
                           ${codeError
                             ? "border-bhalyam-ludo-red/70 focus:border-bhalyam-ludo-red focus:ring-bhalyam-ludo-red/30"
                             : "border-bhalyam-cream-edge/80 dark:border-slate-700/80 focus:border-bhalyam-gold-dark dark:focus:border-amber-400 focus:ring-bhalyam-gold/40"}`}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Scan QR Code"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-xl
                           bg-bhalyam-cream-warm dark:bg-[#1E2738] hover:bg-bhalyam-cream-edge dark:hover:bg-[#2A374F] active:scale-95
                           inline-flex items-center justify-center text-bhalyam-wood-dark dark:text-slate-200 transition cursor-pointer"
              >
                <ScanIcon className="w-5 h-5 text-[#EA5A1F]" />
              </button>
            </div>
          </Field>
          )}

          {/* Submit. A guest sees it only once a scan has produced a code —
              before that there is nothing to submit and a live button would
              just be a way to generate an error. */}
          {(canType || code) && (
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
          )}

          {!canType && (
            <SignInWall compact from="join" reason="Room codes are for playing with friends" />
          )}

          {/* Form-level error fallback */}
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

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(scannedCode: string) => {
          // The QR payload is the room URL, so it goes through the same
          // normalizer as anything pasted — one definition of "what counts as
          // a code" for every way one can arrive.
          const scanned = normalizeRoomCode(scannedCode);
          setCode(scanned);
          setCodeError(null);
          const n = trimmedName();
          // A scan with no name yet used to leave the modal looking untouched.
          // Now the code is held above and the missing half is named, which
          // matters most for a guest: the scanner is their only way in, so
          // silence here reads as the camera having failed.
          if (!n) {
            setNameError("Enter your name first");
            window.setTimeout(() => nameInputRef.current?.focus(), 0);
            return;
          }
          if (!isCompleteRoomCode(scanned)) {
            setCodeError("That QR code isn't a BHALYAM room.");
            return;
          }
          joinWithCode(scanned, n);
        }}
      />
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

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}
