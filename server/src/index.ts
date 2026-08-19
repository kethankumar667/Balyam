import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { RoomManager } from "./rooms/RoomManager.js";
import { logger } from "./lib/logger.js";
import { globalRateLimiter } from "./lib/rateLimiter.js";
import { turnStatus } from "./lib/iceServers.js";
import { verificationMode } from "./lib/supabaseAuth.js";
import { serverResourceTracker } from "./reliability/ResourceTracker.js";
import { memoryMonitor } from "./reliability/MemoryMonitor.js";
import { metricsCollector } from "./observability/MetricsCollector.js";
import { securityHeaders } from "./security/SecurityMiddleware.js";
import {
  assertOperationalAuthConfigured,
  operationalAuthStatus,
} from "./security/operationalAuth.js";
import { createOperationalRouter } from "./observability/OperationalController.js";
import { attachPlayerIdentity } from "./auth/identity.js";
import { authRouter } from "./auth/AuthController.js";
import { guestTokenDurability } from "./auth/guestToken.js";
import { initialiseProgressionStore, persistenceStatus } from "./persistence/index.js";
import { hydrateProgression } from "./persistence/hydrate.js";
import { progressionSync } from "./persistence/ProgressionSync.js";
import { profileRouter } from "./profile/ProfileController.js";
import { rankingRouter } from "./ranking/RankingController.js";
import { tournamentRouter, seasonRouter } from "./tournaments/TournamentController.js";
import socialRouter from "./social/SocialController.js";
import partyRouter from "./party/PartyController.js";

/**
 * Refuse to boot a production process that cannot protect its own telemetry.
 *
 * Deliberately the FIRST thing that runs, before a port is bound or a monitor
 * is started. The failure being prevented is a server that starts perfectly,
 * reports itself healthy, and publishes room summaries and event timelines to
 * anyone who asks — a silence nobody notices. A process that exits on boot is
 * noticed within a minute of the deploy.
 *
 * Outside production this only warns. `npm run dev` keeps needing zero
 * infrastructure, and the operational endpoints answer 401 there rather than
 * opening, so local behaviour is honest without being obstructive.
 */
try {
  assertOperationalAuthConfigured();
} catch (err) {
  logger.error({
    message: `Startup aborted: ${err instanceof Error ? err.message : String(err)}`,
    module: "SERVER",
  });
  process.exit(1);
}

memoryMonitor.start(30_000);

const PORT = Number(process.env.PORT) || 4000;
/**
 * Allowed browser origins, comma-separated.
 *
 * A single hard-coded origin is how this broke in production: CLIENT_ORIGIN
 * was set to a hostname that was not the deployed client, and nothing
 * complained. Browsers do NOT enforce CORS on WebSocket handshakes, so the
 * happy path kept working and hid the mismatch completely. Only socket.io's
 * long-polling FALLBACK is CORS-checked, so the misconfiguration surfaced
 * exactly when the network was bad enough to need the fallback: a phone
 * changing networks could never reconnect, while everything looked fine on
 * wifi.
 *
 * Accepting a list makes the preview/production/custom-domain case normal
 * rather than a redeploy, and `originAllowed` below logs every rejection so
 * the next mismatch announces itself instead of hiding.
 */
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

function originAllowed(origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void): void {
  // No Origin header at all: curl, health checks, server-to-server. Not a
  // browser, so CORS is not the relevant control.
  if (!origin) return cb(null, true);
  if (CLIENT_ORIGINS.includes(origin.replace(/\/$/, ""))) return cb(null, true);
  logger.warn({
    message: `Blocked origin "${origin}". Allowed: ${CLIENT_ORIGINS.join(", ")}. ` +
      "Websocket traffic bypasses CORS, so this only breaks the polling fallback " +
      "— which is what a reconnecting phone needs.",
    module: "CORS",
  });
  cb(null, false);
}
const startTime = Date.now();

const app = express();
app.use(securityHeaders);
app.use(cors({ origin: originAllowed }));
app.use(express.json());

/**
 * Resolve who is calling, before any router reads a player id.
 *
 * Global and non-rejecting: it sets `req.player` when a credential verifies
 * and leaves it unset otherwise. Public routes carry on regardless; the
 * `require*` guards on the private ones do the refusing.
 *
 * Mounted here rather than per-router so there is exactly one place identity
 * is derived. Six routers each doing their own version of this is how they
 * ended up with six different amounts of it — which is to say, none.
 */
app.use(attachPlayerIdentity);

/** Issues guest identities. Must not sit behind a guard that needs one. */
app.use("/api/auth", authRouter);

app.use("/api/profile", profileRouter);
app.use("/api/ranking", rankingRouter);
app.use("/api/tournaments", tournamentRouter);
app.use("/api/seasons", seasonRouter);
app.use("/api/social", socialRouter);
app.use("/api/parties", partyRouter);

// Telemetry & Health endpoint
app.get("/health", (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  const activeRooms = roomManager.getRoomCount();
  const socketCount = io.engine.clientsCount;

  res.json({
    status: "healthy",
    uptimeSec,
    activeRooms,
    socketCount,
    // Lets you confirm a TURN provisioning change took effect without
    // reading logs or starting a call. See docs/runbooks/turn-server.md.
    turn: turnStatus(),
    // Same idea for accounts: "off" here and a client that thinks it is
    // signed in is the one misconfiguration whose only other symptom is
    // everybody quietly hosting sealed rooms.
    auth: verificationMode(),
    // Whether the operational API can authorize anyone at all. Never the key
    // itself — just which of the two doors exist, so a deploy that lost its
    // configuration is visible without waiting for a 401 to be noticed.
    operational: operationalAuthStatus(),
    // Where progression lives, and whether writes are landing. `durable:false`
    // in production is the P0-3 finding, live — and a rising `failed` count is
    // a store that has started refusing writes, which is otherwise invisible
    // until the next restart throws the data away.
    progression: { ...persistenceStatus(), sync: progressionSync.status() },
    memory: {
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: originAllowed, methods: ["GET", "POST"], credentials: true },
  /**
   * Notice dead connections sooner than the defaults allow.
   *
   * socket.io defaults to pingInterval 25s + pingTimeout 20s, so a client
   * whose network vanished could go up to ~45 seconds before the server
   * marked it away — and the client stayed equally convinced it was still
   * connected. On a phone switching from wifi to mobile data that is most of
   * the time the player spends staring at a frozen board.
   *
   * 10s + 10s halves the worst case. The cost is a heartbeat every 10s per
   * socket, which is a few bytes.
   */
  pingInterval: 10_000,
  pingTimeout: 10_000,
});

const roomManager = new RoomManager(io);

/**
 * Operational surface. The gate lives ON this router (see
 * observability/OperationalController.ts), not beside it, so no handler here
 * can be reached — and no telemetry gathered — before authorization passes.
 */
app.use("/api/operational", createOperationalRouter({ roomManager, io, startTime }));

/**
 * Last stop for anything a handler threw.
 *
 * Express's default handler prints the stack trace into the RESPONSE when
 * NODE_ENV is not production, and file paths and library versions are exactly
 * what someone probing the API wants. One shape for every failure, and the
 * detail goes to the log where the operator can read it.
 *
 * Registered after every route, which is the only place a four-argument error
 * handler is reached.
 */
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({
    message: `Unhandled error on ${req.method} ${req.path}: ${err instanceof Error ? err.stack ?? err.message : String(err)}`,
    module: "SERVER",
  });
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal Server Error" });
});

/**
 * Identifies THIS process. Survives nothing: a redeploy, a crash, or a
 * free-tier idle spin-down all produce a new one. A client that sees the id
 * change across a reconnect knows its room was never coming back.
 */
const BOOT_ID = Math.random().toString(36).slice(2, 10);

io.on("connection", (socket) => {
  serverResourceTracker.register("socket", socket.id, "socket_connected");
  metricsCollector.onSocketConnect();
  socket.emit("server:hello", {
    bootId: BOOT_ID,
    uptimeSec: Math.floor((Date.now() - startTime) / 1000),
  });
  logger.info({ message: "Socket client connected", socketId: socket.id, module: "SOCKET" });
  registerSocketHandlers(io, socket, roomManager);

  socket.on("disconnect", () => {
    logger.info({ message: "Socket client disconnected", socketId: socket.id, module: "SOCKET" });
    serverResourceTracker.unregister("socket", socket.id);
    metricsCollector.onSocketDisconnect();
    globalRateLimiter.removeSocket(socket.id);
    roomManager.handleDisconnect(socket.id);
  });
});

/**
 * Boot, in the order the dependencies actually run in.
 *
 * Persistence is chosen and proved reachable BEFORE the port is bound, and
 * memory is refilled from it BEFORE the first request can arrive. Doing either
 * of those lazily produces the same class of bug: a server that looks healthy
 * and answers the first player with an empty profile, or with a reward they
 * already claimed.
 *
 * Any failure here exits rather than degrading. A process that starts without
 * durable progression in production is the exact failure this remediation
 * exists to remove, and it must not be reachable by forgetting one variable.
 */
async function boot(): Promise<void> {
  const persistence = await initialiseProgressionStore();
  if (persistence.durable) {
    await hydrateProgression();
  } else {
    logger.warn({
      message: "Nothing to restore: progression is in memory, so this process starts empty.",
      module: "PERSISTENCE",
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    logger.info({
      message: `Server listening on http://0.0.0.0:${PORT} (allowed origins: ${CLIENT_ORIGINS.join(", ")})`,
      module: "SERVER",
    });

    // Which of the three account modes is live. Worth saying at every boot for
    // the same reason as TURN below: "off" is a perfectly normal state for a
    // dev machine and a serious one in production, and nothing else in the
    // running app distinguishes them.
    const auth = verificationMode();
    if (auth === "off") {
      logger.warn({
        message:
          "Sign-ins are NOT verified. `hostKind` is taken at face value, so any " +
          "client can claim to be a member and open a shareable room. Set " +
          "SUPABASE_JWT_SECRET (preferred) or SUPABASE_URL + SUPABASE_ANON_KEY. " +
          "See docs/runbooks/supabase.md.",
        module: "AUTH",
      });
    } else {
      logger.info({
        message: `Sign-ins verified via ${auth === "jwt-secret" ? "the project JWT secret" : "the Supabase auth API"}`,
        module: "AUTH",
      });
    }

    // Guests are now real identities with signed tokens, and the signing key
    // decides whether they survive a restart. Said at boot for the same reason
    // as TURN and auth below: an ephemeral key is normal on a dev machine and
    // serious in production, and nothing else in the running app tells them
    // apart.
    const guests = guestTokenDurability();
    if (!guests.durable) {
      logger.warn({ message: guests.reason, module: "AUTH" });
    }

    // Say this at every boot. A missing relay is invisible in normal use —
    // voice works on wifi and fails only for players behind a symmetric NAT,
    // which is precisely the group least able to report a useful bug.
    const turn = turnStatus();
    if (turn.configured) {
      logger.info({
        message: `TURN relay active (${turn.mode} credentials, ${turn.urls} url${turn.urls === 1 ? "" : "s"})`,
        module: "TURN",
      });
    } else {
      logger.warn({
        message:
          "No TURN relay configured. Voice will fail for any pair of players " +
          "behind symmetric NATs (mobile data, corporate wifi) and there is no " +
          "client-side workaround. See docs/runbooks/turn-server.md.",
        module: "TURN",
      });
    }
  });
}

void boot().catch((err) => {
  logger.error({
    message: `Startup aborted: ${err instanceof Error ? err.message : String(err)}`,
    module: "SERVER",
  });
  process.exit(1);
});


/**
 * Optional self-ping, to stop a sleep-on-idle host spinning the process down.
 *
 * Set `KEEPALIVE_URL` to this service's own public /health URL. Off unless
 * set, because it is a workaround for a hosting limitation rather than
 * something the app needs.
 *
 * Why it works: hosts that sleep do so on absence of INBOUND traffic. A
 * request the service makes to its own public URL leaves and re-enters
 * through the edge, so it counts. The alternative is an external uptime
 * pinger, which is equally valid and one less thing in this process.
 *
 * Trade-offs, honestly: this keeps the instance awake around the clock, which
 * consumes most of a free tier's monthly instance-hour budget, and it does
 * NOT protect in-progress games from a redeploy or a crash. Only persistence
 * does that.
 */
function startKeepAlive(): void {
  const url = process.env.KEEPALIVE_URL;
  if (!url) return;
  const everyMs = Math.max(60_000, Number(process.env.KEEPALIVE_INTERVAL_MS) || 600_000);
  logger.info({
    message: `Keep-alive pinging ${url} every ${Math.round(everyMs / 1000)}s`,
    module: "KEEPALIVE",
  });
  const timer = setInterval(() => {
    fetch(url, { method: "GET" }).catch((err) => {
      // A failed ping is not worth escalating: the next one is minutes away
      // and the service is fine either way.
      logger.warn({ message: `Keep-alive ping failed: ${String(err)}`, module: "KEEPALIVE" });
    });
  }, everyMs);
  // Never hold the process open on this alone.
  timer.unref?.();
}

startKeepAlive();

/**
 * Stop taking traffic, then finish writing what was already accepted.
 *
 * The drain is the part that matters and the part that is easy to omit. A
 * deploy sends SIGTERM, and progression writes are queued behind their
 * callers — so exiting immediately drops exactly the writes that the redeploy
 * was about to make matter. Draining first is the difference between "survives
 * a deploy" and "survives a deploy unless you were unlucky".
 *
 * The 5s backstop is longer than the old 3s because it now has real work to
 * finish; it is still short enough for any orchestrator's grace period.
 */
function shutdown(signal: string): void {
  logger.warn({ message: `Received ${signal}, starting graceful shutdown...`, module: "SERVER" });
  globalRateLimiter.destroy();
  io.close();

  // Stop accepting, and hang up connections that are merely idle. Without
  // this, a keep-alive socket from a load balancer or a health prober holds
  // `server.close()` open for its full timeout.
  server.close();
  server.closeIdleConnections?.();

  /*
   * Drain FIRST, and independently of `server.close()`.
   *
   * The previous version nested the drain inside `server.close()`'s callback,
   * which only fires once every connection has ended. Measured against a real
   * restart, that callback did not fire, the drain never ran, and the process
   * left on the 5-second backstop — silently discarding queued progression
   * writes on every deploy, which is precisely the data loss P0-3 exists to
   * stop. Found by `scripts/persistence/verifyDurability.mjs`, which asserts
   * the flush line appears in the log.
   */
  void progressionSync
    .drain()
    .catch(() => undefined)
    .then(() => {
      const sync = progressionSync.status();
      logger.info({
        message:
          `Progression writes flushed (${sync.written} written, ${sync.failed} failed). ` +
          "HTTP and Socket servers closed.",
        module: "SERVER",
      });
      process.exit(0);
    });

  // Backstop for a drain that cannot finish — a database that has stopped
  // answering must not hold a deploy open indefinitely.
  setTimeout(() => {
    logger.error({
      message: "Shutdown backstop reached; exiting with queued writes possibly unflushed.",
      module: "SERVER",
    });
    process.exit(1);
  }, 8000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
