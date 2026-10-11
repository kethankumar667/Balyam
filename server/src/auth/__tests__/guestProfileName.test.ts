import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../identity.js";
import { authRouter } from "../AuthController.js";
import { profileRouter } from "../../profile/ProfileController.js";
import { profileService } from "../../profile/ProfileService.js";

describe("a guest has no profile name", () => {
  let server: TestServer;
  let savedSecret: string | undefined;

  beforeEach(async () => {
    savedSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "deterministic-session-secret-for-tests";
    profileService.reset();
    server = await startTestServer((app) => {
      app.use(attachPlayerIdentity);
      app.use("/api/auth", authRouter);
      app.use("/api/profile", profileRouter);
    });
  });

  afterEach(async () => {
    await server.close();
    if (savedSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = savedSecret;
  });

  async function newGuest(): Promise<{ playerId: string; token: string }> {
    const res = await server.request("/api/auth/guest", { method: "POST" });
    return res.body as { playerId: string; token: string };
  }

  it("ignores a displayName sent by a guest but still answers 200", async () => {
    const guest = await newGuest();
    const before = await server.request(`/api/profile/${guest.playerId}`, { token: guest.token });
    const originalName = (before.body as { profile: { displayName: string } }).profile.displayName;

    const put = await server.request(`/api/profile/${guest.playerId}`, {
      method: "PUT",
      token: guest.token,
      body: JSON.stringify({ displayName: "ChosenForever" }),
    });
    const after = await server.request(`/api/profile/${guest.playerId}`, { token: guest.token });

    expect(put.status).toBe(200);
    expect((after.body as { profile: { displayName: string } }).profile.displayName).toBe(originalName);
    expect(originalName).not.toBe("ChosenForever");
  });
});
