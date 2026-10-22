/**
 * Is this "secret" a value the whole internet already knows?
 *
 * Length checks cannot answer that: `replace-with-a-freshly-generated-random-secret` is 46 characters and ships in
 * `.env.example`; `bhalyam_admin_secret_key_2026` is 29 and is committed in a pre-deployment script. Both sail
 * past a minimum-length rule. A key that is copied from an example file protects nothing, whoever copied it.
 *
 * Reports only a yes or no, never the value or any part of it.
 */

/** Values this repository has published, compared case-insensitively. Add one whenever a real-looking key is committed. */
const PUBLISHED_SECRETS: ReadonlySet<string> = new Set([
  "bhalyam_admin_secret_key_2026", // client/scripts/verify-admin-live-predeployment.mjs
  "local-dev-only-not-a-real-secret", // client/.env.example
]);

/** Wording that only ever appears in instructions ("replace-with…", "change-me", "your secret here"), never in a random key. */
const PLACEHOLDER_WORDING =
  /replace[-_ ]?with|change[-_ ]?me|your[-_ ]?(secret|key)|placeholder|example|not[-_ ]a[-_ ]real|local[-_ ]dev/i;

export function isPublishedPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  return PUBLISHED_SECRETS.has(trimmed.toLowerCase()) || PLACEHOLDER_WORDING.test(trimmed);
}
