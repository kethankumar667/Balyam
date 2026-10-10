import { logger } from "../lib/logger.js";
import { persistenceStatus } from "../persistence/index.js";
import { readPostgrestConfig } from "../persistence/postgrest.js";
import type { EconomyService } from "../economy/EconomyService.js";
import {
  InMemoryGuestCarryOverStore,
  type ClaimOutcome,
  type GuestCarryOverStore,
  type GuestClaimRecord,
} from "./GuestCarryOverStore.js";
import { SupabaseGuestCarryOverStore } from "./SupabaseGuestCarryOverStore.js";

/**
 * Choosing where carry-over claims live, once, at boot, by the same rule the reward store uses:
 * if progression is on Postgres so are the claims, otherwise memory. A missing migration stops
 * the boot here, not a player's sign-up.
 *
 * The router is built when the module loads, before that choice, so it holds this delegate,
 * which resolves the real store at call time.
 */

let current: GuestCarryOverStore | null = null;

export async function initialiseCarryOverStore(economy: EconomyService | undefined): Promise<GuestCarryOverStore | null> {
  if (persistenceStatus().kind === "supabase") {
    const config = readPostgrestConfig();
    if (!config) {
      throw new Error("Progression is on Supabase but the PostgREST configuration is missing; refusing to start carry-over on memory.");
    }
    const supabase = new SupabaseGuestCarryOverStore(config);
    await supabase.ping();
    current = supabase;
    logger.info({ message: "Guest carry-over store: Supabase Postgres", module: "CARRYOVER" });
    return supabase;
  }
  if (!economy) {
    current = null;
    return null;
  }
  current = new InMemoryGuestCarryOverStore({ economy });
  logger.warn({ message: "Guest carry-over store: memory. Claims are lost on restart.", module: "CARRYOVER" });
  return current;
}

const unavailable = (): never => {
  throw new Error("Guest carry-over is not available: no economy is configured.");
};

/** What the service holds. */
export const carryOverStore: GuestCarryOverStore = {
  get kind() {
    return current?.kind ?? "memory";
  },
  ping: () => (current ? current.ping() : Promise.resolve()),
  claim: (guestId: string, memberId: string): Promise<ClaimOutcome> => (current ? current.claim(guestId, memberId) : unavailable()),
  findByMember: (memberId: string): Promise<GuestClaimRecord | null> => (current ? current.findByMember(memberId) : unavailable()),
};
