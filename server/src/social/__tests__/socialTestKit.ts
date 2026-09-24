import crypto from "crypto";
import { clearGuestIdentityProvisioningCache } from "../../auth/identity.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import { friendsService } from "../FriendsService.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import { partyService } from "../../party/PartyService.js";
import { profileService } from "../../profile/ProfileService.js";
import { blockRegistry } from "../BlockRegistry.js";

export const TEST_JWT_SECRET = "test-jwt-secret-for-hs256-signing-social";

/** A signed access token for `sub`, valid for an hour from the CURRENT (possibly faked) clock. */
export function mintToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: "authenticated",
      aud: "authenticated",
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TEST_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/** A player the server "already knows": the identity row every real sign-in leaves behind. */
export async function seedIdentity(repo: InMemoryProgressionRepository, playerId: string): Promise<void> {
  await repo.upsertIdentity({ playerId, kind: "member", authUserId: playerId, lastSeenAt: Date.now() });
}

/** Fresh repository and empty social state, so no test sees another's players. */
export function freshSocialState(): InMemoryProgressionRepository {
  const repo = new InMemoryProgressionRepository();
  setProgressionRepository(repo);
  clearGuestIdentityProvisioningCache();
  friendsService.clear();
  friendRequestsService.clear();
  partyService.clear();
  profileService.reset();
  blockRegistry.clear();
  return repo;
}

let counter = 0;
/** A UUID-shaped id that is unique per call, so limiter buckets never collide across tests. */
export function uniquePlayerId(): string {
  counter += 1;
  const tail = counter.toString(16).padStart(12, "0");
  return `00000000-1111-2222-3333-${tail}`;
}
