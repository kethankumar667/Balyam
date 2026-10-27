import { logger } from "./logger.js";
import type { Request, Response } from "express";

type ReadinessResult = { status: "ready" | "not_ready"; checks: Record<string, boolean> };

export function createReadinessCheck(
  probes: Record<string, () => Promise<void>>,
  { cacheMs = 5_000, timeoutMs = 2_000 } = {},
): () => Promise<ReadinessResult> {
  let pending: Promise<ReadinessResult> | undefined;
  let cached: ReadinessResult | undefined;
  let expiresAt = 0;
  const previous = new Map<string, boolean>();
  return () => {
    if (pending) return pending;
    if (cached && Date.now() < expiresAt) return Promise.resolve(cached);
    pending = Promise.all(Object.entries(probes).map(async ([name, probe]) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let ready = false;
      try {
        await Promise.race([
          Promise.resolve().then(probe),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Readiness timeout")), timeoutMs);
          }),
        ]);
        ready = true;
      } catch {
        if (previous.get(name) !== false) {
          logger.warn({ message: `Readiness probe failed: ${name}`, module: "READINESS" });
        }
      } finally {
        clearTimeout(timer);
      }
      if (ready && previous.get(name) === false) {
        logger.info({ message: `Readiness probe recovered: ${name}`, module: "READINESS" });
      }
      previous.set(name, ready);
      return [name, ready] as const;
    })).then((entries) => {
      cached = { status: entries.every(([, ready]) => ready) ? "ready" : "not_ready", checks: Object.fromEntries(entries) };
      expiresAt = Date.now() + cacheMs;
      return cached;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}

export function readinessHandler(check: () => Promise<ReadinessResult>, stopping: () => boolean) {
  return async (_req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    if (stopping()) {
      res.status(503).json({ status: "not_ready", checks: { serving: false } });
      return;
    }
    const result = await check();
    if (stopping()) {
      res.status(503).json({ status: "not_ready", checks: { ...result.checks, serving: false } });
      return;
    }
    res.status(result.status === "ready" ? 200 : 503).json(result);
  };
}
