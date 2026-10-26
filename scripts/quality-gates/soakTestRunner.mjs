import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { ROOT, MEMBERS, startReleaseFixture, readJson, waitUntil } from "./releaseFixture.mjs";
import { captureEvidence, completeEvidence } from "./releaseEvidence.mjs";
import { parseSoakOptions, evaluateSoakRun } from "./releaseWorkload.mjs";

const clientRequire = createRequire(path.join(ROOT, "client", "package.json"));
const { io } = clientRequire("socket.io-client");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function event(socket, name, predicate = () => true, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const listener = (value) => {
      if (!predicate(value)) return;
      clearTimeout(timer); socket.off(name, listener); resolve(value);
    };
    const timer = setTimeout(() => { socket.off(name, listener); reject(new Error(`Timed out waiting for ${name}`)); }, timeout);
    socket.on(name, listener);
  });
}

function ack(socket, name, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10000).emit(name, payload, (error, response) => {
      if (error) reject(new Error(`${name}: acknowledgement timed out`));
      else if (response?.ok === false) reject(new Error(`${name}: ${response.error}`));
      else resolve(response);
    });
  });
}

async function connect(url, run, clients) {
  const socket = io(url, { autoConnect: false, transports: ["websocket"], forceNew: true, reconnection: false });
  clients.add(socket);
  const connected = event(socket, "connect");
  socket.connect();
  await connected;
  run.totalSocketsConnected++;
  socket.on("room:startPreflight", (payload) => {
    socket.emit("room:acknowledgeStart", {
      startAttemptId: payload.startAttemptId, roomRevision: payload.roomRevision,
      visible: true, orientationSatisfied: true,
    }, (response) => {
      if (!response.accepted) run.errors.push("Preflight acknowledgement refused.");
    });
  });
  socket.on("room:error", (error) => run.errors.push(`room:error: ${error}`));
  socket.on("game:error", (error) => run.errors.push(`game:error: ${error}`));
  return socket;
}

async function leave(socket) {
  if (!socket.connected) return;
  await new Promise((resolve, reject) => socket.timeout(5000).emit("room:leave",
    (error) => error ? reject(new Error("room:leave timeout")) : resolve()));
}

async function runCycle(fixture, run, cycle, clients) {
  const host = await connect(fixture.url, run, clients);
  let guest = await connect(fixture.url, run, clients);
  try {
    const before = await readJson(`${fixture.url}/fixture/economy`);
    const created = await ack(host, "room:create", {
      name: "Soak Host", game: "tictactoe", hostKind: "member", accessToken: fixture.tokens[0],
      ticTacToeOptions: { mode: "classic", turnTimerSeconds: 60 }, entryStakeCoins: 100,
    });
    run.totalRoomsCreated++;
    const joined = await ack(guest, "room:join", {
      code: created.code, name: "Soak Joiner", accountKind: "member", accessToken: fixture.tokens[1],
    });
    const stateUrl = `${fixture.url}/fixture/room/${created.code}`;
    const getState = () => readJson(stateUrl);
    assert.equal(joined.state.players.length, 2);

    const message = `soak-${cycle}-${crypto.randomUUID()}`;
    const received = event(guest, "chat:message", (value) => value.text === message);
    let deliveries = 0;
    const observe = (value) => { if (value.text === message) deliveries++; };
    guest.on("chat:message", observe);
    host.emit("chat:send", { text: message });
    await received;
    run.totalEventsProcessed++;

    host.emit("room:setReady", true);
    guest.emit("room:setReady", true);
    await waitUntil(async () => (await getState()).room.players.every((player) => player.isReady), "both ready");
    host.emit("room:startGame");
    await waitUntil(async () => (await getState()).room.phase === "playing", "authoritative match start");
    const debited = await readJson(`${fixture.url}/fixture/economy`);
    for (let i = 0; i < 2; i++) assert.equal(BigInt(debited.wallets[i].balance), BigInt(before.wallets[i].balance) - 100n);

    // Reclaim the SAME authenticated seat, never a new player with the same name.
    const previousSocket = guest;
    previousSocket.disconnect();
    clients.delete(previousSocket);
    guest = await connect(fixture.url, run, clients);
    const reclaimed = await ack(guest, "room:join", {
      code: created.code, name: "Soak Joiner", playerId: joined.playerId, seatToken: joined.seatToken,
      accountKind: "member", accessToken: fixture.tokens[1],
    });
    assert.equal(reclaimed.playerId, joined.playerId);
    assert.equal(reclaimed.state.players.length, 2);
    assert.equal(reclaimed.gameState.moveCount, 0);
    run.recoveryChecks++;

    // Alternate a host win and a genuine full-board draw.
    const draw = cycle % 2 === 0;
    const cells = draw ? [0, 1, 2, 4, 3, 5, 7, 6, 8] : [0, 3, 1, 4, 2];
    for (let i = 0; i < cells.length; i++) {
      const socket = i % 2 === 0 ? host : guest;
      const move = { type: "place", data: { cellIndex: cells[i] }, actionId: crypto.randomUUID() };
      socket.emit("game:move", move);
      if (i < cells.length - 1) socket.emit("game:move", move);
      const state = await waitUntil(async () => {
        const value = await getState();
        return value.game?.moveCount >= i + 1 ? value : false;
      }, "move broadcast");
      if (state.game.moveCount !== i + 1) run.duplicateEventsDetected++;
      assert.equal(state.game.moveCount, i + 1);
      run.observedMoves++;
      run.totalEventsProcessed++;
    }
    const finished = await getState();
    assert.equal(finished.room.phase, "finished");
    assert.equal(finished.game.winnerId, draw ? "draw" : created.playerId);
    const settled = await waitUntil(async () => {
      const value = await readJson(`${fixture.url}/fixture/economy`);
      const row = value.snapshot.settlements.find((item) => item.roomCode === created.code);
      return row && ["SETTLED", "REFUNDED"].includes(row.status) ? value : false;
    }, "wallet settlement");
    const settlement = settled.snapshot.settlements.find((item) => item.roomCode === created.code);
    assert.equal(settlement.status, draw ? "REFUNDED" : "SETTLED");
    const expected = draw ? [0n, 0n] : [60n, -100n];
    for (let i = 0; i < 2; i++) assert.equal(BigInt(settled.wallets[i].balance), BigInt(before.wallets[i].balance) + expected[i]);
    // Read back after settlement propagation; duplicate active-turn intents
    // above must not advance twice or result in a second ledger credit.
    await sleep(100);
    const again = await readJson(`${fixture.url}/fixture/economy`);
    assert.deepEqual(again.wallets.map((wallet) => wallet.balance), settled.wallets.map((wallet) => wallet.balance));
    assert.equal(new Set(again.snapshot.walletLedger.map((entry) => entry.idempotencyKey)).size, again.snapshot.walletLedger.length);
    run.settlementChecks++;
    // The former listener belongs to the disconnected socket; it still proves
    // a single delivery before recovery, not a count of attempted sends.
    previousSocket.off("chat:message", observe);
    if (deliveries !== 1) run.duplicateEventsDetected += Math.abs(deliveries - 1);
    assert.equal(deliveries, 1);
    await leave(guest);
    await leave(host);
    await waitUntil(async () => (await readJson(`${fixture.url}/health`)).rooms === 0, "room cleanup");
    run.completedCycles++;
  } finally {
    for (const socket of [host, guest]) {
      socket.disconnect();
      clients.delete(socket);
    }
  }
}

export async function runSoakTest(options = parseSoakOptions(process.argv.slice(2))) {
  const evidence = captureEvidence(ROOT);
  let fixture;
  const clients = new Set();
  const run = {
    requestedDurationSeconds: options.durationSeconds, durationSeconds: 0, completedCycles: 0,
    totalEventsProcessed: 0, totalRoomsCreated: 0, totalSocketsConnected: 0, observedMoves: 0,
    duplicateEventsDetected: 0, recoveryChecks: 0, settlementChecks: 0,
    residualRooms: -1, residualSockets: -1, heapGrowthMb: 0, maxWorkGapSeconds: 0, errors: [],
    scope: "Local Socket.IO handlers, real Tic Tac Toe engine, HS256 fixture members, in-memory economy. Not cloud durability, physical devices, traffic capacity or production authentication.",
  };
  let started = performance.now();
  let initialHeapMb = Number.NaN;
  try {
    fixture = await startReleaseFixture({ paid: true });
    initialHeapMb = (await readJson(`${fixture.url}/fixture/gc`, { method: "POST" })).heapMb;
    started = performance.now();
    let last = started;
    do {
      await runCycle(fixture, run, run.completedCycles + 1, clients);
      const current = performance.now();
      run.maxWorkGapSeconds = Math.max(run.maxWorkGapSeconds, (current - last) / 1000);
      last = current;
      if (run.errors.length) throw new Error(run.errors.join("; "));
      if (run.completedCycles % 10 === 0) console.log(`Soak: ${run.completedCycles} observed matches, ${Math.floor((current - started) / 1000)}s elapsed`);
      await sleep(options.pauseMs);
    } while (performance.now() - started < options.durationSeconds * 1000);
  } catch (error) {
    run.errors.push(error.message);
    console.error(`Soak workload failed: ${error.message}`);
  } finally {
    run.durationSeconds = (performance.now() - started) / 1000;
    for (const client of clients) client.disconnect();
    await sleep(200);
    try {
      if (!fixture) throw new Error("Fixture never became ready.");
      const health = await readJson(`${fixture.url}/health`);
      const final = await readJson(`${fixture.url}/fixture/gc`, { method: "POST" });
      run.residualRooms = health.rooms;
      run.residualSockets = health.sockets;
      run.heapGrowthMb = final.heapMb - initialHeapMb;
    } catch (error) {
      run.errors.push(`Cleanup diagnostics failed: ${error.message}`);
      run.heapGrowthMb = Number.NaN;
    } finally {
      if (fixture) await fixture.close();
    }
  }
  const verdict = evaluateSoakRun(run);
  const report = {
    ...run, ...verdict, evidence: completeEvidence(evidence, ROOT),
    memoryLeakDetected: !Number.isFinite(run.heapGrowthMb) || run.heapGrowthMb > 50,
    webSocketLeakDetected: run.residualSockets !== 0,
  };
  fs.writeFileSync(path.join(ROOT, "SOAK-TEST-REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(ROOT, "SOAK-TEST-REPORT.md"), (
    `# Measured local soak\n\nStatus: ${report.status}\nRelease duration met: ${report.releaseEligible}\n\n` +
    `Duration: ${run.durationSeconds.toFixed(1)}s; completed matches: ${run.completedCycles}; observed moves: ${run.observedMoves}.\n\n` +
    `${run.scope}\n\n${report.failures.join("\n")}`).trimEnd() + "\n");
  console.log(`Soak: ${report.status}; ${run.completedCycles} matches; ${run.durationSeconds.toFixed(1)}s; release duration met: ${report.releaseEligible}`);
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exitCode = (await runSoakTest()).status === "PASS" ? 0 : 1; }
  catch (error) { console.error(error); process.exitCode = 1; }
}
