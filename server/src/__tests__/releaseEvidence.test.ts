import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  evaluateReleaseEvidence,
  validateReleaseReceipt,
  type EvidenceKind,
} from "../../../scripts/quality-gates/releaseEvidence.mjs";

const now = Date.parse("2026-10-27T00:00:00.000Z");
const gitCommit = "a".repeat(40);
const context = {
  gitCommit,
  sourceClean: true,
  now,
  stagingEndpoint: "https://staging.example.com",
  migrations: ["0001_accounts.sql"],
};
const evidence = {
  schemaVersion: 1,
  gitCommit,
  sourceClean: true,
  environment: "local",
  startedAt: "2026-10-26T23:00:00.000Z",
  completedAt: "2026-10-26T23:30:00.000Z",
};

function fixture(kind: EvidenceKind): Record<string, unknown> {
  switch (kind) {
    case "accessibility":
      return {
        evidence: { ...evidence },
        pagesAudited: 2, routes: ["home"], themes: ["light", "dark"],
        counts: { accessibility: { critical: 0, serious: 0 }, contrast: { total: 0 }, keyboard: 0 },
        accessibilityViolations: [], contrastViolations: [], keyboardFindings: [],
      };
    case "mobile":
      return {
        evidence: { ...evidence },
        pagesInspected: 2, controlsMeasured: 10, viewports: ["mobile", "desktop"],
        routes: ["home"], roomScreenChecked: true,
        counts: { critical: 0, high: 0, medium: 0 }, findings: [],
      };
    case "schema":
      return {
        evidence: { ...evidence }, passed: true,
        checks: [
          "database reachable and answering queries",
          "migration applies cleanly to an empty database",
          "migration is re-runnable (idempotent)",
          "RLS enabled on every table",
          "no INSERT/UPDATE/DELETE policy exists for client roles",
          "rollback script executes cleanly",
          "no progression tables remain after rollback",
          "migration re-applies after a rollback",
        ].map((name) => ({ name, passed: true })),
      };
    case "persistence":
      return {
        evidence: { ...evidence }, passed: true, store: "supabase-postgres",
        checks: [
          { name: "the row is in PostgreSQL with no server running", passed: true },
          { name: "the profile written by the DEAD process is served by the NEW one", passed: true },
          { name: "second server started and hydrated from the database", passed: true },
          { name: "13 identical friend writes stored exactly one row", passed: true },
          { name: "the write-behind queue drains on its own", passed: true },
        ],
      };
    case "multiplayer":
      return {
        evidence: { ...evidence }, allPassed: true, failures: [],
        scenarios: "ABCDEFGH".split("").map((id) => ({ id: `SCENARIO_${id}`, status: "PASS" })),
      };
    case "soak":
      return {
        evidence: { ...evidence, startedAt: "2026-10-26T22:30:00.000Z" }, status: "PASS", durationSeconds: 3600,
        totalEventsProcessed: 100, totalRoomsCreated: 2, totalSocketsConnected: 8,
        duplicateEventsDetected: 0, memoryLeakDetected: false, webSocketLeakDetected: false,
      };
    case "browserCompatibility":
      return {
        evidence: { ...evidence },
        browsers: ["chromium", "edge", "firefox", "safari"].map((id) => ({
          id, status: "PASS",
          flows: { identity: true, roomCreation: true, roomJoin: true, chat: true, modal: true, gameArena: true },
        })),
      };
    case "supabaseCloud":
      return {
        evidence: { ...evidence, environment: "staging" },
        status: "VERIFIED", endpoint: context.stagingEndpoint,
        migrations: [{ name: "0001_accounts.sql", applied: true }],
        checks: [
          { name: "cloud-auth", passed: true },
          { name: "cloud-rls", passed: true },
          { name: "cloud-postgrest", passed: true },
        ],
      };
  }
}

const kinds: EvidenceKind[] = [
  "accessibility", "mobile", "persistence", "schema",
  "multiplayer", "soak", "browserCompatibility", "supabaseCloud",
];

describe("release receipt evidence", () => {
  it.each(kinds)("accepts complete current %s evidence", (kind) => {
    expect(validateReleaseReceipt(kind, fixture(kind), context).status).toBe("PASS");
  });

  it.each([null, [], {}, { status: "PASS" }])("rejects incomplete data %j", (receipt) => {
    expect(validateReleaseReceipt("mobile", receipt, context).status).not.toBe("PASS");
  });

  it.each([
    { gitCommit: "b".repeat(40) },
    { gitCommit: "workspace-build" },
    { sourceClean: false },
    { environment: "production" },
    { startedAt: "invalid" },
    { startedAt: { toString: 0, valueOf: 0 } },
    { completedAt: "invalid" },
    { completedAt: "2026-10-28T00:00:00.000Z" },
    { startedAt: "2026-10-01T00:00:00.000Z" },
    { completedAt: "2026-10-26T22:00:00.000Z" },
  ])("rejects invalid provenance %j", (patch) => {
    const receipt = fixture("mobile");
    receipt.evidence = { ...evidence, ...patch };
    expect(validateReleaseReceipt("mobile", receipt, context).status).not.toBe("PASS");
  });

  it("rejects receipts while the current source is dirty", () => {
    expect(validateReleaseReceipt("mobile", fixture("mobile"), {
      ...context, sourceClean: false,
    }).status).not.toBe("PASS");
  });

  it.each([
    { counts: { critical: 0, high: 1, medium: 0 } },
    { counts: { critical: 0, high: "0", medium: 0 } },
    { counts: { critical: 0, high: -1, medium: 0 } },
    { pagesInspected: 0 },
    { controlsMeasured: 0 },
    { roomScreenChecked: false },
    { findings: [{ severity: "HIGH" }] },
  ])("rejects defective or unmeasured mobile reports %j", (patch) => {
    expect(validateReleaseReceipt("mobile", {
      ...fixture("mobile"), ...patch,
    }, context).status).not.toBe("PASS");
  });

  it("reads actual nested accessibility counts, not obsolete zero defaults", () => {
    const receipt = fixture("accessibility");
    receipt.counts = { accessibility: { critical: 0, serious: 3 }, contrast: { total: 0 }, keyboard: 0 };
    expect(validateReleaseReceipt("accessibility", receipt, context).status).toBe("FAIL");
  });

  it.each(["contrastViolations", "keyboardFindings", "accessibilityViolations"])(
    "rejects findings even if summary counters claim zero: %s", (field) => {
      expect(validateReleaseReceipt("accessibility", {
        ...fixture("accessibility"), [field]: [{ impact: "serious" }],
      }, context).status).toBe("FAIL");
    },
  );

  it.each(["persistence", "schema"] as const)("rejects failed/skipped/empty %s checks", (kind) => {
    for (const checks of [[], [{ name: "check", passed: false }], [{ name: "check", passed: true, skipped: true }]]) {
      expect(validateReleaseReceipt(kind, { ...fixture(kind), checks }, context).status).not.toBe("PASS");
    }
  });

  it("requires the specific durability claims, not just an arbitrary passing check", () => {
    expect(validateReleaseReceipt("persistence", {
      ...fixture("persistence"), checks: [{ name: "server boots", passed: true }],
    }, context).status).not.toBe("PASS");
  });

  it("rejects partial/duplicate multiplayer scenarios despite allPassed", () => {
    expect(validateReleaseReceipt("multiplayer", {
      ...fixture("multiplayer"), scenarios: Array(8).fill({ id: "SCENARIO_A", status: "PASS" }),
    }, context).status).not.toBe("PASS");
  });

  it("does not call a short smoke run an hour-long soak", () => {
    expect(validateReleaseReceipt("soak", {
      ...fixture("soak"), durationSeconds: 15,
    }, context).status).not.toBe("PASS");
  });

  it("rejects an exaggerated soak duration inconsistent with its timestamps", () => {
    expect(validateReleaseReceipt("soak", {
      ...fixture("soak"), durationSeconds: 7200,
    }, context).status).toBe("FAIL");
  });

  it("rejects a schema report that only proves connectivity", () => {
    expect(validateReleaseReceipt("schema", {
      ...fixture("schema"), checks: [{ name: "database reachable and answering queries", passed: true }],
    }, context).status).toBe("FAIL");
  });

  it("rejects an unavailable browser and false journey flags", () => {
    for (const browser of [
      { id: "safari", status: "NOT TESTED", flows: {} },
      { id: "safari", status: "PASS", flows: { chat: false } },
    ]) {
      const receipt = fixture("browserCompatibility");
      receipt.browsers = [browser];
      expect(validateReleaseReceipt("browserCompatibility", receipt, context).status).not.toBe("PASS");
    }
  });

  it.each([
    { endpoint: "https://different.example.com" },
    { migrations: [] },
    { checks: [{ name: "cloud-auth", passed: true }] },
    { status: "UNVERIFIED" },
  ])("rejects incomplete/mismatched hosted evidence %j", (patch) => {
    expect(validateReleaseReceipt("supabaseCloud", {
      ...fixture("supabaseCloud"), ...patch,
    }, context).status).not.toBe("PASS");
  });

  it("requires an explicitly selected staging endpoint", () => {
    expect(validateReleaseReceipt("supabaseCloud", fixture("supabaseCloud"), {
      ...context, stagingEndpoint: undefined,
    }).status).not.toBe("PASS");
  });
});

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

describe("release evidence files", () => {
  it("blocks missing, corrupt and prose-only reports without throwing or approving", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bhalyam-release-"));
    directories.push(root);
    fs.writeFileSync(path.join(root, "ACCESSIBILITY_REPORT.json"), "{broken");
    fs.writeFileSync(path.join(root, "MOBILE_LAYOUT_REPORT.json"), "{}");
    fs.writeFileSync(path.join(root, "MULTIPLAYER-RESILIENCE-REPORT.md"), "No failures were mentioned.");
    const results = evaluateReleaseEvidence(root, context);
    expect(Object.keys(results)).toHaveLength(8);
    for (const result of Object.values(results)) {
      expect(result.status).not.toBe("PASS");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});
