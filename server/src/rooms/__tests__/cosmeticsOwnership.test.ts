import { describe, it, expect } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { CosmeticsService } from "../../cosmetics/CosmeticsService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { setUserRole } from "../../security/operationalAuth.js";
import type {
  ClientToServerEvents,
  Player,
  RoomPublicState,
  ServerToClientEvents,
} from "@shared/types.js";

/**
 * `sanitizePublicPresentation` (shared/cosmetics.ts) only proves a submitted
 * cosmetic id is a well-formed, known catalog entry of the right category —
 * it has no database access and cannot check ownership. Before this fix,
 * `RoomManager.setCosmetics` broadcast whatever passed that shape check
 * straight into room state: any connected client could emit
 * `room:setCosmetics` (or the `cosmetics` field on `room:create`/`room:join`)
 * with a legendary item id they never purchased, and every other player in
 * the room would see it. For a cosmetics-only "economy sink" feature, the
 * visible presentation IS the product — this made every purchase optional.
 *
 * These tests pin the fix: an unowned non-default cosmetic is dropped
 * silently (not an error, just absent from the broadcast state), a default
 * item always passes, a purchased item passes once owned, and admins pass
 * without needing to own anything.
 */

interface Harness {
  rooms: RoomManager;
  economyService: EconomyService;
  cosmeticsService: CosmeticsService;
  broadcasts: RoomPublicState[];
}

function makeHarness(): Harness {
  const broadcasts: RoomPublicState[] = [];
  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        if (event === "room:state") {
          broadcasts.push(JSON.parse(JSON.stringify(payload)) as RoomPublicState);
        }
      },
    }),
    sockets: {
      sockets: {
        get: () => ({ join() {}, leave() {}, emit() {} }),
      },
    },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  const economyRepo = new InMemoryEconomyRepository();
  const economyService = new EconomyService(economyRepo);
  const cosmeticsService = new CosmeticsService({ economyRepository: economyRepo, postgrestConfig: null });

  return {
    rooms: new RoomManager(io, economyService, cosmeticsService),
    economyService,
    cosmeticsService,
    broadcasts,
  };
}

const peek = (rooms: RoomManager, code: string) =>
  (rooms as unknown as { rooms: Map<string, { players: Map<string, Player> }> }).rooms.get(code)!;

const seatOf = (rooms: RoomManager, code: string, id: string) =>
  peek(rooms, code).players.get(id)!;

/** See avatarSharing.test.ts's identical technique and its own comment for why this is derived, not counted by hand. */
const PARAMS_AFTER_AVATAR = 3; // hostKind, identityId, entryStakeCoins

function hostWithIdentity(rooms: RoomManager, socket: string, name: string, identityId: string) {
  const gap = rooms.createRoom.length - 4 - PARAMS_AFTER_AVATAR;
  const args: unknown[] = [socket, name, "rummy"];
  for (let i = 0; i < gap; i++) args.push(undefined);
  args.push(undefined); // avatar
  args.push(undefined); // hostKind
  args.push(identityId);
  return rooms.createRoom(...(args as Parameters<RoomManager["createRoom"]>));
}

describe("cosmetics broadcast to the room only when actually owned", () => {
  it("drops an unpurchased non-default cosmetic instead of broadcasting it", async () => {
    const { rooms, economyService, broadcasts } = makeHarness();
    const identityId = "player_no_purchase";
    await economyService.ensureIdentityRegistered(identityId, "member");

    const alice = hostWithIdentity(rooms, "sock_alice", "Alice", identityId);
    await rooms.setCosmetics("sock_alice", { avatarAura: "aura_ludo_king" });

    expect(seatOf(rooms, alice.code, alice.playerId).cosmetics?.avatarAura).toBeUndefined();
    const last = broadcasts[broadcasts.length - 1];
    expect(last.players.find((p) => p.name === "Alice")?.cosmetics?.avatarAura).toBeUndefined();
  });

  it("allows a default (free) cosmetic with no purchase at all", async () => {
    const { rooms, economyService } = makeHarness();
    const identityId = "player_default_only";
    await economyService.ensureIdentityRegistered(identityId, "member");

    const alice = hostWithIdentity(rooms, "sock_alice", "Alice", identityId);
    await rooms.setCosmetics("sock_alice", { avatarAura: "aura_none" });

    expect(seatOf(rooms, alice.code, alice.playerId).cosmetics?.avatarAura).toBe("aura_none");
  });

  it("allows a cosmetic once it has actually been purchased", async () => {
    const { rooms, economyService, cosmeticsService } = makeHarness();
    const identityId = "player_after_purchase";
    await economyService.ensureIdentityRegistered(identityId, "member");

    // aura_radiant_vanguard is a shop-deactivated AVATAR_AURA item
    // (isActive: false) — purchaseCosmetic() now refuses it (INVALID_COSMETIC)
    // since it's no longer buyable. Grant the entitlement directly, as a
    // pre-existing purchase would have left it: this proves a player who
    // already owns a now-removed item still gets it broadcast correctly.
    const granted = await cosmeticsService.grantCosmeticEntitlement({
      userId: identityId,
      cosmeticId: "aura_radiant_vanguard",
      sourceType: "COIN_PURCHASE",
      sourceReference: "idem_own_1",
    });
    expect(granted).toBe(true);

    const alice = hostWithIdentity(rooms, "sock_alice", "Alice", identityId);
    await rooms.setCosmetics("sock_alice", { avatarAura: "aura_radiant_vanguard" });

    expect(seatOf(rooms, alice.code, alice.playerId).cosmetics?.avatarAura).toBe("aura_radiant_vanguard");
  });

  it("filters unowned fields individually rather than rejecting the whole update", async () => {
    const { rooms, economyService, cosmeticsService } = makeHarness();
    const identityId = "player_partial_owner";
    await economyService.ensureIdentityRegistered(identityId, "member");
    await cosmeticsService.purchaseCosmetic(identityId, "dice_golden_ember", "idem_own_2");

    const alice = hostWithIdentity(rooms, "sock_alice", "Alice", identityId);
    await rooms.setCosmetics("sock_alice", {
      diceSkin: "dice_golden_ember", // owned
      avatarAura: "aura_ludo_king", // NOT owned
    });

    const seat = seatOf(rooms, alice.code, alice.playerId);
    expect(seat.cosmetics?.diceSkin).toBe("dice_golden_ember");
    expect(seat.cosmetics?.avatarAura).toBeUndefined();
  });

  it("grants a real admin every cosmetic without requiring a purchase", async () => {
    const { rooms, economyService } = makeHarness();
    const identityId = "player_real_admin";
    await economyService.ensureIdentityRegistered(identityId, "member");
    setUserRole(identityId, "admin");

    const alice = hostWithIdentity(rooms, "sock_alice", "Alice", identityId);
    await rooms.setCosmetics("sock_alice", { podiumTitle: "title_grandmaster" });

    expect(seatOf(rooms, alice.code, alice.playerId).cosmetics?.podiumTitle).toBe("title_grandmaster");
  });

  it("shows nothing for an unresolved identity (no wallet to verify ownership against)", async () => {
    const { rooms } = makeHarness();
    // createRoom tolerates a null/absent identityId (a guest with no valid
    // token) — the room still gets created, just with no verifiable owner.
    const alice = hostWithIdentity(rooms, "sock_alice", "Alice", "");
    await rooms.setCosmetics("sock_alice", { avatarAura: "aura_ludo_king" });

    expect(seatOf(rooms, alice.code, alice.playerId).cosmetics?.avatarAura).toBeUndefined();
  });
});
