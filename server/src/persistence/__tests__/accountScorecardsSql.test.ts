import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PlayerScorecardArchive, RecordScoreResult } from "@shared/profile/Scorecard.js";
import type { ScorecardCommit, ScorecardSnapshot } from "../ProgressionRepository.js";
import { InMemoryProgressionRepository, setProgressionRepository } from "../index.js";
import { persistScorecard, readPersistedScorecards } from "../../profile/scorecardPersistence.js";

let db: PGlite;
let directory: string;

class SqlScorecards extends InMemoryProgressionRepository {
  override async getScorecardSnapshot(playerId: string): Promise<ScorecardSnapshot> {
    const { rows } = await db.query<ScorecardSnapshot>(
      "SELECT revision::int, archive FROM player_scorecard_archives WHERE player_id = $1", [playerId],
    );
    return rows[0] ?? { revision: 0, archive: null };
  }

  override async commitScorecard(playerId: string, revision: number, key: string,
    archive: PlayerScorecardArchive, result: RecordScoreResult): Promise<ScorecardCommit> {
    const { rows } = await db.query<{ value: ScorecardCommit }>(
      "SELECT commit_player_scorecard($1, $2, $3, $4::jsonb, $5::jsonb) AS value",
      [playerId, revision, key, JSON.stringify(archive), JSON.stringify(result)],
    );
    return rows[0]!.value;
  }
}

const payload = (score: number, matchId: string) => ({
  game: "handcricket" as const, modeId: "international_t20", score, matchId, context: "VS_BOTS" as const,
});

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "bhalyam-scorecards-sql-"));
  db = new PGlite(join(directory, "postgres"));
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.player_identities(player_id text PRIMARY KEY);
    INSERT INTO player_identities VALUES ('account'), ('erased'), ('mismatch');
  `);
  await db.exec(await readFile(new URL("../../../../supabase/migrations/20261106000000_account_scorecards.sql", import.meta.url), "utf8"));
  setProgressionRepository(new SqlScorecards());
}, 30000);

afterAll(async () => {
  setProgressionRepository(null);
  await db?.close();
  if (directory) await rm(directory, { recursive: true });
});

describe("account scorecard migration on real embedded PostgreSQL", () => {
  it("atomically merges concurrent device results and deduplicates replayed matches", async () => {
    await Promise.all([
      persistScorecard("account", payload(140, "mobile"), 100),
      persistScorecard("account", payload(90, "laptop"), 200),
      persistScorecard("account", payload(175, "other-tab"), 300),
    ]);
    await persistScorecard("account", payload(999, "mobile"), 400);
    expect((await readPersistedScorecards("account")).games.handcricket?.modes.international_t20)
      .toMatchObject({ bestScore: 175, timesPlayed: 3, totalScoreAccumulated: 405 });
  });

  it("survives closing and reopening the database and recreating the server-side repository", async () => {
    await db.close();
    db = new PGlite(join(directory, "postgres"));
    setProgressionRepository(new SqlScorecards());
    expect((await readPersistedScorecards("account")).games.handcricket?.modes.international_t20?.bestScore).toBe(175);
    await persistScorecard("account", payload(10, "mobile"), 500);
    expect((await readPersistedScorecards("account")).games.handcricket?.modes.international_t20?.timesPlayed).toBe(3);
  }, 30000);

  it("rejects mismatched identities without writing an archive", async () => {
    await expect(db.query("SELECT commit_player_scorecard('mismatch', 0, 'bad', $1::jsonb, '{}'::jsonb)",
      [JSON.stringify({ playerId: "someone-else" })])).rejects.toThrow("identity mismatch");
    expect((await readPersistedScorecards("mismatch")).games).toEqual({});
  });

  it("refuses direct client reads and RPC calls", async () => {
    await db.exec("SET ROLE authenticated");
    try {
      await expect(db.query("SELECT * FROM player_scorecard_archives")).rejects.toThrow("permission denied");
      await expect(db.query("SELECT commit_player_scorecard('account', 0, 'x', '{}'::jsonb, '{}'::jsonb)"))
        .rejects.toThrow("permission denied");
    } finally {
      await db.exec("RESET ROLE");
    }
  });

  it("cascades account erasure to both the archive and its idempotency receipts", async () => {
    await persistScorecard("erased", payload(80, "played"), 100);
    await db.query("DELETE FROM player_identities WHERE player_id = 'erased'");
    expect((await readPersistedScorecards("erased")).games).toEqual({});
    const { rows } = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM player_scorecard_receipts WHERE player_id = 'erased'");
    expect(rows[0]!.count).toBe(0);
  });
});
