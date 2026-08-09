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
});

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
