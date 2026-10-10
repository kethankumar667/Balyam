import type { EconomyService } from "../economy/EconomyService.js";

/**
 * Where "this guest was brought into this account" is recorded, and the one atomic step
 * that moves the guest's coins out.
 *
 * ── What the store guarantees, and what it leaves to the gateway ──────
 * `claim` debits the guest's whole wallet and writes the claim in one step, refusing a
 * second claim from either side: a guest is absorbed once, and an account absorbs one
 * guest. It never credits the member. The credit is a reward through the gateway, so it
 * waits out the hold and passes the same checks as every other coin reward. The amount is
 * kept on the claim so a credit that failed can be retried without asking the wallet again.
 */

export type CarryOverStoreErrorCode =
  | "EMAIL_NOT_CONFIRMED"
  | "MEMBER_NOT_FOUND"
  | "GUEST_ALREADY_CLAIMED"
  | "MEMBER_ALREADY_CLAIMED"
  | "GUEST_WALLET_NOT_FOUND"
  | "NOT_A_GUEST"
  | "WALLET_FROZEN"
  | "SCHEMA_MISSING";

export class CarryOverStoreError extends Error {
  constructor(
    readonly code: CarryOverStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CarryOverStoreError";
  }
}

export interface GuestClaimRecord {
  guestId: string;
  memberId: string;
  /** Whole coins the guest's wallet held when it was absorbed. */
  amount: number;
  claimedAt: number;
}

export interface ClaimOutcome {
  /** `REPLAY` when this exact guest and account were already joined; nothing moved this time. */
  status: "CLAIMED" | "REPLAY";
  amount: number;
}

export interface GuestCarryOverStore {
  readonly kind: "memory" | "supabase";
  ping(): Promise<void>;
  claim(guestId: string, memberId: string): Promise<ClaimOutcome>;
  findByMember(memberId: string): Promise<GuestClaimRecord | null>;
}

/** Where the in-memory store parks the coins it takes from a guest, so the supply still adds up. */
export const CARRYOVER_SINK_ID = "system:guest_carryover";

export interface InMemoryCarryOverDeps {
  economy: EconomyService;
  /** Development has no mailbox to confirm; tests inject one. */
  isEmailConfirmed?: (memberId: string) => boolean | Promise<boolean>;
  now?: () => number;
}

/**
 * Development and test twin of the Postgres function. Same refusals in the same order;
 * the claim maps are updated before the first await so two simultaneous claims cannot both pass.
 */
export class InMemoryGuestCarryOverStore implements GuestCarryOverStore {
  readonly kind = "memory" as const;
  private readonly byGuest = new Map<string, GuestClaimRecord>();
  private readonly byMember = new Map<string, GuestClaimRecord>();
  private readonly economy: EconomyService;
  private readonly isEmailConfirmed: (memberId: string) => boolean | Promise<boolean>;
  private readonly now: () => number;

  constructor(deps: InMemoryCarryOverDeps) {
    this.economy = deps.economy;
    this.isEmailConfirmed = deps.isEmailConfirmed ?? (() => true);
    this.now = deps.now ?? Date.now;
  }

  async ping(): Promise<void> {}

  async claim(guestId: string, memberId: string): Promise<ClaimOutcome> {
    if (!guestId || !memberId || guestId === memberId) {
      throw new CarryOverStoreError("NOT_A_GUEST", "A wallet cannot absorb itself.");
    }
    if (!(await this.isEmailConfirmed(memberId))) {
      throw new CarryOverStoreError("EMAIL_NOT_CONFIRMED", "Confirm your email before bringing guest coins over.");
    }

    const mine = this.byMember.get(memberId);
    if (mine) {
      if (mine.guestId === guestId) return { status: "REPLAY", amount: mine.amount };
      throw new CarryOverStoreError("MEMBER_ALREADY_CLAIMED", "This account has already brought a guest over.");
    }
    if (this.byGuest.has(guestId)) {
      throw new CarryOverStoreError("GUEST_ALREADY_CLAIMED", "This guest has already been brought over.");
    }

    // Reserve both sides before awaiting anything, then move the coins.
    const record: GuestClaimRecord = { guestId, memberId, amount: 0, claimedAt: this.now() };
    this.byGuest.set(guestId, record);
    this.byMember.set(memberId, record);
    try {
      await this.economy.ensureIdentityRegistered(guestId, "guest");
      const wallet = await this.economy.getWallet(guestId);
      if (wallet.identityKind !== "guest") throw new CarryOverStoreError("NOT_A_GUEST", "That is not a guest wallet.");
      if (wallet.isFrozen) throw new CarryOverStoreError("WALLET_FROZEN", "That wallet is frozen.");

      const balance = Number(wallet.balance);
      if (balance > 0) {
        await this.economy.ensureIdentityRegistered(CARRYOVER_SINK_ID, "member");
        await this.economy.transferWalletCoins({
          fromIdentityId: guestId,
          toIdentityId: CARRYOVER_SINK_ID,
          amountCoins: String(balance),
          reason: "Brought over to your account",
          idempotencyKey: `guest_carryover:${guestId}`,
        });
      }
      const settled = { ...record, amount: balance };
      this.byGuest.set(guestId, settled);
      this.byMember.set(memberId, settled);
      return { status: "CLAIMED", amount: balance };
    } catch (err) {
      this.byGuest.delete(guestId);
      this.byMember.delete(memberId);
      throw err;
    }
  }

  async findByMember(memberId: string): Promise<GuestClaimRecord | null> {
    return this.byMember.get(memberId) ?? null;
  }
}
