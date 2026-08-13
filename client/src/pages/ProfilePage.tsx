import { useState } from "react";
import { Link } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { validateName, type FieldError } from "../lib/authValidation";
import { GlobalSettings } from "../components/GlobalSettings";
import AvatarPicker from "../components/profile/AvatarPicker";
import { ArrowLeftIcon, LockIcon, MailIcon, UserIcon } from "../components/auth/authIcons";

/**
 * Edit profile.
 *
 * The honest scope of this page today: your display name is real and takes
 * effect immediately, everything account-shaped is not built yet, and the
 * preferences below already work. Rather than mock the missing half, the page
 * separates what it can change from what it cannot and says which is which.
 *
 * The display name is worth its own page even before accounts exist. The
 * profile sheet lists "one name, every room" under what's coming, but
 * `mpg.playerName` has always done exactly that — there was simply nowhere to
 * change it except the join form. This is that somewhere.
 */
export default function ProfilePage() {
  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();
  const [name, setName] = useState(playerName);
  const [error, setError] = useState<FieldError>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== playerName.trim();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const next = validateName(name);
    setError(next);
    if (next) {
      document.getElementById("profile-name")?.focus();
      return;
    }
    setPlayerName(name.trim());
    setSaved(true);
  }

  return (
    <div className="auth-shell bhalyam-home bhalyam-font bhalyam-paper min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-6 pt-4 sm:pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-full
                     text-[14px] font-bold text-[var(--auth-ink-soft)]
                     hover:text-[var(--auth-ink)] hover:bg-[var(--auth-rule)]/45
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                     transition-colors duration-200"
        >
          <ArrowLeftIcon className="w-[18px] h-[18px]" />
          Back to games
        </Link>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 pb-12">
        <div className="mx-auto w-full max-w-[560px] space-y-5">
          <div className="pt-2">
            <h1
              className="bhalyam-display text-[var(--auth-ink)] leading-tight"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.25rem)" }}
            >
              Your profile
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--auth-ink-soft)] max-w-[52ch]">
              Everything here lives on this device. It travels to a table with you, not to a
              server.
            </p>
          </div>

          {/* ── Display name: real, and takes effect immediately ── */}
          <form
            onSubmit={handleSave}
            noValidate
            className="rounded-[20px] border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <UserIcon className="w-5 h-5 text-[var(--auth-accent)]" />
              <h2 className="bhalyam-display text-[var(--auth-ink)] text-[20px] leading-tight">
                Display name
              </h2>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-name"
                className="block text-[11px] uppercase tracking-widest font-bold text-[var(--auth-ink-soft)]"
              >
                What the table calls you
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                maxLength={20}
                autoComplete="nickname"
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                  if (saved) setSaved(false);
                }}
                placeholder="e.g. Sri Krishna"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "profile-name-error" : "profile-name-help"}
                className={`w-full min-h-[48px] px-3.5 rounded-xl bg-[var(--auth-field)] border-2
                            font-semibold text-[15px] text-[var(--auth-ink)]
                            placeholder:font-medium placeholder:text-[var(--auth-ink-mute)]
                            focus:outline-none focus:ring-2 transition-[border-color,box-shadow] duration-200
                            ${
                              error
                                ? "border-[#C6342B]/70 focus:border-[#C6342B] focus:ring-[#C6342B]/25"
                                : "border-[var(--auth-field-edge)] focus:border-bhalyam-gold-dark focus:ring-bhalyam-gold/40"
                            }`}
              />
              {error ? (
                <p
                  id="profile-name-error"
                  role="alert"
                  className="text-[12.5px] font-semibold leading-snug text-[var(--auth-field-error)]"
                >
                  {error}
                </p>
              ) : (
                <p id="profile-name-help" className="text-[12.5px] leading-snug text-[var(--auth-ink-mute)]">
                  Used the next time you join or open a room. Rooms you are already in keep the
                  name you joined them with.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!dirty}
                className={`min-h-[48px] px-6 rounded-full font-extrabold text-[15px] border
                            transition-[filter,box-shadow] duration-200
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                            focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-card)]
                            ${
                              dirty
                                ? "bhalyam-gold-leaf bhalyam-cta-shine border-bhalyam-gold-dark text-bhalyam-wood-dark cursor-pointer hover:brightness-[1.04] shadow-[0_8px_18px_-6px_rgba(228,177,40,0.6)]"
                                : "bg-[var(--auth-rule)] border-[var(--auth-field-edge)] text-[var(--auth-ink-soft)] cursor-not-allowed"
                            }`}
              >
                Save name
              </button>
              {saved && !dirty ? (
                <p role="status" className="text-[13px] font-bold text-[#2E7D32] dark:text-[#B7DDAF]">
                  Saved.
                </p>
              ) : null}
            </div>
          </form>

          {/* ── Avatar ── */}
          <section className="rounded-[20px] border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <UserIcon className="w-5 h-5 text-[var(--auth-accent)]" />
              <h2 className="bhalyam-display text-[var(--auth-ink)] text-[20px] leading-tight">
                Avatar
              </h2>
            </div>
            <AvatarPicker value={avatarId} onChange={setAvatarId} />
            {/* Said plainly, because a picker implies an audience: the server
                does not carry an avatar field yet, so this is yours to see
                until the table learns to send it. */}
            <p className="text-[12.5px] leading-relaxed text-[var(--auth-ink-mute)]">
              Saved on this device. Other players won&apos;t see it at the table until the
              server carries avatars — that lands with accounts.
            </p>
          </section>

          {/* ── Account: not built, and said so rather than mocked ── */}
          <section className="rounded-[20px] border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <LockIcon className="w-5 h-5 text-[var(--auth-accent)]" />
              <h2 className="bhalyam-display text-[var(--auth-ink)] text-[20px] leading-tight">
                Account
              </h2>
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">
              Email, password and signing in on another device arrive with accounts. There is no
              account store behind BHALYAM yet, so there is nothing here to change — and an empty
              email box that silently discarded what you typed would be worse than none.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full
                           bg-[var(--auth-field)] border border-[var(--auth-field-edge)]
                           text-[var(--auth-ink)] font-bold text-[14px]
                           hover:bg-[var(--auth-rule)] active:scale-[0.99]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                           transition-[background-color,transform] duration-200"
              >
                <MailIcon className="w-[18px] h-[18px]" />
                See the sign-in screens
              </Link>
            </div>
          </section>

          {/* ── Preferences + your data, from the one panel that owns them ── */}
          <section className="space-y-2">
            <h2 className="bhalyam-display text-[var(--auth-ink)] text-[20px] leading-tight px-1">
              Preferences
            </h2>
            {/* Embedded rather than reimplemented: sound, vibration, audio
                theme, language and the DPDP data controls already live here,
                and a second copy would be a second thing to keep in step. */}
            <GlobalSettings />
          </section>
        </div>
      </main>
    </div>
  );
}
