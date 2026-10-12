import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAccount, fetchProfile } from "../profile";
import { getSupabase } from "../client";

vi.mock("../client", () => ({
  getSupabase: vi.fn(),
}));

/**
 * Builds a fake Supabase client whose `.from("profiles").select(cols)...`
 * chain resolves based on which columns were requested — so a test can make
 * the "core" select (display_name, avatar_id) succeed while the "extended"
 * select (first_name, last_name, ...) fails, or vice versa, the way a real
 * project missing a later migration's columns would.
 */
function fakeSupabase(responses: {
  core: { data: unknown; error: unknown };
  extended: { data: unknown; error: unknown };
}) {
  return {
    from: () => ({
      select: (cols: string) => ({
        eq: () => ({
          maybeSingle: async () =>
            cols.includes("first_name") ? responses.extended : responses.core,
        }),
      }),
    }),
  };
}

describe("fetchProfile", () => {
  beforeEach(() => {
    vi.mocked(getSupabase).mockReset();
  });

  it("regression: returns display_name/avatar_id even when the extended-columns query fails (e.g. a later migration was never run)", async () => {
    vi.mocked(getSupabase).mockReturnValue(
      fakeSupabase({
        core: { data: { display_name: "Kethan Kumar", avatar_id: "avatar-1" }, error: null },
        // Simulates Postgres erroring because first_name/last_name/etc.
        // don't exist yet on this project's profiles table.
        extended: { data: null, error: { message: 'column "first_name" does not exist' } },
      }) as never,
    );

    const profile = await fetchProfile("user-1");

    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe("Kethan Kumar");
    expect(profile?.avatarId).toBe("avatar-1");
    expect(profile?.firstName).toBeUndefined();
  });

  it("returns null when the core columns themselves fail to load", async () => {
    vi.mocked(getSupabase).mockReturnValue(
      fakeSupabase({
        core: { data: null, error: { message: "no row" } },
        extended: { data: null, error: null },
      }) as never,
    );

    const profile = await fetchProfile("user-1");
    expect(profile).toBeNull();
  });

  it("merges both queries when everything is available", async () => {
    vi.mocked(getSupabase).mockReturnValue(
      fakeSupabase({
        core: { data: { display_name: "Kethan Kumar", avatar_id: "avatar-1" }, error: null },
        extended: {
          data: {
            first_name: "Kethan",
            last_name: "Kumar",
            email: "kethankumargontla@gmail.com",
            dob: null,
            gender: null,
            account_id: null,
            bio: null,
            region: "India",
          },
          error: null,
        },
      }) as never,
    );

    const profile = await fetchProfile("user-1");
    expect(profile?.displayName).toBe("Kethan Kumar");
    expect(profile?.firstName).toBe("Kethan");
    expect(profile?.region).toBe("India");
  });

  it("returns null when Supabase is unconfigured", async () => {
    vi.mocked(getSupabase).mockReturnValue(null);
    expect(await fetchProfile("user-1")).toBeNull();
  });
});

describe("deleteAccount", () => {
  const signOut = vi.fn().mockResolvedValue({});

  function fakeRpc(result: { error: { message: string } | null }) {
    const rpc = vi.fn().mockResolvedValue(result);
    vi.mocked(getSupabase).mockReturnValue({ rpc, auth: { signOut } } as never);
    return rpc;
  }

  beforeEach(() => {
    vi.mocked(getSupabase).mockReset();
    signOut.mockClear();
  });

  it("deletes through the delete_account function and signs this device out", async () => {
    const rpc = fakeRpc({ error: null });

    const result = await deleteAccount();

    expect(rpc).toHaveBeenCalledWith("delete_account");
    expect(result).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("never shows database internals to the person, and stays signed in", async () => {
    fakeRpc({
      error: {
        message:
          'update or delete on table "player_identities" violates foreign key constraint "coin_wallets_identity_id_fkey" on table "coin_wallets"',
      },
    });

    const result = await deleteAccount();

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/player_identities|coin_wallets|foreign key|constraint/i);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("is a no-op success when accounts are not connected", async () => {
    vi.mocked(getSupabase).mockReturnValue(null);

    expect(await deleteAccount()).toEqual({ ok: true });
  });
});
