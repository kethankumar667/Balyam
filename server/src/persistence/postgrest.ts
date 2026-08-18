import { logger } from "../lib/logger.js";

/**
 * A very small PostgREST client, over `fetch`.
 *
 * ── Why not @supabase/supabase-js ─────────────────────────────────────
 * Because it would be a new server dependency to do something the server
 * already does. `lib/supabaseAuth.ts` verifies sessions by calling
 * `${SUPABASE_URL}/auth/v1/user` with `fetch`; this calls
 * `${SUPABASE_URL}/rest/v1/<table>` with the same `fetch` and the same two
 * headers. supabase-js is a pleasant wrapper around exactly this, plus a
 * realtime client and a storage client and an auth client that this process
 * has no use for.
 *
 * The project has a dependency-governance gate and a bundle budget, and "add a
 * dependency to avoid writing eighty lines" is the decision those exist to
 * question. Eighty lines it is.
 *
 * ── The `Prefer` header is the whole design ───────────────────────────
 * Two behaviours carry every idempotency guarantee in this layer:
 *
 *   resolution=merge-duplicates   →  UPSERT. Last write wins on conflict.
 *   resolution=ignore-duplicates  →  INSERT … ON CONFLICT DO NOTHING, and
 *                                    with `return=representation` the response
 *                                    body is the rows ACTUALLY inserted.
 *
 * That second one is why `insertIgnoringDuplicates` can answer "did this call
 * cause the write" truthfully: an empty array means the unique constraint
 * refused it, which is exactly what a replayed reward claim looks like. No
 * read-then-write, no race between the check and the insert.
 *
 * ── Credentials ───────────────────────────────────────────────────────
 * The service-role key. It bypasses Row Level Security by design, which is
 * what "keep privileged mutations on the server" means: the browser gets the
 * publishable key and RLS, and this process gets the key that can write
 * progression. It must never reach the client bundle — it is read from the
 * server environment only, and nothing here ever logs it.
 */

export interface PostgrestConfig {
  url: string;
  serviceKey: string;
  /** Per-request timeout. Without one, a hung PostgREST hangs the caller. */
  timeoutMs: number;
}

export class PostgrestError extends Error {
  constructor(
    readonly status: number,
    readonly table: string,
    detail: string,
  ) {
    // The detail can contain column values, so it goes in the message for the
    // server log only — every caller of this layer turns a throw into a
    // generic failure before anything reaches a response body.
    super(`PostgREST ${status} on ${table}: ${detail}`);
    this.name = "PostgrestError";
  }
}

export class PostgrestClient {
  constructor(private readonly config: PostgrestConfig) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.config.serviceKey,
      Authorization: `Bearer ${this.config.serviceKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async call(
    table: string,
    path: string,
    init: RequestInit,
  ): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${this.config.url}/rest/v1/${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      throw new PostgrestError(res.status, table, typeof body === "string" ? body : JSON.stringify(body));
    }
    return { status: res.status, body };
  }

  /** `GET /table?<query>`. `query` is a raw PostgREST filter string. */
  async select<T>(table: string, query = ""): Promise<T[]> {
    const { body } = await this.call(table, `${table}${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: this.headers(),
    });
    return (Array.isArray(body) ? body : []) as T[];
  }

  /** Row count without transferring rows. */
  async count(table: string, query = ""): Promise<number> {
    const res = await fetch(
      `${this.config.url}/rest/v1/${table}?${query ? `${query}&` : ""}select=*`,
      {
        method: "HEAD",
        headers: this.headers({ Prefer: "count=exact" }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      },
    );
    if (!res.ok) throw new PostgrestError(res.status, table, "count failed");
    // `content-range` is `0-24/137`; the total is after the slash.
    const range = res.headers.get("content-range") ?? "";
    const total = Number(range.split("/")[1]);
    return Number.isFinite(total) ? total : 0;
  }

  /** UPSERT. `onConflict` names the unique columns to merge on. */
  async upsert(table: string, rows: unknown[], onConflict: string): Promise<void> {
    if (rows.length === 0) return;
    await this.call(table, `${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(rows),
    });
  }

  /**
   * INSERT … ON CONFLICT DO NOTHING, reporting whether it actually inserted.
   *
   * The returned array holds only the rows that were written, so `.length > 0`
   * is a truthful "this call caused the write" — decided by the database's
   * unique index, under whatever concurrency is happening, not by a check the
   * application ran a moment earlier and hoped was still true.
   */
  async insertIgnoringDuplicates<T>(
    table: string,
    rows: unknown[],
    onConflict: string,
  ): Promise<T[]> {
    if (rows.length === 0) return [];
    const { body } = await this.call(table, `${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=ignore-duplicates,return=representation" }),
      body: JSON.stringify(rows),
    });
    return (Array.isArray(body) ? body : []) as T[];
  }

  async delete(table: string, query: string): Promise<void> {
    if (!query) throw new Error(`Refusing an unfiltered DELETE on ${table}`);
    await this.call(table, `${table}?${query}`, {
      method: "DELETE",
      headers: this.headers({ Prefer: "return=minimal" }),
    });
  }

  /** Call a Postgres function through PostgREST. */
  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { body } = await this.call(fn, `rpc/${fn}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(args),
    });
    return body as T;
  }
}

/**
 * Read the persistence configuration, or explain what is missing.
 *
 * Returns `null` rather than throwing so that a development machine with no
 * project falls back to memory, loudly, instead of failing to boot. Production
 * strictness lives in `assertPersistenceConfigured`, next to the other
 * start-up guards, where it is one decision in one place.
 */
export function readPostgrestConfig(): PostgrestConfig | null {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  ).trim();
  if (!url || !serviceKey) return null;

  if (serviceKey.startsWith("sb_publishable_") || serviceKey.startsWith("eyJ") === false) {
    // A publishable key here would appear to work for reads and then fail
    // every write with an RLS error that says nothing about the cause.
    if (serviceKey.startsWith("sb_publishable_")) {
      logger.error({
        message:
          "SUPABASE_SERVICE_ROLE_KEY looks like a PUBLISHABLE key. Progression writes will be " +
          "refused by Row Level Security. Use the service-role (secret) key from " +
          "Project Settings → API.",
        module: "PERSISTENCE",
      });
      return null;
    }
  }

  return {
    url,
    serviceKey,
    timeoutMs: Math.max(1000, Number(process.env.SUPABASE_TIMEOUT_MS) || 8000),
  };
}
