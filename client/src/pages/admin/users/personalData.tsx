import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { operationalPost } from "../../../lib/operationalApi";
import { errorMessage } from "./errorMessage";

/**
 * A player's personal data (email, birthday, name, …) is hidden on the admin page until an operator asks
 * to see it. Asking is a request to the server, which records who looked at whose data, so showing it is
 * never silent. What was shown hides again by itself after a couple of minutes.
 */

export const MASK = "••••••";
const REVEAL_VISIBLE_MS = 120_000;

/** The Account section's fields that identify a person; the rest (timestamps, ids) are not personal. */
const SENSITIVE_ACCOUNT_FIELDS: ReadonlySet<string> = new Set(["email", "first_name", "last_name", "dob", "gender", "region", "bio"]);

export const isSensitiveAccountField = (field: string): boolean => SENSITIVE_ACCOUNT_FIELDS.has(field);

/** "kethan@bhalyam.io" -> "k•••••@bhalyam.io": enough to tell accounts apart, not enough to contact anyone. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return MASK;
  return `${email.charAt(0)}•••••${email.slice(at)}`;
}

interface PersonalDataAccess {
  isRevealed: boolean;
  isRevealing: boolean;
  error: string | null;
  reveal: () => void;
  hide: () => void;
}

const HIDDEN: PersonalDataAccess = { isRevealed: false, isRevealing: false, error: null, reveal: () => undefined, hide: () => undefined };

const PersonalDataContext = createContext<PersonalDataAccess>(HIDDEN);

/** The page's one switch for personal data; read it with `usePersonalData`. Scoped to one player's page. */
export function PersonalDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMounted = useRef(true);
  const isBusy = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setIsRevealed(false);
  }, []);

  const reveal = useCallback(() => {
    if (isBusy.current) return;
    isBusy.current = true;
    setIsRevealing(true);
    setError(null);
    operationalPost(`/api/admin/users/${encodeURIComponent(userId)}/personal-data-access`, {})
      .then(() => {
        if (!isMounted.current) return;
        setIsRevealed(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setIsRevealed(false), REVEAL_VISIBLE_MS);
      })
      .catch((failure: unknown) => {
        if (isMounted.current) setError(`Personal data stays hidden: ${errorMessage(failure)}`);
      })
      .finally(() => {
        isBusy.current = false;
        if (isMounted.current) setIsRevealing(false);
      });
  }, [userId]);

  const value = useMemo(() => ({ isRevealed, isRevealing, error, reveal, hide }), [isRevealed, isRevealing, error, reveal, hide]);
  return <PersonalDataContext.Provider value={value}>{children}</PersonalDataContext.Provider>;
}

export function usePersonalData(): PersonalDataAccess {
  return useContext(PersonalDataContext);
}
