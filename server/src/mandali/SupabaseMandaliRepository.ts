import { PostgrestClient, PostgrestError, type PostgrestConfig } from "../persistence/postgrest.js";
import {
  MandaliRepository,
  MandaliStorageUnavailableError,
} from "./MandaliRepository.js";
import type { Mandali, MandaliMembership, MandaliRole } from "@shared/mandali/Mandali.js";

/**
 * PostgREST implementation of MandaliRepository.
 *
 * Multi-row writes go through Postgres RPCs (one transaction each); plain
 * reads go through the narrow `select` calls. Selected explicitly by the
 * composition root — never a silent fallback — and every failure is
 * translated to MandaliStorageUnavailableError so callers fail closed
 * without leaking PostgREST detail into a response.
 */

interface MandaliRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  max_members: number;
  version: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MembershipRow {
  id: string;
  mandali_id: string;
  user_id: string;
  role: MandaliRole;
  status: string;
  joined_at: string | null;
  left_at: string | null;
  requested_at: string;
}

function toMandali(row: MandaliRow): Mandali {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    maxMembers: row.max_members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMembership(row: MembershipRow): MandaliMembership {
  return {
    id: row.id,
    mandaliId: row.mandali_id,
    userId: row.user_id,
    role: row.role,
    status: row.status as MandaliMembership["status"],
    joinedAt: row.joined_at,
  };
}

export class SupabaseMandaliRepository implements MandaliRepository {
  private readonly client: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.client = new PostgrestClient(config);
  }

  async createGroupWithOwner(input: {
    name: string;
    description: string | null;
    ownerId: string;
    maxMembers: number;
  }): Promise<Mandali> {
    try {
      const group = await this.client.rpc<MandaliRow>("mandali_create_group", {
        p_name: input.name,
        p_description: input.description,
        p_owner_id: input.ownerId,
        p_max_members: input.maxMembers,
      });
      return toMandali(group);
    } catch (err) {
      throw translate(err);
    }
  }

  async listGroupsForUser(userId: string): Promise<Array<{ mandali: Mandali; role: MandaliRole }>> {
    try {
      // PostgREST resource embedding: memberships of this user (live) with
      // their group rows. `mandalis` is the FK from mandali_id.
      const rows = await this.client.select<MembershipRow & { mandalis: MandaliRow }>(
        "mandali_memberships",
        `select=id,mandali_id,user_id,role,status,joined_at,mandalis:mandali_id(*)` +
          `&user_id=eq.${encodeURIComponent(userId)}` +
          `&status=eq.APPROVED&left_at=is.null&mandalis.archived_at=is.null`,
      );
      return rows.map((row) => ({ mandali: toMandali(row.mandalis), role: row.role }));
    } catch (err) {
      throw translate(err);
    }
  }

  async getGroup(id: string): Promise<Mandali | null> {
    try {
      const rows = await this.client.select<MandaliRow>(
        "mandalis",
        `select=*&id=eq.${encodeURIComponent(id)}&archived_at=is.null`,
      );
      return rows.length > 0 ? toMandali(rows[0]) : null;
    } catch (err) {
      throw translate(err);
    }
  }

  async getLiveMembership(mandaliId: string, userId: string): Promise<MandaliMembership | null> {
    try {
      const rows = await this.client.select<MembershipRow>(
        "mandali_memberships",
        `select=*&mandali_id=eq.${encodeURIComponent(mandaliId)}` +
          `&user_id=eq.${encodeURIComponent(userId)}&left_at=is.null` +
          `&status=in.("PENDING","APPROVED")`,
      );
      return rows.length > 0 ? toMembership(rows[0]) : null;
    } catch (err) {
      throw translate(err);
    }
  }

  async listMembers(mandaliId: string): Promise<MandaliMembership[]> {
    try {
      const rows = await this.client.select<MembershipRow>(
        "mandali_memberships",
        `select=*&mandali_id=eq.${encodeURIComponent(mandaliId)}` +
          `&status=eq.APPROVED&left_at=is.null&order=joined_at.asc`,
      );
      return rows.map(toMembership);
    } catch (err) {
      throw translate(err);
    }
  }
}

/** PostgREST failures become one unavailable-shaped error; nothing leaks. */
function translate(err: unknown): Error {
  if (err instanceof PostgrestError && err.status === 409) {
    // 409 here is the owned-group limit (errcode MN001) surfacing.
    const limit = new Error("Owned-group limit reached");
    limit.name = "MandaliLimitError";
    return limit;
  }
  const unavailable = new MandaliStorageUnavailableError();
  return unavailable;
}
