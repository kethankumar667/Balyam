import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import {
  AuthField,
  AuthSwitch,
  FormNotice,
  GoogleButton,
  GuestButton,
  OrDivider,
  PasswordInput,
  SubmitButton,
  inputClass,
  useFieldIds,
} from "../../components/auth/AuthControls";
import { usePreviewSubmit } from "../../components/auth/usePreviewSubmit";
import { validateEmail, validatePasswordPresent, type FieldError } from "../../lib/authValidation";

/**
 * Sign in.
 *
 * Google sits above the email form because it is one tap and no memory, and
 * most players on a phone will take it. The email form stays fully visible
 * underneath rather than hidden behind a "use email instead" link — a
 * collapsed alternative reads as discouraged, and people with a password
 * manager want the fields immediately.
 *
 * Errors surface on submit, not on every keystroke. Validating while someone
 * is still typing their address tells them it is wrong before they have
 * finished writing it.
 */
export default function LoginPage() {
  const ids = useFieldIds(["email", "password"] as const);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, done, submit, reset } = usePreviewSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextEmail = validateEmail(email);
    const nextPassword = validatePasswordPresent(password);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextEmail || nextPassword) {
      // Send focus to the first problem so a keyboard or screen-reader user
      // lands on it instead of hunting.
      document.getElementById(nextEmail ? ids.email : ids.password)?.focus();
      return;
    }
    submit();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to open a room and pick up where your table left off."
      footer={<AuthSwitch prompt="No account yet?" to="/signup" cta="Create one" />}
    >
      <div className="space-y-4">
        <GoogleButton onClick={submit} label="Continue with Google" />
        <OrDivider label="or with email" />

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

          <AuthField
            id={ids.password}
            label="Password"
            error={passwordError}
            action={
              <Link
                to="/forgot-password"
                className="text-[12px] font-bold text-[var(--auth-accent)] underline decoration-[#D9BE7A]
                           underline-offset-4 hover:text-[var(--auth-ink)] rounded-sm
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
              >
                Forgot?
              </Link>
            }
          >
            {(aria) => (
              <PasswordInput
                id={ids.password}
                value={password}
                onChange={(next) => {
                  setPassword(next);
                  if (passwordError) setPasswordError(null);
                  if (done) reset();
                }}
                hasError={!!passwordError}
                placeholder="Your password"
                autoComplete="current-password"
                aria={aria}
              />
            )}
          </AuthField>

          {done ? (
            <FormNotice tone="info" title="Nothing to sign in to yet">
              The screens are ready; the accounts backend isn&apos;t built. You can still
              join any room with a code.
            </FormNotice>
          ) : null}

          <SubmitButton loading={loading} loadingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <OrDivider />
        <GuestButton label="Continue as guest" />
      </div>
    </AuthShell>
  );
}
