import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { validateName, type FieldError } from "../lib/authValidation";
import { GlobalSettings } from "../components/GlobalSettings";
import LanguageSettings from "../components/LanguageSettings/LanguageSettings";
import AvatarPicker from "../components/profile/AvatarPicker";
import ProfileNav, { type ProfileSection } from "../components/profile/ProfileNav";
import YourDataPanel from "../components/privacy/YourDataPanel";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FaceIcon,
  GlobeIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
  SlidersIcon,
  UserIcon,
} from "../components/auth/authIcons";

/**
 * Your profile.
 *
 * Laid out as a console rather than a single scrolling column: a section rail
 * down the left, cards in a two-column grid on the right, the way a settings
 * page is normally read on a laptop. The previous version capped itself at
 * 560px on every screen, which is right for a phone and leaves two-thirds of a
 * desktop window empty while pushing Language below three scrolls of sliders.
 *
 * What has NOT changed is the honesty of the content. The rail lists six
 * sections because six sections exist; it does not gain "Devices" or
 * "Notifications" to fill the column, and the account card still says the
 * account store is not built instead of showing an email field that would
 * discard what you typed.
 *
 * Everything on this page is device-local, which the header and the closing
 * strip both say, because that is the single most important thing about it
 * under the DPDP work: there is no server copy to ask anyone to delete.
 */

const CARD =
  "rounded-2xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] " +
  "shadow-[0_1px_2px_rgba(74,44,22,0.04),0_8px_24px_-16px_rgba(74,44,22,0.28)]";

/** Section heading: a tinted icon chip and a title, repeated on every card. */
function CardHead({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0
                   bg-[var(--auth-note-bg)] text-[var(--auth-accent)]"
        aria-hidden
      >
        {icon}
      </span>
      <h2 className="bhalyam-display text-[var(--auth-ink)] text-[19px] leading-tight flex-1 min-w-0">
        {title}
      </h2>
      {action}
    </div>
  );
}

export default function ProfilePage() {
  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();
  const isMember = useAuthStore((s) => s.isMember);
  const email = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);
  const [name, setName] = useState(playerName);
  const [error, setError] = useState<FieldError>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== playerName.trim();

  // Stable identity so the rail's observer is not torn down every render.
  const sections = useMemo<ProfileSection[]>(
    () => [
      { id: "sec-profile", label: "My Profile", icon: <UserIcon className="w-[18px] h-[18px]" /> },
      { id: "sec-avatar", label: "Avatar", icon: <FaceIcon className="w-[18px] h-[18px]" /> },
      { id: "sec-preferences", label: "Preferences", icon: <SlidersIcon className="w-[18px] h-[18px]" /> },
      { id: "sec-language", label: "Language", icon: <GlobeIcon className="w-[18px] h-[18px]" /> },
      { id: "sec-account", label: "Account & Security", icon: <LockIcon className="w-[18px] h-[18px]" /> },
      { id: "sec-data", label: "Data & Privacy", icon: <ShieldIcon className="w-[18px] h-[18px]" /> },
    ],
    [],
  );

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
    <div className="auth-shell bhalyam-home bhalyam-font bhalyam-paper min-h-screen">
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 py-4 sm:py-6">
        <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
          {/* ── Rail ─────────────────────────────────────────────── */}
          <aside className="lg:pt-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 mb-3 rounded-full
                         text-[14px] font-bold text-[var(--auth-ink-soft)]
                         hover:text-[var(--auth-ink)] hover:bg-[var(--auth-rule)]/45
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                         transition-colors duration-200"
            >
              <ArrowLeftIcon className="w-[18px] h-[18px]" />
              Back to games
            </Link>

            <ProfileNav sections={sections} />

            {/* The comp's illustration slot. Drawn inline rather than sourced
                from /public, so it cannot ship as a broken-image box and
                inherits the ink colour in both themes. */}
            <div className="hidden lg:block mt-8 pt-6 border-t border-[var(--auth-rule)]">
              <PaperPlane className="w-16 h-16 text-[var(--auth-accent)]/70" />
              <p className="mt-3 text-[13px] font-bold leading-snug text-[var(--auth-ink-soft)]">
                Play together.
                <br />
                Remember forever.
              </p>
            </div>
          </aside>

          {/* ── Content ──────────────────────────────────────────── */}
          <main className="min-w-0 pt-4 lg:pt-0 pb-12">
            <header className="mb-5">
              <h1
                className="bhalyam-display text-[var(--auth-ink)] leading-tight"
                style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
              >
                My Profile
              </h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--auth-ink-soft)] max-w-[62ch]">
                Everything here lives on this device. It travels to a table with you, not to a
                server.
              </p>
            </header>

            <div className="space-y-5">
              {/* Row 1 — name and avatar, the two things that are yours. */}
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <section id="sec-profile" className={`${CARD} p-5 scroll-mt-6`}>
                  <CardHead icon={<UserIcon className="w-[18px] h-[18px]" />} title="Profile" />

                  <form onSubmit={handleSave} noValidate className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="profile-name"
                        className="block text-[11px] uppercase tracking-widest font-bold text-[var(--auth-ink-soft)]"
                      >
                        Display name
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
                        <p
                          id="profile-name-help"
                          className="text-[12.5px] leading-snug text-[var(--auth-ink-mute)]"
                        >
                          This is the name others see at the table. Rooms you are already in keep
                          the name you joined them with.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={!dirty}
                        className={`min-h-[46px] px-6 rounded-full font-extrabold text-[15px] border
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
                    </div>

                    {saved && !dirty ? (
                      <p
                        role="status"
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold
                                   bg-[var(--auth-ok-bg)] border border-[var(--auth-ok-edge)]
                                   text-[var(--auth-ok-ink)]"
                      >
                        <CheckCircleIcon className="w-[18px] h-[18px] flex-shrink-0" />
                        Name saved successfully.
                      </p>
                    ) : null}
                  </form>
                </section>

                <section id="sec-avatar" className={`${CARD} p-5 scroll-mt-6`}>
                  <CardHead
                    icon={<FaceIcon className="w-[18px] h-[18px]" />}
                    title="Avatar"
                    action={
                      avatarId ? (
                        <button
                          type="button"
                          onClick={() => setAvatarId(null)}
                          className="text-[13px] font-bold text-[#C6342B] dark:text-[#F0B4AA]
                                     min-h-[44px] px-2 -mr-2 rounded-lg
                                     hover:underline focus:outline-none
                                     focus-visible:ring-2 focus-visible:ring-[#C6342B]/60"
                        >
                          Remove
                        </button>
                      ) : undefined
                    }
                  />
                  <AvatarPicker value={avatarId} onChange={setAvatarId} hideSummary />
                  <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--auth-ink-mute)]">
                    Shown next to your name at every table you join, and saved on this device.
                  </p>
                </section>
              </div>

              {/* Row 2 — preferences, wide enough for two internal columns. */}
              <section id="sec-preferences" className={`${CARD} p-5 scroll-mt-6`}>
                <CardHead
                  icon={<SlidersIcon className="w-[18px] h-[18px]" />}
                  title="Preferences"
                />
                <GlobalSettings bare layout="split" includeLanguage={false} />
              </section>

              {/* Row 3 — the two "about you and your data" cards. Language and
                  Account stack in the left column beside a taller Your Data,
                  which is the shape the content wants: one long card, two
                  short ones. */}
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-5">
                  <section id="sec-account" className={`${CARD} p-5 scroll-mt-6`}>
                    <CardHead
                      icon={<LockIcon className="w-[18px] h-[18px]" />}
                      title="Account & Security"
                    />

                    {/* Two states, and the honesty of each is different. A
                        guest is told what an account buys. A member is told
                        what their account is NOT — because signing in here
                        checks no password and reaches no server, and the one
                        place someone will look for that fact is this card. */}
                    {isMember ? (
                      <>
                        <p className="text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">
                          Signed in{email ? " as " : ""}
                          {email ? (
                            <span className="font-bold text-[var(--auth-ink)]">{email}</span>
                          ) : null}
                          . This sign-in is recorded on this device only — there is no account
                          server yet, so no password was checked and nothing was sent anywhere.
                        </p>
                        <button
                          type="button"
                          onClick={signOut}
                          className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full
                                     bg-[var(--auth-field)] border border-[var(--auth-field-edge)]
                                     text-[var(--auth-ink)] font-bold text-[14px]
                                     hover:bg-[var(--auth-rule)] active:scale-[0.99]
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                                     transition-[background-color,transform] duration-200"
                        >
                          <LockIcon className="w-[18px] h-[18px]" />
                          Sign out
                        </button>
                        <p className="mt-2 text-[12.5px] leading-snug text-[var(--auth-ink-mute)]">
                          Your name and avatar stay on this device when you sign out.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">
                          You&apos;re playing as a guest. You can play every game against bots,
                          pass one phone around a group, and join any room a friend invites you
                          to. An account is what lets you open a room of your own and hand out
                          the code.
                        </p>
                        <Link
                          to="/signup?from=profile"
                          className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full
                                     bg-[var(--auth-field)] border border-[var(--auth-field-edge)]
                                     text-[var(--auth-ink)] font-bold text-[14px]
                                     hover:bg-[var(--auth-rule)] active:scale-[0.99]
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                                     transition-[background-color,transform] duration-200"
                        >
                          <MailIcon className="w-[18px] h-[18px]" />
                          Create a free account
                        </Link>
                      </>
                    )}
                  </section>

                  <section id="sec-language" className={`${CARD} p-5 scroll-mt-6`}>
                    <CardHead icon={<GlobeIcon className="w-[18px] h-[18px]" />} title="Language" />
                    <LanguageSettings embedded hideHeading />
                  </section>
                </div>

                <section id="sec-data" className={`${CARD} p-5 scroll-mt-6`}>
                  <CardHead icon={<ShieldIcon className="w-[18px] h-[18px]" />} title="Your Data" />
                  <YourDataPanel headingLevel="h3" hideHeading />
                </section>
              </div>

              {/* Closing reassurance. The comp puts a line here and it earns
                  its place: this page is the one screen where someone is
                  actively wondering where their information goes. */}
              <div
                className={`${CARD} px-5 py-4 flex items-center gap-3.5
                            bg-[var(--auth-note-bg)] border-[var(--auth-note-edge)]`}
              >
                <ShieldIcon className="w-6 h-6 flex-shrink-0 text-[var(--auth-accent)]" />
                <p className="text-[13px] leading-relaxed text-[var(--auth-note-ink)]">
                  This is your space. Your name, your sound, your way — and all of it stays on
                  this device.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Rail doodle. Inline so it has no asset to 404 and follows `currentColor`. */
function PaperPlane({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M57 8 6 27l19 8 8 19L57 8Z" />
      <path d="M25 35 57 8" />
      <path d="M25 35v13l8-7" />
      <path d="M8 48c3-1 5 1 4 4M15 56c2-.7 3.4.7 2.7 2.7" opacity="0.55" />
    </svg>
  );
}
