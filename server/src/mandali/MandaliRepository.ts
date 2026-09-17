import type { Mandali, MandaliMembership, MandaliRole } from "@shared/mandali/Mandali.js";

/**
 * Storage contract for the Mandali group domain.
 *
 * The service reasons over this interface only; the Supabase PostgREST
 * implementation is selected explicitly (never silently substituted), and
 * tests inject an in-memory double by naming it, never by the repository
 * being "absent" in production.
 */
export interface MandaliRepository {
  /** Atomic: group row + owner APPROVED episode, one transaction. */
  createGroupWithOwner(input: {
    name: string;
    description: string | null;
    ownerId: string;
    maxMembers: number;
  }): Promise<Mandali>;
  /** Groups the account belongs to (live episodes only). */
  listGroupsForUser(userId: string): Promise<Array<{ mandali: Mandali; role: MandaliRole }>>;
  /** One group, or null. */
  getGroup(id: string): Promise<Mandali | null>;
  /** The caller's live episode in a group, if any. */
  getLiveMembership(mandaliId: string, userId: string): Promise<MandaliMembership | null>;
  /** Approved, live roster. */
  listMembers(mandaliId: string): Promise<MandaliMembership[]>;
}

/** Thrown when durable storage is unavailable — callers must fail closed. */
export class MandaliStorageUnavailableError extends Error {
  constructor() {
    super("Mandali storage is unavailable");
    this.name = "MandaliStorageUnavailableError";
  }
}

/** Thrown when a limit (capacity, ownership count) is exhausted. */
export class MandaliLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MandaliLimitError";
  }
}

export class MandaliNotFoundError extends Error {
  constructor() {
    super("Mandali not found");
    this.name = "MandaliNotFoundError";
  }
}

export class MandaliForbiddenError extends Error {
  constructor() {
    super("Not permitted");
    this.name = "MandaliForbiddenError";
  }
}
