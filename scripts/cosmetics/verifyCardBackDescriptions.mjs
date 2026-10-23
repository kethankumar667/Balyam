/**
 * Isolated PostgreSQL verification of the description-only migration.
 * Uses the historical 32-row catalog seed and ownership fixtures, never production.
 * Run: node scripts/cosmetics/verifyCardBackDescriptions.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const filename = "20261105000000_card_back_descriptions.sql";
const read = (folder, file) => readFileSync(join(root, "supabase", folder, file), "utf8");
const up = read("migrations", filename);
const down = read("rollbacks", filename);
const directory = mkdtempSync(join(tmpdir(), "bhalyam-card-copy-"));
const port = Number(process.env.VERIFY_PG_PORT ?? 55447);
const database = new EmbeddedPostgres({
  databaseDir: directory, user: "postgres", password: "postgres", port, persistent: false,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});
let client;
let started = false;
try {
  await database.initialise();
  await database.start();
  started = true;
  client = new pg.Client({ host: "127.0.0.1", port, user: "postgres", password: "postgres", database: "postgres" });
  await client.connect();
  await client.query(`
    create table public.cosmetic_catalog (
      id text primary key, category text, name text, description text, price_coins integer,
      rarity text, unlock_method text, display_order integer, is_active boolean default true
    );
    create table public.user_cosmetics (player_id text, cosmetic_id text references public.cosmetic_catalog(id));
    create table public.user_equipped_cosmetics (player_id text, cosmetic_id text references public.cosmetic_catalog(id));
  `);
  await client.query(read("migrations", "20260923000000_cosmetics_card_back_expansion.sql"));
  await client.query(`
    insert into public.user_cosmetics select 'fixture-player', id from public.cosmetic_catalog;
    insert into public.user_equipped_cosmetics values ('fixture-player', 'cardback_deep_blue_vortex_uno');
  `);
  const catalog = async () => (await client.query("select * from public.cosmetic_catalog order by id")).rows;
  const links = async () => (await client.query(`
    select 'owned' as kind, player_id, cosmetic_id from public.user_cosmetics
    union all select 'equipped', player_id, cosmetic_id from public.user_equipped_cosmetics
    order by kind, player_id, cosmetic_id
  `)).rows;
  const before = await catalog();
  const ownership = await links();
  assert.equal(before.length, 32);
  const result = await client.query(up);
  assert.equal(result.rowCount, 16, "exactly sixteen original descriptions change");
  const after = await catalog();
  const withoutCopy = (rows) => rows.map(({ description, ...item }) => item);
  assert.deepEqual(withoutCopy(after), withoutCopy(before), "all other catalog columns remain identical");
  assert.deepEqual(await links(), ownership, "owned and equipped links remain identical");
  for (const item of after.filter((row) => row.id.endsWith("_uno"))) {
    assert.doesNotMatch(item.description, /\b(uno|logo|skip|reverse|wild)\b/i);
    assert.match(item.description, /rosette/);
  }
  assert.equal((await client.query(up)).rowCount, 0, "reapplying is a no-op");
  assert.equal((await client.query(down)).rowCount, 16);
  assert.deepEqual(await catalog(), before, "rollback restores the original catalog exactly");
  assert.equal((await client.query(down)).rowCount, 0, "rollback is repeatable");
  console.log("PASS: sixteen descriptions updated, other columns/ownership unchanged, replay and rollback verified");

  await client.query("update public.cosmetic_catalog set description = replace(description, 'UNO', 'card') where id in ('cardback_brush_strokes_uno', 'cardback_prism_shatter_uno')");
  assert.equal((await client.query(up)).rowCount, 16, "interim brand-neutral copy is also corrected");
  await client.query("update public.cosmetic_catalog set description = 'Operator-approved custom copy' where id = 'cardback_deep_blue_vortex_uno'");
  assert.equal((await client.query(down)).rowCount, 15, "rollback preserves subsequent operator edits");
  assert.equal((await client.query(up)).rowCount, 15, "forward migration preserves operator edits");
  assert.equal((await client.query("select description from public.cosmetic_catalog where id = 'cardback_deep_blue_vortex_uno'")).rows[0].description, "Operator-approved custom copy");
  await client.query(down);
  await client.query("delete from public.user_cosmetics where cosmetic_id = 'cardback_neon_streak_uno'; delete from public.cosmetic_catalog where id = 'cardback_neon_streak_uno'");
  assert.equal((await client.query(up)).rowCount, 14, "missing items are not recreated");
  assert.equal((await catalog()).length, 31);
  console.log("PASS: interim wording, custom-copy guards and missing-row behavior verified");
  console.log("CARD_BACK_DESCRIPTIONS_VERIFIED");
} finally {
  try {
    if (client) await client.end();
  } finally {
    if (started) await database.stop();
    rmSync(directory, { recursive: true, force: true });
  }
}
