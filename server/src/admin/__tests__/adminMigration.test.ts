import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = new URL("../../../../supabase/migrations/20261101000000_admin_player_inspection.sql", import.meta.url);
describe("admin moderation migration safeguards", () => {
  it("contains canonical registration/backfill, atomic moderation and private RPC grants", () => {
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/after insert on auth\.users/i);
    expect(sql).toMatch(/from auth\.users/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/insert into public\.player_moderation_audit/i);
    expect(sql).toMatch(/p_expected_revision/i);
    expect(sql).toMatch(/erased_at is null/i);
    expect(sql).toMatch(/as restrictive/i);
    expect(sql).toMatch(/grant execute[^;]+to service_role/i);
    expect(sql).not.toMatch(/encrypted_password|refresh_token|password_hash|raw_user_meta_data/i);
    expect(sql).not.toMatch(/before delete.*player_moderation/i);
  });
  it("ships a rollback that removes policies and functions without deleting canonical identities", () => {
    const sql = readFileSync(new URL("../../../../supabase/rollbacks/20261101000000_admin_player_inspection.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/drop policy/i);
    expect(sql).toMatch(/drop function/i);
    expect(sql).not.toMatch(/delete from public\.player_identities/i);
  });
});