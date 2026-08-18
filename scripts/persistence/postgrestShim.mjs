/**
 * A minimal PostgREST-compatible HTTP shim, backed by a real PostgreSQL.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The server's repository speaks PostgREST — Supabase's REST layer — so a bare
 * PostgreSQL is not enough to answer the one question P0-3 could never answer:
 * *does data written by one process survive that process dying?*
 *
 * PostgREST is HTTP over SQL. This translates the exact subset of it the
 * repository uses into SQL and runs it against the embedded Postgres, so the
 * REAL server binary, the REAL repository and the REAL migration can be
 * exercised end-to-end, locally, with no cloud credentials.
 *
 * ── What it is not ────────────────────────────────────────────────────
 * Not a PostgREST implementation. It supports the operations
 * `server/src/persistence/postgrest.ts` actually issues and nothing else, and
 * it deliberately THROWS on anything it does not recognise rather than
 * returning an empty result — a shim that silently answers `[]` to a query it
 * failed to parse would turn a broken repository into a passing test, which is
 * the exact failure mode this whole remediation exists to remove.
 *
 * It is also test-only. It lives in `scripts/`, is never imported by the
 * server, and grants no authority: the real deployment still talks to Supabase.
 *
 * ── Fidelity, honestly ────────────────────────────────────────────────
 * Verifying against this proves the repository's SQL semantics and the
 * application's restart behaviour. It does NOT prove Supabase's PostgREST
 * behaves identically in every corner — notably RLS enforcement under the
 * `authenticated` role, which only the real service can demonstrate. That
 * boundary is stated in the report.
 */

import http from "node:http";
import pkg from "pg";

const { Pool } = pkg;

/** `col=eq.value` / `col=in.(a,b)` / `or=(a.eq.1,b.eq.2)` → SQL + params. */
function buildWhere(params, next) {
  const clauses = [];
  const values = [];

  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;

    if (key === "or") {
      // or=(sender_id.eq.X,recipient_id.eq.X)
      const inner = raw.replace(/^\(|\)$/g, "");
      const parts = inner.split(",").map((piece) => {
        const [col, op, ...rest] = piece.split(".");
        if (op !== "eq") throw new Error(`shim: unsupported or() operator "${op}"`);
        values.push(rest.join("."));
        return `${quoteIdent(col)} = $${next()}`;
      });
      clauses.push(`(${parts.join(" or ")})`);
      continue;
    }

    const [op, ...rest] = raw.split(".");
    const value = rest.join(".");
    if (op === "eq") {
      values.push(value);
      clauses.push(`${quoteIdent(key)} = $${next()}`);
    } else if (op === "in") {
      const list = value.replace(/^\(|\)$/g, "").split(",").filter(Boolean).map(decodeURIComponent);
      if (list.length === 0) {
        clauses.push("false");
      } else {
        const placeholders = list.map((v) => {
          values.push(v);
          return `$${next()}`;
        });
        clauses.push(`${quoteIdent(key)} in (${placeholders.join(",")})`);
      }
    } else {
      throw new Error(`shim: unsupported operator "${op}" on "${key}"`);
    }
  }

  return { sql: clauses.length ? ` where ${clauses.join(" and ")}` : "", values };
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`shim: refusing identifier "${name}"`);
  return `"${name}"`;
}

function buildOrder(params) {
  const order = params.get("order");
  if (!order) return "";
  const parts = order.split(",").map((piece) => {
    const [col, dir] = piece.split(".");
    const direction = dir === "desc" ? "desc" : "asc";
    return `${quoteIdent(col)} ${direction}`;
  });
  return ` order by ${parts.join(", ")}`;
}

export async function startPostgrestShim({ port, connectionString }) {
  const pool = new Pool({ connectionString, max: 12 });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const match = url.pathname.match(/^\/rest\/v1\/([a-zA-Z0-9_]+)$/);
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };

    if (!match) return send(404, { message: "shim: only /rest/v1/<table> is served" });
    const table = quoteIdent(match[1]);
    const params = [...url.searchParams.entries()];
    const searchParams = url.searchParams;

    let counter = 0;
    const next = () => ++counter;

    try {
      if (req.method === "GET" || req.method === "HEAD") {
        const { sql: where, values } = buildWhere(params, next);
        const select = searchParams.get("select");
        // `select=*,embedded(...)` is no longer issued by the repository, and
        // the shim refuses it rather than silently dropping the embed.
        if (select && select.includes("(")) {
          throw new Error("shim: embedded resource selects are not supported");
        }
        const columns = !select || select === "*"
          ? "*"
          : select.split(",").map((c) => quoteIdent(c.trim())).join(", ");

        if (req.method === "HEAD") {
          const { rows } = await pool.query(`select count(*)::int n from ${table}${where}`, values);
          const total = rows[0].n;
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Content-Range": `0-${Math.max(0, total - 1)}/${total}`,
          });
          return res.end();
        }

        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");
        const sql =
          `select ${columns} from ${table}${where}${buildOrder(searchParams)}` +
          (limit ? ` limit ${Number(limit)}` : "") +
          (offset ? ` offset ${Number(offset)}` : "");
        const { rows } = await pool.query(sql, values);
        return send(200, rows);
      }

      if (req.method === "POST") {
        const body = await readJson(req);
        const rows = Array.isArray(body) ? body : [body];
        if (rows.length === 0) return send(201, []);

        const prefer = String(req.headers["prefer"] ?? "");
        const onConflict = searchParams.get("on_conflict");
        const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const values = [];
        const tuples = rows.map((row) => {
          const placeholders = columns.map((c) => {
            const v = row[c];
            values.push(v && typeof v === "object" ? JSON.stringify(v) : v ?? null);
            return `$${next()}`;
          });
          return `(${placeholders.join(",")})`;
        });

        let conflict = "";
        if (prefer.includes("resolution=merge-duplicates") && onConflict) {
          const keys = onConflict.split(",").map((c) => quoteIdent(c.trim()));
          const updates = columns
            .filter((c) => !onConflict.split(",").map((k) => k.trim()).includes(c))
            .map((c) => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`);
          conflict = updates.length
            ? ` on conflict (${keys.join(",")}) do update set ${updates.join(", ")}`
            : ` on conflict (${keys.join(",")}) do nothing`;
        } else if (prefer.includes("resolution=ignore-duplicates")) {
          // Deliberately unqualified: the repository relies on ANY unique
          // constraint refusing the row, not just the one named in
          // `on_conflict`. `match_summaries` is the case that matters — it is
          // inserted with an explicit id AND a natural key, and either may be
          // the one that fires.
          conflict = " on conflict do nothing";
        }

        const returning = prefer.includes("return=representation") ? " returning *" : "";
        const sql =
          `insert into ${table} (${columns.map(quoteIdent).join(",")}) values ${tuples.join(",")}` +
          `${conflict}${returning}`;
        const result = await pool.query(sql, values);
        return send(201, returning ? result.rows : undefined);
      }

      if (req.method === "DELETE") {
        const { sql: where, values } = buildWhere(params, next);
        if (!where) return send(400, { message: "shim: refusing an unfiltered DELETE" });
        await pool.query(`delete from ${table}${where}`, values);
        return send(204);
      }

      return send(405, { message: `shim: ${req.method} not supported` });
    } catch (err) {
      // Loud, with the SQL cause, so a repository bug reads as a repository
      // bug rather than as an empty result set.
      return send(400, { message: String(err.message ?? err) });
    }
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

  return {
    port,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    },
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
