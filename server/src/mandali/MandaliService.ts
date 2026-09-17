import {
  MandaliForbiddenError,
  MandaliLimitError,
  MandaliNotFoundError,
  type MandaliRepository,
} from "./MandaliRepository.js";
import { mandaliCapabilitiesFor } from "@shared/mandali/mandaliPermissions.js";
import type { Mandali, MandaliMemberView, MandaliRole, MandaliSnapshot } from "@shared/mandali/Mandali.js";

/**
 * Mandali group service — domain rules over the storage contract.
 *
 * Deliberately narrow: creation and reads. Join requests, approvals, chat,
 * and money are later slices with their own services; this file does not
 * grow into the whole feature.
 *
 * Authorization here is role-based on live APPROVED episodes; the *current
 * account eligibility* layer sits in front of this (strictAccount.ts) and is
 * a separate concern — storage never decides who may call.
 */

const NAME_MIN = 1;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 280;
/** Owned-group pilot default, mirrored in mandali_create_group (MN001). */
const MAX_OWNED_GROUPS = 2;

export interface CreateMandaliInput {
  name: unknown;
  description: unknown;
}

export class MandaliService {
  constructor(private readonly repo: MandaliRepository) {}

  async createGroup(userId: string, input: CreateMandaliInput): Promise<Mandali> {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      throw new Error(`Name must be ${NAME_MIN}-${NAME_MAX} characters`);
    }
    const description =
      typeof input.description === "string" && input.description.trim().length > 0
        ? input.description.trim().slice(0, DESCRIPTION_MAX)
        : null;

    try {
      return await this.repo.createGroupWithOwner({
        name,
        description,
        ownerId: userId,
        maxMembers: 32,
      });
    } catch (err) {
      // The RPC owns the authoritative limit; its MN001 shape comes back as
      // MandaliLimitError from the repository translation.
      if ((err as Error).name === "MandaliLimitError") {
        throw new MandaliLimitError("You already own the maximum number of mandalis.");
      }
      throw err;
    }
  }

  async listMyGroups(userId: string): Promise<Array<{ mandali: Mandali; role: MandaliRole }>> {
    return this.repo.listGroupsForUser(userId);
  }

  async getSnapshot(mandaliId: string, userId: string): Promise<MandaliSnapshot> {
    const group = await this.repo.getGroup(mandaliId);
    if (!group) throw new MandaliNotFoundError();

    const membership = await this.repo.getLiveMembership(mandaliId, userId);
    if (!membership || membership.status !== "APPROVED") throw new MandaliNotFoundError();

    const members = await this.repo.listMembers(mandaliId);
    const memberViews: MandaliMemberView[] = members.map((m) => ({
      userId: m.userId,
      role: m.role,
      displayName: null,
      joinedAt: m.joinedAt,
    }));

    return {
      mandali: group,
      callerRole: membership.role,
      members: memberViews,
    };
  }

  /** True when the caller may act with the named capability on this group. */
  async assertCapability(mandaliId: string, userId: string, capability: keyof ReturnType<typeof mandaliCapabilitiesFor>): Promise<MandaliRole> {
    const membership = await this.repo.getLiveMembership(mandaliId, userId);
    if (!membership || membership.status !== "APPROVED") throw new MandaliNotFoundError();
    const caps = mandaliCapabilitiesFor(membership.role);
    if (!caps[capability]) throw new MandaliForbiddenError();
    return membership.role;
  }
}
