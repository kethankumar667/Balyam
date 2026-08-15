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
app.use(cors({ origin: originAllowed }));
app.use(express.json());

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
 * Identifies THIS process. Survives nothing: a redeploy, a crash, or a
 * free-tier idle spin-down all produce a new one. A client that sees the id
 * change across a reconnect knows its room was never coming back.
 */
const BOOT_ID = Math.random().toString(36).slice(2, 10);

io.on("connection", (socket) => {
  socket.emit("server:hello", {
    bootId: BOOT_ID,
    uptimeSec: Math.floor((Date.now() - startTime) / 1000),
  });
  logger.info({ message: "Socket client connected", socketId: socket.id, module: "SOCKET" });
  registerSocketHandlers(io, socket, roomManager);

  socket.on("disconnect", () => {
    logger.info({ message: "Socket client disconnected", socketId: socket.id, module: "SOCKET" });
    globalRateLimiter.removeSocket(socket.id);
    roomManager.handleDisconnect(socket.id);
  });
});

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

function shutdown(signal: string): void {
  logger.warn({ message: `Received ${signal}, starting graceful shutdown...`, module: "SERVER" });
  globalRateLimiter.destroy();
  io.close();
  server.close(() => {
    logger.info({ message: "HTTP and Socket servers closed cleanly.", module: "SERVER" });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
