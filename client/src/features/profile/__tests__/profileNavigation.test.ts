import { describe, expect, it } from "vitest";
import {
  PROFILE_NAV_ITEMS,
  PROFILE_ROUTE_REDIRECTS,
} from "../profileNavigation";

describe("profile navigation contract", () => {
  it("exposes exactly four canonical mobile-first destinations", () => {
    expect(PROFILE_NAV_ITEMS.map((item) => item.path)).toEqual([
      "/profile",
      "/profile/matches",
      "/profile/achievements",
      "/profile/scorecards",
    ]);
    expect(PROFILE_NAV_ITEMS.every((item) => item.shortLabel.length > 0)).toBe(true);
  });

  it("preserves every legacy profile destination", () => {
    expect(PROFILE_ROUTE_REDIRECTS).toEqual({
      "/profile/overview": "/profile",
      "/profile/personal": "/profile?edit=profile",
      "/profile/statistics": "/profile#mastery",
      "/profile/stats": "/profile#mastery",
      "/profile/history": "/profile/matches",
    });
  });
});
