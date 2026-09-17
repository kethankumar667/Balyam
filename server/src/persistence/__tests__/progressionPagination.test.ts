import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseProgressionRepository } from "../SupabaseProgressionRepository.js";

const config = { url: "https://progression.test", serviceKey: "test", timeoutMs: 1000 };

describe("Supabase progression pagination", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("reads capped participant and summary pages and keeps deterministic game-filtered totals", async () => {
    const requests: URL[] = [];
    const summaries = Array.from({ length: 205 }, (_, i) => ({
      id: `match_${String(i).padStart(3, "0")}`, room_code: "ROOM01", game: i % 2 ? "uno" : "rps",
      started_at: new Date(1000).toISOString(), finished_at: new Date(2000).toISOString(),
      duration_ms: 1000, winner_id: "guest_1234", participant_count: 1,
    }));
    const participants = summaries.map((m) => ({
      match_id: m.id, player_id: "guest_1234", display_name: "Player", avatar: null,
      is_winner: true, is_bot: false, placement: 1,
    }));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requests.push(url);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Math.min(7, Number(url.searchParams.get("limit") ?? 7));
      let rows: unknown[];
      if (url.pathname.endsWith("match_participants")) {
        rows = participants;
      } else {
        const ids = url.searchParams.get("id")?.slice(4, -1).split(",") ?? [];
        const game = url.searchParams.get("game")?.slice(3);
        rows = summaries.filter((m) => ids.includes(m.id) && (!game || m.game === game));
      }
      return new Response(JSON.stringify(rows.slice(offset, offset + limit)), { status: 200 });
    }));
    const repo = new SupabaseProgressionRepository(config);
    const page = await repo.listMatchesForPlayer("guest_1234", { game: "rps", offset: 100, limit: 3 });
    expect(page.total).toBe(103);
    expect(page.matches.map((m) => m.id)).toEqual(["match_200", "match_202", "match_204"]);
    expect(requests.every((url) => url.toString().length < 2500)).toBe(true);
    expect(requests.some((url) => Number(url.searchParams.get("offset")) > 7)).toBe(true);
  });

  it("sends the requested profile offset with a stable tie breaker", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    await new SupabaseProgressionRepository(config).listProfiles(25, 75);
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.searchParams.get("offset")).toBe("75");
    expect(url.searchParams.get("order")).toBe("experience_points.desc,player_id.asc");
  });
});
