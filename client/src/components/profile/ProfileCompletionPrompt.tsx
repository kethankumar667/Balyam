import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Cake, UserRound } from "lucide-react";
import Modal from "../Modal";
import AvatarPicker from "./AvatarPicker";
import BirthdayPicker from "../BirthdayPicker";
import { toIsoDate } from "../../lib/isoDate";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";
import { fetchProfile, saveProfile } from "../../lib/supabase/profile";
import { apiFetch, usePlayerId } from "../../lib/playerIdentity";
import { loadAccountDetails, saveAccountDetails } from "../../lib/accountGenerator";
import { needsAvatar, needsBirthday } from "../../lib/googleProfile";
import { validateDob } from "../../lib/authValidation";

type Step = "avatar" | "birthday";

const MODAL_Z = 60;
const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const SAVE_FAILED = "We couldn't save that. Please try again.";

/**
 * Members who chose "Not now" in this visit. Held in memory on purpose: the
 * layout that mounts this re-mounts on navigation, so it has to outlive the
 * component — but a stored flag would be a new browser-storage key that the
 * privacy inventory must declare, and "ask again next visit" is the behaviour
 * we want anyway.
 */
const dismissedFor = new Set<string>();

/** Test hook: forget every "Not now" so each test starts from a fresh visit. */
export function resetProfilePromptDismissals(): void {
  dismissedFor.clear();
}

/** Today in the person's own calendar — `toISOString()` is UTC and is a day behind in India after midnight. */
function todayIso(): string {
  return toIsoDate(new Date());
}

const FIELD_CLASS =
  "mt-1 min-h-[48px] w-full rounded-xl border border-[#EEDBCA] bg-white px-3 text-base text-[#2B3550] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const PRIMARY_CLASS =
  "min-h-[52px] w-full cursor-pointer rounded-2xl bg-amber-500 px-6 text-base font-black text-amber-950 shadow-lg shadow-amber-900/25 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Finishes the profile of a signed-in member, one short step at a time, and
 * only the steps they still need: birthday and gender, then an avatar.
 *
 * ── Why these, and where the avatar comes from ────────────────────────
 * Email sign-up already has an avatar step and a birthday field. Google
 * sign-in has neither, so a Google member arrives with both empty. The avatar
 * is chosen from the app's own closed list (`AvatarPicker`, validated by
 * `isKnownAvatar`) — never from the Google account's photo. Avatar ids are
 * broadcast to every player and rendered as an image URL, so an off-site photo
 * would hand a third party every player's IP address.
 *
 * The birthday is collected for one purpose — so the Bhalyam group can send
 * birthday wishes — and the dialog says so. Gender is optional. The internal
 * Bhalyam ID is never asked for; it is generated for the member.
 *
 * ── Behaviour ─────────────────────────────────────────────────────────
 * It reads the saved profile (not what the device remembers) and says nothing
 * if that read fails: asking someone who already answered is worse than not
 * asking. Every step is skippable — closing, Escape and "Not now" leave the
 * profile untouched and never block play.
 *
 * An avatar is saved the way the profile page saves one: to the member's
 * profile, to this device (so rooms use it), and to the server's copy that
 * leaderboards read. That last write is best-effort — the member's own profile
 * is the source of truth, so a server hiccup must not undo their choice.
 */
export default function ProfileCompletionPrompt() {
  const isMember = useAuthStore((s) => s.isMember);
  const userId = useAuthStore((s) => s.userId);
  const { playerId } = usePlayerId();
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const dobId = useId();
  const genderId = useId();
  const dobRef = useRef<HTMLButtonElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMember || !userId || dismissedFor.has(userId)) return;
    let cancelled = false;
    void fetchProfile(userId).then((profile) => {
      if (cancelled || !profile) return;
      // Birthday and gender first, then the avatar.
      const needed: Step[] = [];
      if (needsBirthday(profile)) needed.push("birthday");
      if (needsAvatar(profile)) needed.push("avatar");
      if (needed.length > 0) setSteps(needed);
    });
    return () => {
      cancelled = true;
    };
  }, [isMember, userId]);

  const step = steps[index];
  if (!step || !userId) return null;

  const isLast = index === steps.length - 1;

  const close = () => {
    dismissedFor.add(userId);
    setSteps([]);
  };

  const advance = () => {
    setError(null);
    if (isLast) close();
    else setIndex((i) => i + 1);
  };

  const saveAvatar = async () => {
    if (!avatar) return;
    setSaving(true);
    const saved = await saveProfile(userId, { avatarId: avatar });
    if (!saved) {
      setSaving(false);
      setError(SAVE_FAILED);
      return;
    }
    useRoomStore.getState().setAvatarId(avatar);
    if (playerId) {
      try {
        await apiFetch(`/api/profile/${playerId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar }),
        });
      } catch {
        // The profile above is the source of truth; leaderboards catch up on the next edit.
      }
    }
    setSaving(false);
    advance();
  };

  const saveBirthday = async () => {
    const problem = validateDob(dob) ?? (dob > todayIso() ? "A birthday can't be in the future." : null);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const saved = await saveProfile(userId, gender ? { dob, gender } : { dob });
    setSaving(false);
    if (!saved) {
      setError(SAVE_FAILED);
      return;
    }
    const local = loadAccountDetails();
    if (local) saveAccountDetails({ ...local, dob, gender: gender || local.gender });
    advance();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    void (step === "avatar" ? saveAvatar() : saveBirthday());
  };

  const progress = steps.length > 1 ? `Step ${index + 1} of ${steps.length}` : null;

  return (
    <Modal
      open
      onClose={close}
      ariaLabelledBy={titleId}
      initialFocusRef={step === "birthday" ? dobRef : continueRef}
      mobileSheet
      zIndex={MODAL_Z}
      panelClassName="w-full max-w-md"
    >
      <form
        onSubmit={submit}
        className="max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-[#EEDBCA] bg-[#FFF9EE] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl dark:border-slate-700 dark:bg-[#182234] md:rounded-3xl md:px-6"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/25 text-amber-700 ring-2 ring-amber-500/40 dark:text-amber-300">
            {step === "avatar" ? <UserRound className="h-7 w-7" aria-hidden="true" /> : <Cake className="h-7 w-7" aria-hidden="true" />}
          </span>
          {progress && <p className="mt-3 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">{progress}</p>}
          <h2 id={titleId} className="mt-2 text-xl font-black leading-tight text-[#2B3550] dark:text-slate-100">
            {step === "avatar" ? "Choose your avatar" : "When's your birthday?"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-slate-300">
            {step === "avatar"
              ? "Pick the face your friends will see at the table."
              : "So the Bhalyam group can send you birthday wishes. We use it for nothing else."}
          </p>
        </div>

        {step === "avatar" ? (
          <div className="mt-4">
            <AvatarPicker value={avatar} onChange={setAvatar} hideSummary />
          </div>
        ) : (
          <>
            <div className="mt-5">
              <label htmlFor={dobId} className="text-sm font-bold text-[#2B3550] dark:text-slate-100">
                Date of birth
              </label>
              <BirthdayPicker ref={dobRef} id={dobId} value={dob} onChange={setDob} invalid={Boolean(error)} />
            </div>
            <div className="mt-4">
              <label htmlFor={genderId} className="text-sm font-bold text-[#2B3550] dark:text-slate-100">
                Gender <span className="font-normal text-stone-500 dark:text-slate-400">(optional)</span>
              </label>
              <select id={genderId} value={gender} onChange={(e) => setGender(e.target.value)} className={FIELD_CLASS}>
                <option value="">Prefer not to say</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={continueRef}
            type="submit"
            disabled={saving || (step === "avatar" && !avatar)}
            className={PRIMARY_CLASS}
          >
            {saving ? "Saving…" : isLast ? "Save" : "Continue"}
          </button>
          <button
            type="button"
            onClick={close}
            className="min-h-[48px] w-full cursor-pointer rounded-2xl px-6 text-sm font-bold text-stone-600 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Not now
          </button>
        </div>
      </form>
    </Modal>
  );
}
