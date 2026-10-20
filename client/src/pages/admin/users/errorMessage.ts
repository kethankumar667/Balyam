import { OperationalAuthError } from "../../../lib/operationalApi";

/** A message an operator can act on for a failed operational request. */
export function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}
