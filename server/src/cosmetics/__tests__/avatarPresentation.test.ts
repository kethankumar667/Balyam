import { describe, expect, it, vi } from "vitest";
import { parseAvatarPlayerIds } from "@shared/avatarPresentation.js";
import { CosmeticsService } from "../CosmeticsService.js";
import { InMemoryCosmeticsRepository } from "../InMemoryCosmeticsRepository.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

describe("public avatar decoration", () => {
  it("bounds and deduplicates the requested identities", () => {
    expect(parseAvatarPlayerIds("one,two,one")).toEqual(["one", "two"]);
    for (const input of [undefined, [], "", "one,,two", "../secret", "a".repeat(129), Array(26).fill("one").join(",")]) {
      expect(parseAvatarPlayerIds(input)).toBeNull();
    }
  });

  it("returns only the recorded equipped aura, never inventory or a client claim", async () => {
    const repository = new InMemoryCosmeticsRepository(new InMemoryEconomyRepository());
    vi.spyOn(repository, "getUserEquipped").mockImplementation(async id => ({
      tableThemes: {}, tokenSkins: {}, diceSkins: {}, cardBacks: {},
      avatarAura: id === "one" ? "aura_nostalgia_gold" : id === "bad" ? "dice_cyber_neon" : undefined,
    }));
    const inventory = vi.spyOn(repository, "getUserEntitlements");
    const service = new CosmeticsService({ repository });
    expect(await service.getAvatarAuras(["one", "two", "bad"])).toEqual({ one: "aura_nostalgia_gold", two: null, bad: null });
    expect(inventory).not.toHaveBeenCalled();
  });
});
