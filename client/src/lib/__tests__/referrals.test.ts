import { afterEach, describe, expect, it, vi } from "vitest";
import { referralRequest } from "../referrals";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("../playerIdentity", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("../socket", () => ({ getApiBaseUrl: () => "https://example.test" }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("referral HTTP responses", () => {
  it.each([
    [503, "text/html", "<html>Service unavailable</html>"],
    [503, "application/json", "null"],
    [200, "application/json", "null"],
    [200, "application/json", "[]"],
  ])("surfaces an actionable failure for status %s and malformed body %s %s", async (status, contentType, body) => {
    mocks.apiFetch.mockResolvedValue(new Response(body, { status, headers: { "Content-Type": contentType } }));
    await expect(referralRequest("/sync", {})).rejects.toThrow("Invitations could not be updated. Please try again.");
  });
  it("preserves an explicit server failure", async () => {
    mocks.apiFetch.mockResolvedValue(new Response(JSON.stringify({ message: "Verify your email first." }), { status: 403 }));
    await expect(referralRequest("/sync", {})).rejects.toThrow("Verify your email first.");
  });
  it("uses the public transport without provisioning an identity", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true })));
    vi.stubGlobal("fetch", fetch);
    await expect(referralRequest("/preview/code", undefined, true)).resolves.toEqual({ available: true });
    expect(fetch).toHaveBeenCalledWith("https://example.test/api/referrals/preview/code", {});
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
});
