import { useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Coins, Info, Loader2, Trash2, Trophy, UserRound, X, type LucideIcon } from "lucide-react";
import Modal from "../Modal";
import { Button } from "../../design-system/dls/Buttons";
import { executeAccountDeletion } from "../../lib/accountDeletion";
import { usePlayerId } from "../../lib/playerIdentity";

export interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CONFIRM_WORD = "DELETE";

interface Loss {
  Icon: LucideIcon;
  title: string;
  detail: string;
}

const LOSSES: readonly Loss[] = [
  { Icon: UserRound, title: "Your profile", detail: "Name, email, birthday and avatar." },
  { Icon: Trophy, title: "Your progress", detail: "Level, XP, achievements and match history." },
  { Icon: Coins, title: "Your coins", detail: "The balance can't be recovered, even if you sign up again." },
];

/**
 * The last question before an account goes.
 *
 * ── Why it looks the way it does ──────────────────────────────────────
 * It uses the same warm card tokens as the sign-in screens, which carry both a
 * light and a dark value, so it is readable in either theme. (It used Tailwind 4
 * class names — `bg-linear-to-b`, `shadow-xs` — in a Tailwind 3 project, which
 * compile to nothing: the panel had no background at all and floated, see-through,
 * over the dark backdrop with dark text on it.)
 *
 * The tone is calm and plain. A destructive confirmation that shouts in capitals
 * is harder to read, not safer; the friction that protects someone here is typing
 * the word, not being startled by the heading.
 *
 * ── Behaviour worth keeping ───────────────────────────────────────────
 * The field takes focus on open and keeps it while typing (the shared focus trap
 * used to throw it out after every character), Enter confirms once the word is
 * typed, and nothing can be dismissed or sent twice while the deletion runs.
 * Typed text is dropped on close, so a reopened dialog never starts already armed.
 *
 * Honesty about what remains: coin records are kept, unlinked from the person,
 * because the coin ledger is permanent by design. Saying "erased forever" about
 * the balance would be untrue.
 */
export default function DeleteAccountModal({ open, onClose, onSuccess }: DeleteAccountModalProps) {
  const navigate = useNavigate();
  const { playerId: effectivePlayerId } = usePlayerId();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const introId = useId();
  const inputId = useId();

  const isConfirmed = confirmationInput.trim().toUpperCase() === CONFIRM_WORD;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput("");
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await executeAccountDeletion(effectivePlayerId);
      if (!res.ok) {
        setErrorMessage(res.error ?? "We couldn't delete your account just now. Please try again.");
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      handleClose();
      onSuccess?.();
      navigate("/", { replace: true });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong while deleting your account. Please try again.",
      );
      setIsDeleting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void handleDelete();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      mobileSheet
      ariaLabelledBy={titleId}
      ariaDescribedBy={introId}
      initialFocusRef={inputRef}
      className="auth-shell"
      panelClassName="w-full sm:max-w-[460px] overflow-y-auto overscroll-contain max-h-[92dvh]
                      rounded-t-3xl sm:rounded-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)]
                      shadow-[0_-8px_40px_-12px_rgba(74,44,18,0.5)]"
    >
      <form onSubmit={submit} className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--auth-bad-edge)]
                       bg-[var(--auth-bad-bg)] text-[var(--auth-bad-ink)]"
          >
            <Trash2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-[21px] font-extrabold leading-tight text-[var(--auth-ink)]">
              Delete your account?
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[var(--auth-bad-ink)]">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
              This can't be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[var(--auth-ink-soft)]
                       transition-colors hover:bg-[var(--auth-rule)] hover:text-[var(--auth-ink)] disabled:opacity-40
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <p id={introId} className="mt-5 text-[15px] leading-relaxed text-[var(--auth-ink-soft)]">
          Deleting your account permanently removes:
        </p>

        <ul className="mt-3 divide-y divide-[var(--auth-rule)] overflow-hidden rounded-2xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)]">
          {LOSSES.map(({ Icon, title, detail }) => (
            <li key={title} className="flex items-start gap-3 px-4 py-3">
              <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--auth-bad-ink)]" />
              <span className="min-w-0">
                <span className="block text-[15px] font-bold leading-snug text-[var(--auth-ink)]">{title}</span>
                <span className="block text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">{detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--auth-ink-mute)]">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Anonymous coin records are kept for the game's audit trail. They are no longer linked to you.</span>
        </p>

        <div className="mt-5">
          <label htmlFor={inputId} className="block text-sm font-bold text-[var(--auth-ink)]">
            Type{" "}
            <span className="rounded-md border border-[var(--auth-bad-edge)] bg-[var(--auth-bad-bg)] px-1.5 py-0.5 font-mono font-extrabold text-[var(--auth-bad-ink)]">
              {CONFIRM_WORD}
            </span>{" "}
            to confirm
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={isDeleting}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            className="mt-2 min-h-[50px] w-full rounded-xl border-2 border-[var(--auth-field-edge)] bg-[var(--auth-field)] px-3.5
                       font-mono text-base font-bold tracking-wider text-[var(--auth-ink)] placeholder:text-[var(--auth-ink-mute)]/60
                       transition-colors focus:outline-none focus:border-[var(--auth-field-error)] focus-visible:ring-2
                       focus-visible:ring-[var(--auth-field-error)]/40 disabled:opacity-60"
          />
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[var(--auth-bad-edge)] bg-[var(--auth-bad-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--auth-bad-ink)]"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          <Button type="button" variant="secondary" size="lg" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="lg"
            disabled={!isConfirmed || isDeleting}
            leftIcon={isDeleting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
          >
            {isDeleting ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
