import express, { type Express, type Router } from "express";
import http from "http";
import type { AddressInfo } from "net";

/**
 * A real HTTP server, for tests that must prove an HTTP boundary.
 *
 * ── Why not a mock req/res ────────────────────────────────────────────
 * The existing security test hand-rolls `{ path, headers, query }` objects and
 * calls the middleware directly. That proves the function branches correctly.
 * It cannot prove the middleware is MOUNTED, that it runs before the handler,
 * that Express does not route around it, or what status a real client receives
 * — and "the middleware exists" was precisely the false comfort the audit
 * found. A finding of the form "anonymous GET returns 200" can only be closed
 * by an anonymous GET that no longer returns 200.
 *
 * Node's own `http` plus `fetch` is enough for that; no new dependency.
 *
 * Port 0 asks the OS for a free port, so suites can run in parallel and a
 * developer with something already on 4000 is unaffected.
 */

export interface TestServer {
  url: string;
  close: () => Promise<void>;
  /** Every `fetch` option, plus a shorthand for a bearer credential. */
  request: (
    path: string,
    init?: RequestInit & { token?: string },
  ) => Promise<{ status: number; body: unknown; headers: Headers }>;
}

export async function startTestServer(
  mount: (app: Express) => void,
): Promise<TestServer> {
  const app = express();
  app.use(express.json());
  mount(app);

  // Same redacted handler the real server installs, so tests observe the same
  // failure shape a client would.
  app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal Server Error" });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
    request: async (path, init = {}) => {
      const { token, headers, ...rest } = init;
      const res = await fetch(`${url}${path}`, {
        ...rest,
        headers: {
          ...(rest.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(headers as Record<string, string> | undefined),
        },
      });
      const text = await res.text();
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        /* a non-JSON body is itself the interesting fact; hand it back raw */
      }
      return { status: res.status, body, headers: res.headers };
    },
  };
}

/** Convenience for the common case of one router under one prefix. */
export function mountRouter(prefix: string, router: Router): (app: Express) => void {
  return (app) => {
    app.use(prefix, router);
  };
}
