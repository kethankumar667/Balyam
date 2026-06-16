import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { RoomManager } from "./rooms/RoomManager.js";

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager(io);

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  registerSocketHandlers(io, socket, roomManager);

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] allowing client origin ${CLIENT_ORIGIN}`);
});

function shutdown(signal: string): void {
  console.log(`[server] received ${signal}, shutting down...`);
  io.close();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
