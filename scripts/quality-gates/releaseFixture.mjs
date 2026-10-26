import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const MEMBERS = ["aaaaaaaa-1111-2222-3333-444444444444", "bbbbbbbb-1111-2222-3333-444444444444"];
const clientRequire = createRequire(path.join(ROOT, "client", "package.json"));

function isolatedEnv() {
  const allowed = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE)$/i;
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key)));
}

export async function waitUntil(probe, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${description}`);
}

export async function readJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Fixture HTTP ${response.status} at ${new URL(url).pathname}`);
  return response.json();
}

export async function startReleaseFixture({ paid = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bhalyam-release-fixture-"));
  const secret = crypto.randomBytes(32).toString("hex");
  const loader = pathToFileURL(path.join(ROOT, "server", "node_modules", "tsx", "dist", "loader.mjs")).href;
  const child = spawn(process.execPath, [
    "--expose-gc", "--import", loader, path.join(ROOT, "server", "src", "testing", "releaseTestServer.ts"),
  ], {
    cwd: directory,
    env: {
      ...isolatedEnv(), NODE_ENV: "test", SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
      TSX_TSCONFIG_PATH: path.join(ROOT, "server", "tsconfig.json"),
      RELEASE_LOCAL_FIXTURE: "1", RELEASE_FIXTURE_ECONOMY: paid ? "1" : "0",
      RELEASE_MEMBER_A: MEMBERS[0], RELEASE_MEMBER_B: MEMBERS[1], GUEST_PER_NETWORK_LIMIT: "0",
      ...(paid ? { SUPABASE_JWT_SECRET: secret } : {}),
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (data) => {
    output = (output + data.toString()).slice(-16000);
  });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      if (child.connected) child.send("shutdown");
      const timer = setTimeout(() => child.kill(), 5000);
      await exited;
      clearTimeout(timer);
    }
    fs.rmSync(directory, { recursive: true, force: true });
  };
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Fixture startup timeout:\n${output}`)), 30000);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Fixture exited ${code}:\n${output}`)); });
      child.once("message", (message) => {
        clearTimeout(timer);
        if (typeof message?.url !== "string" || !/^http:\/\/127\.0\.0\.1:\d+$/.test(message.url)) {
          reject(new Error("Invalid fixture readiness response"));
        } else resolve(message.url);
      });
    });
    await readJson(`${url}/health`);
    const tokens = MEMBERS.map((sub) => {
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
      const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
        sub, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 90000,
      })}`;
      return `${body}.${crypto.createHmac("sha256", secret).update(body).digest("base64url")}`;
    });
    return { url, close, tokens, output: () => output };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function startReleaseFrontend(backendUrl) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bhalyam-release-web-"));
  const worker = spawn(process.execPath, [fileURLToPath(import.meta.url), "--build", directory, backendUrl], {
    cwd: directory, env: isolatedEnv(), stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [worker.stdout, worker.stderr]) stream.on("data", (data) => {
    output = (output + data.toString()).slice(-12000);
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.kill();
        reject(new Error(`Isolated Vite build exceeded five minutes:\n${output}`));
      }, 300000);
      worker.once("error", (error) => { clearTimeout(timer); reject(error); });
      worker.once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Isolated Vite build failed:\n${output}`));
      });
    });
    const express = createRequire(path.join(ROOT, "server", "package.json"))("express");
    const app = express();
    app.use(express.static(directory));
    app.get("*", (_req, res) => res.sendFile(path.join(directory, "index.html")));
    const server = http.createServer(app);
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const url = `http://127.0.0.1:${server.address().port}`;
    return {
      url,
      close: async () => {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        fs.rmSync(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "--build") {
  const { build } = await import(pathToFileURL(path.join(path.dirname(clientRequire.resolve("vite/package.json")), "dist", "node", "index.js")).href);
  const { default: tailwindConfig } = await import(pathToFileURL(path.join(ROOT, "client", "tailwind.config.js")).href);
  // Keep cwd isolated from .env while resolving the real stylesheet's content
  // globs from the client root, rather than accidentally emitting no utilities.
  const content = tailwindConfig.content.map((pattern) => path.resolve(ROOT, "client", pattern).replaceAll("\\", "/"));
  await build({
    root: path.join(ROOT, "client"), configFile: path.join(ROOT, "client", "vite.config.ts"),
    envFile: false, define: { "import.meta.env.VITE_SERVER_URL": JSON.stringify(process.argv[4]) },
    css: { postcss: { plugins: [
      clientRequire("tailwindcss")({ ...tailwindConfig, content }),
      clientRequire("autoprefixer")(),
    ] } },
    build: { outDir: process.argv[3], emptyOutDir: true },
  });
}
