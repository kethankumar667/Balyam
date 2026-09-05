import { apiFetch } from "./playerIdentity";
import { operationalFetch } from "./operationalApi";

/**
 * Typed client for `POST /api/support/feedback` — the general "Leave us
 * Feedback" form. Built on `apiFetch` like `reviewsApi.ts`, even though the
 * server doesn't require an identity for this route: `apiFetch` degrades
 * gracefully when no credential is available yet, and a signed-in/guest
 * caller still gets attributed via `req.player` for free.
 */

export type FeedbackCategory = "bug" | "suggestion" | "other";

export class FeedbackClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FeedbackClientError";
    this.status = status;
  }
}

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  message: string;
  email?: string;
}

/** POST /api/support/feedback. */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ id: string }> {
  const res = await apiFetch("/api/support/feedback", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* non-json error body */
    }
    throw new FeedbackClientError(res.status, message);
  }
  return (await res.json()) as { id: string };
}

export interface FeedbackSubmissionRecord {
  id: string;
  category: FeedbackCategory;
  message: string;
  email: string | null;
  submitterId: string | null;
  createdAt: number;
}

/** GET /api/admin/feedback — read-only inbox, operational credentials required. Built on `operationalFetch`, like `reviewsApi.ts`'s admin functions. */
export async function adminListFeedback(): Promise<{ submissions: FeedbackSubmissionRecord[] }> {
  return operationalFetch("/api/admin/feedback");
}
