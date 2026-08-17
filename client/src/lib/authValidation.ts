/**
 * Client-side validation for the auth screens.
 *
 * Pure and framework-free so the rules can be tested without a DOM, and so
 * the server can adopt the same ones when accounts land — a password this
 * accepts and the server rejects is a dead end the player cannot debug.
 *
 * These checks are a courtesy, not a control. They exist to catch a typo
 * before a round trip; the server will re-check everything. Nothing here is
 * security.
 */

export type FieldError = string | null;

/**
 * Email shape, deliberately loose.
 *
 * Strict RFC-5322 validation rejects addresses that genuinely work and is the
 * classic way to lock a real user out of their own account. Require the parts
 * a typo actually breaks — something, an @, a dotted domain — and let the
 * verification email be the real test of whether the address exists.
 */
export function validateEmail(raw: string): FieldError {
  const email = raw.trim();
  if (!email) return "Enter your email address.";
  if (/\s/.test(email)) return "Email addresses can't contain spaces.";
  if (!/^[^@]+@[^@]+\.[^@]{2,}$/.test(email)) {
    return "That doesn't look like an email address yet.";
  }
  return null;
}

/** Display name shown to the table. Matches the server's 20-char seat cap. */
export function validateName(raw: string): FieldError {
  const name = raw.trim();
  if (!name) return "Enter the name your friends will see.";
  if (name.length < 2) return "That's a little short — use at least 2 characters.";
  if (name.length > 20) return "Keep it under 20 characters so it fits at the table.";
  return null;
}

export function validateFirstName(raw: string): FieldError {
  const name = raw.trim();
  if (!name) return "Enter your first name.";
  if (name.length < 2) return "First name must be at least 2 characters.";
  if (name.length > 30) return "First name is too long.";
  return null;
}

export function validateLastName(raw: string): FieldError {
  const name = raw.trim();
  if (!name) return "Enter your last name.";
  if (name.length < 1) return "Enter your last name.";
  if (name.length > 30) return "Last name is too long.";
  return null;
}

export function validateDob(raw: string): FieldError {
  if (!raw) return "Select your date of birth.";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return "Enter a valid date of birth.";
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year < 1920 || year > currentYear) return "Enter a valid year of birth.";
  return null;
}

export function validateGender(raw: string): FieldError {
  if (!raw) return "Please select your gender.";
  return null;
}

/** Minimum length, stated up front rather than after a failed submit. */
export const PASSWORD_MIN = 8;

export function validatePassword(raw: string): FieldError {
  if (!raw) return "Choose a password.";
  if (raw.length < PASSWORD_MIN) {
    return `Use at least ${PASSWORD_MIN} characters.`;
  }
  if (/^\s|\s$/.test(raw)) return "Remove the space at the start or end.";
  return null;
}

/** The sign-in form must not lecture about length — it just needs a value. */
export function validatePasswordPresent(raw: string): FieldError {
  return raw ? null : "Enter your password.";
}

export function validatePasswordConfirm(password: string, confirm: string): FieldError {
  if (!confirm) return "Re-type your password.";
  if (password !== confirm) return "These two don't match yet.";
  return null;
}

export type StrengthLabel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
  /** 0–4, for the segmented meter. */
  score: number;
  label: StrengthLabel;
  /** The single most useful next improvement, or null when strong. */
  hint: string | null;
}

/**
 * Strength as advice, never as a gate.
 *
 * Scored on the things that actually cost an attacker work — length first,
 * then variety — rather than on a checklist of symbol classes, which mostly
 * teaches people to end every password with "!1". `validatePassword` owns
 * what is allowed; this only tells you how you are doing.
 */
export function scorePassword(raw: string): PasswordStrength {
  if (!raw) return { score: 0, label: "weak", hint: null };

  let score = 0;
  if (raw.length >= PASSWORD_MIN) score++;
  if (raw.length >= 12) score++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(raw)).length;
  if (classes >= 2) score++;
  if (classes >= 3 && raw.length >= 10) score++;

  // A single repeated character or a straight run is long but not strong.
  if (/^(.)\1+$/.test(raw) || /^(0123456789|abcdefghij|qwertyuiop)/i.test(raw)) {
    score = Math.min(score, 1);
  }

  const label: StrengthLabel =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";

  let hint: string | null = null;
  if (raw.length < 12) hint = "Longer beats complicated — try a few words together.";
  else if (classes < 2) hint = "Mix in a capital or a number.";

  return { score: Math.min(score, 4), label, hint };
}
