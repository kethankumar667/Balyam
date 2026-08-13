import { useState } from "react";
import AuthShell from "../../components/auth/AuthShell";
import {
  AuthField,
  AuthSwitch,
  FormNotice,
  GoogleButton,
  GuestButton,
  OrDivider,
  PasswordInput,
  PasswordStrengthMeter,
  SubmitButton,
  inputClass,
  useFieldIds,
} from "../../components/auth/AuthControls";
import { usePreviewSubmit } from "../../components/auth/usePreviewSubmit";
import {
  validateEmail,
  validateName,
  validatePassword,
  type FieldError,
} from "../../lib/authValidation";
import { useRoomStore } from "../../store/roomStore";

/**
 * Create an account.
 *
 * Three fields, and no "confirm password" — the reveal toggle solves the typo
 * this field was invented for, and a second box mostly teaches people to paste
 * the same mistake twice. The reset flow exists for the case it was insuring
 * against.
 *
 * The display name is seeded from whatever the player already typed to join a
 * room, because most people arrive here having already played as a guest.
 */
export default function SignUpPage() {
  const { playerName, setPlayerName } = useRoomStore();
  const ids = useFieldIds(["name", "email", "password"] as const);

  const [name, setName] = useState(playerName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState<FieldError>(null);
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, done, submit, reset } = usePreviewSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextName = validateName(name);
    const nextEmail = validateEmail(email);
    const nextPassword = validatePassword(password);
    setNameError(nextName);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextName || nextEmail || nextPassword) {
      const firstBad = nextName ? ids.name : nextEmail ? ids.email : ids.password;
      document.getElementById(firstBad)?.focus();
      return;
    }
    // Worth keeping even with no backend: the name is the one field that
    // already has a home, and carrying it over means the next room they join
    // is under the name they just chose.
    setPlayerName(name.trim());
    submit();
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="You only need one to host. Joining a friend's room stays free of all this."
      footer={<AuthSwitch prompt="Already have an account?" to="/login" cta="Sign in" />}
    >
      <div className="space-y-4">
        <GoogleButton onClick={submit} label="Sign up with Google" />
        <OrDivider label="or with email" />

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <AuthField
            id={ids.name}
            label="Display name"
            error={nameError}
            help="What your friends see at the table."
          >
            {(aria) => (
              <input
                id={ids.name}
                type="text"
                autoComplete="nickname"
                maxLength={20}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                  if (done) reset();
                }}
                placeholder="e.g. Sri Krishna"
                className={inputClass(!!nameError)}
                {...aria}
              />
            )}
          </AuthField>

          <AuthField id={ids.email} label="Email" error={emailError}>
            {(aria) => (
              <input
                id={ids.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  if (done) reset();
                }}
                placeholder="you@example.com"
                className={inputClass(!!emailError)}
                {...aria}
              />
            )}
          </AuthField>

          <AuthField id={ids.password} label="Password" error={passwordError}>
            {(aria) => (
              <>
                <PasswordInput
                  id={ids.password}
                  value={password}
                  onChange={(next) => {
                    setPassword(next);
                    if (passwordError) setPasswordError(null);
                    if (done) reset();
                  }}
                  hasError={!!passwordError}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  aria={aria}
                />
                <PasswordStrengthMeter password={password} />
              </>
            )}
          </AuthField>

          {done ? (
            <FormNotice tone="info" title="Accounts aren't switched on yet">
              Everything you typed is valid — there is just no account store behind this
              form yet. Hosting works without one for now.
            </FormNotice>
          ) : null}

          <SubmitButton loading={loading} loadingLabel="Creating account…">
            Create account
          </SubmitButton>

          <p className="text-[12px] leading-relaxed text-[var(--auth-ink-mute)] text-center">
            By creating an account you agree to play nice with your gang.
          </p>
        </form>

        <OrDivider />
        <GuestButton label="Skip — just join a room" />
      </div>
    </AuthShell>
  );
}
