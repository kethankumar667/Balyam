import { profileService } from "../../profile/ProfileService.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway, VESTING_MS } from "../RewardGateway.js";
import { riskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

/**
 * Test support: wire a working reward gateway (over a real in-memory wallet) into
 * `profileService`, the way `index.ts` does at boot. Tests that only need "coin
 * claims work" call this instead of rebuilding the wiring each time.
 */
export interface InstalledRewards {
  economy: EconomyService;
  rewards: InMemoryRewardRepository;
  gateway: RewardGateway;
  clock: { now: number };
  /** Let the vesting period pass and run the sweep. */
  release: () => Promise<void>;
}

export function installRewards(economy: EconomyService = new EconomyService(new InMemoryEconomyRepository())): InstalledRewards {
  const rewards = new InMemoryRewardRepository();
  const clock = { now: Date.now() };
  const gateway = new RewardGateway({ economy, repository: rewards, risk: riskService, trust: new TrustService(), now: () => clock.now });
  profileService.setEconomyService(economy);
  profileService.setRewardGateway(gateway);
  return {
    economy,
    rewards,
    gateway,
    clock,
    release: async () => {
      clock.now += VESTING_MS + 1_000;
      await gateway.releaseDue();
    },
  };
}

export function uninstallRewards(): void {
  profileService.setEconomyService(undefined);
  profileService.setRewardGateway(undefined);
}
