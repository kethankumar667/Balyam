/**
 * Loopback-only release fixture. No dotenv, cloud persistence, production
 * credentials or deployment endpoints. This is not a production entry point.
 */
import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { authRouter } from "../auth/AuthController.js";
import { attachPlayerIdentity } from "../auth/identity.js";
import { profileRouter } from "../profile/ProfileController.js";
import { createEconomyRouter } from "../economy/EconomyController.js";
import { EconomyService } from "../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../persistence/InMemoryEconomyRepository.js";
import { RoomManager } from "../rooms/RoomManager.js";
import { registerSocketHandlers } from "../sockets/index.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";

if (!process.send || process.env.RELEASE_LOCAL_FIXTURE !== "1") {
  throw new Error("Release fixture requires its isolated IPC launcher.");
}
if (Object.keys(process.env).some((key) => /SUPABASE_(URL|ANON_KEY|SERVICE_ROLE_KEY)$/.test(key))) {
  throw new Error("Cloud configuration is forbidden in the release fixture.");
}

const paid = process.env.RELEASE_FIXTURE_ECONOMY === "1";
const repository = new InMemoryEconomyRepository();
const economy = new EconomyService(repository);
const app = express();
app.use(cors());
app.use(express.json());
app.use(attachPlayerIdentity);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/economy", createEconomyRouter(economy));
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, { cors: { origin: true } });
const rooms = new RoomManager(io, paid ? economy : undefined);
if (paid) rooms.startEconomyRecovery();
io.on("connection", (socket) => {
  registerSocketHandlers(io, socket, rooms);
  socket.on("disconnect", () => rooms.handleDisconnect(socket.id));
});
app.get("/health", (_req, res) => {
  res.json({
    fixture: true, rooms: rooms.getRoomCount(), sockets: io.sockets.sockets.size,
    heapMb: process.memoryUsage().heapUsed / 1024 / 1024,
  });
});
// Read-only diagnostics; player actions still use the public socket handlers.
app.get("/fixture/room/:code", (req, res) => {
  const room = rooms.getRoomStateByCode(req.params.code);
  const socket = [...io.sockets.sockets.keys()].find((id) => rooms.getRoomState(id)?.code === req.params.code);
  res.json({ room, game: socket ? rooms.getGameStateForSocket(socket) : null });
});
app.get("/fixture/economy", async (_req, res, next) => {
  try {
    const ids = [process.env.RELEASE_MEMBER_A!, process.env.RELEASE_MEMBER_B!];
    const snapshot = repository.testFixture.snapshot();
    res.json({ wallets: await Promise.all(ids.map((id) => economy.getWallet(id))), snapshot });
  } catch (error) { next(error); }
});
app.post("/fixture/gc", (_req, res) => {
  if (!global.gc) { res.status(503).json({ error: "GC is not exposed" }); return; }
  global.gc();
  res.json({ heapMb: process.memoryUsage().heapUsed / 1024 / 1024 });
});
if (paid) {
  for (const id of [process.env.RELEASE_MEMBER_A!, process.env.RELEASE_MEMBER_B!]) {
    repository.testFixture.seedWallet({
      identityId: id, identityKind: "member", balance: "10000000",
      lifetimeGranted: "10000000", starterGranted: true,
    });
  }
}
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture did not bind a TCP port.");
  process.send!({ url: `http://127.0.0.1:${address.port}` });
});
process.on("message", (message) => {
  if (message !== "shutdown") return;
  rooms.stopEconomyRecovery();
  io.close(() => server.close(() => process.exit(0)));
});
