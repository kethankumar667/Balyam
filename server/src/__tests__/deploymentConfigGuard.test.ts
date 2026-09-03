import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
// deploymentConfigGuard.mjs is a plain Node script (deliberately no build
// step of its own — see its header); its sibling deploymentConfigGuard.d.ts
// gives TS real, non-`any` types for these exports.
import {
  extractAuthoritativeRoutes,
  extractRewrites,
  isActivelyDeclared,
  isDocumented,
  auditSupabaseClientConfig,
  runDeploymentConfigGuard,
} from "../../../scripts/quality-gates/deploymentConfigGuard.mjs";

/**
 * Deployment guard integrity — negative-case coverage.
 *
 * `scripts/quality-gates/deploymentConfigGuard.mjs` has no automated coverage of
 * its own (a P3 finding from the 2026-09-03 combined configuration audit). This
 * file closes that gap two ways:
 *
 *  - Unit tests against the guard's exported pure helpers
 *    (`extractAuthoritativeRoutes`/`extractRewrites`/`isActivelyDeclared`/
 *    `isDocumented`) using synthetic in-memory fixtures — fast, and exercises the
 *    exact detection logic without touching any real file.
 *  - A handful of true end-to-end runs of `runDeploymentConfigGuard()` against an
 *    isolated OS-temp copy of the real repository files (never the tracked
 *    render.yaml/.env.example) — proves the whole pipeline wires together, the
 *    same way the manual scratchpad drill in that audit did, now permanent.
 *
 * The real `render.yaml`/`.env.example` files are read-only inputs here; this
 * suite copies them into `os.tmpdir()`, mutates only the copies, and deletes the
 * temp directory afterward. Nothing under version control is ever written to.
 */

const ROOT_DIR = path.resolve(__dirname, "../../..");

describe("extractAuthoritativeRoutes", () => {
  const fixture = `
const RAW_PUBLIC_ROUTES_METADATA: Record<string, RouteMetadata> = {
  "/": { path: "/" },
  "/games": { path: "/games" },
  "/about": { path: "/about" },
};

export const PUBLIC_ROUTES_METADATA = Object.fromEntries(
  Object.entries(RAW_PUBLIC_ROUTES_METADATA).map(([key, meta]) => [key, meta]),
);
`;

  it("extracts every route key inside the RAW block", () => {
    expect(extractAuthoritativeRoutes(fixture)).toEqual(["/", "/games", "/about"]);
  });

  it("returns null when the RAW block marker is absent (metadata route added without a catalog entry is not this — this is a malformed-file guard)", () => {
    expect(extractAuthoritativeRoutes("export const somethingElse = {};")).toBeNull();
  });

  it("does not pick up keys declared after the RAW block ends", () => {
    const withTrailing = fixture + `\nexport const OTHER = { "/not-a-route": {} };\n`;
    expect(extractAuthoritativeRoutes(withTrailing)).toEqual(["/", "/games", "/about"]);
  });
});

describe("extractRewrites", () => {
  it("parses source/destination pairs in file order", () => {
    const yaml = `
      - type: rewrite
        source: /games
        destination: /games/index.html
      - type: rewrite
        source: /*
        destination: /index.html
`;
    expect(extractRewrites(yaml)).toEqual([
      { source: "/games", destination: "/games/index.html" },
      { source: "/*", destination: "/index.html" },
    ]);
  });

  it("Case: duplicate rewrite — appears twice in the extracted list, not deduplicated away", () => {
    const yaml = `
      - type: rewrite
        source: /social
        destination: /social/index.html
      - type: rewrite
        source: /social
        destination: /social/index.html
`;
    const rewrites = extractRewrites(yaml);
    expect(rewrites.filter((r) => r.source === "/social")).toHaveLength(2);
  });
});

describe("Case: missing prerender rewrite", () => {
  it("an authoritative route absent from the rewrite list is detectable by set difference", () => {
    const authoritative = ["/", "/games", "/social"];
    const rewrites = extractRewrites(`
      - type: rewrite
        source: /games
        destination: /games/index.html
`);
    const missing = authoritative.filter((r) => r !== "/" && !rewrites.some((rw) => rw.source === r));
    expect(missing).toEqual(["/social"]);
  });
});

describe("Case: extra prerender rewrite (route removed from the catalog, rewrite left behind)", () => {
  it("a rewrite with no matching authoritative route is detectable by set difference", () => {
    const authoritative = new Set(["/games"]);
    const rewrites = extractRewrites(`
      - type: rewrite
        source: /games
        destination: /games/index.html
      - type: rewrite
        source: /retired-route
        destination: /retired-route/index.html
`);
    const orphaned = rewrites.filter((r) => r.source !== "/*" && !authoritative.has(r.source));
    expect(orphaned).toEqual([{ source: "/retired-route", destination: "/retired-route/index.html" }]);
  });
});

describe("Case: wrong destination", () => {
  it("a rewrite destination that does not match <route>/index.html is detectable", () => {
    const rewrites = extractRewrites(`
      - type: rewrite
        source: /games
        destination: /wrong-path.html
`);
    const route = "/games";
    const match = rewrites.find((r) => r.source === route)!;
    expect(match.destination).not.toBe(`${route}/index.html`);
  });
});

describe("Case: catch-all before a specific route", () => {
  it("the catch-all is detectable as not being the last rewrite", () => {
    const rewrites = extractRewrites(`
      - type: rewrite
        source: /*
        destination: /index.html
      - type: rewrite
        source: /games
        destination: /games/index.html
`);
    const catchAllIndex = rewrites.findIndex((r) => r.source === "/*");
    expect(catchAllIndex).not.toBe(rewrites.length - 1);
  });
});

describe("Case: incorrect root handling", () => {
  it("root ('/') must never be required to have its own explicit rewrite", () => {
    const authoritative = ["/", "/games"];
    const rewrites = extractRewrites(`
      - type: rewrite
        source: /games
        destination: /games/index.html
`);
    const nonRoot = authoritative.filter((r) => r !== "/");
    const missing = nonRoot.filter((r) => !rewrites.some((rw) => rw.source === r));
    // "/" itself was correctly excluded from the requirement, so nothing is missing here.
    expect(missing).toEqual([]);
  });
});

describe("isActivelyDeclared / isDocumented — active vs. commented vs. comment-only", () => {
  it("Case: comment-only environment variable mention does not count as an active declaration", () => {
    const env = "# See SUPABASE_SERVICE_ROLE_KEY in the Render dashboard for the real value.\n";
    expect(isActivelyDeclared(env, "SUPABASE_SERVICE_ROLE_KEY")).toBe(false);
  });

  it("a commented-out example line does not count as an active declaration either", () => {
    const env = "# SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key\n";
    expect(isActivelyDeclared(env, "SUPABASE_SERVICE_ROLE_KEY")).toBe(false);
    // But it DOES satisfy "documented somewhere" — the correct shape for a
    // genuinely optional variable like a TURN credential.
    expect(isDocumented(env, "SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
  });

  it("a real, uncommented declaration counts as active", () => {
    const env = "SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key\n";
    expect(isActivelyDeclared(env, "SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
  });

  it("does not false-positive on a variable name that is a substring of another key", () => {
    const env = "VITE_SUPABASE_SERVICE_ROLE_KEY_LEGACY=whatever\n";
    expect(isActivelyDeclared(env, "SUPABASE_SERVICE_ROLE_KEY")).toBe(false);
  });
});

describe("auditSupabaseClientConfig — pure validation", () => {
  const validRenderSectionAnon = `
    name: bhalyam-frontend
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
  `;

  const validRenderSectionPublishable = `
    name: bhalyam-frontend
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_PUBLISHABLE_KEY
        sync: false
  `;

  const validClientEnvAnon = `
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=anon-key
  `;

  const validClientEnvPublishable = `
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=publishable-key
  `;

  it("passes when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present and sync: false", () => {
    const issues = auditSupabaseClientConfig({
      renderFrontendSection: validRenderSectionAnon,
      clientEnvContent: validClientEnvAnon,
    });
    expect(issues).toEqual([]);
  });

  it("passes when VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are present and sync: false", () => {
    const issues = auditSupabaseClientConfig({
      renderFrontendSection: validRenderSectionPublishable,
      clientEnvContent: validClientEnvPublishable,
    });
    expect(issues).toEqual([]);
  });

  it("fails when Supabase URL is missing in render.yaml", () => {
    const section = `
      name: bhalyam-frontend
      envVars:
        - key: VITE_SUPABASE_ANON_KEY
          sync: false
    `;
    const issues = auditSupabaseClientConfig({ renderFrontendSection: section });
    expect(issues).toContain("bhalyam-frontend missing VITE_SUPABASE_URL declaration in render.yaml.");
  });

  it("fails when VITE_SUPABASE_URL is not sync: false in render.yaml", () => {
    const section = `
      name: bhalyam-frontend
      envVars:
        - key: VITE_SUPABASE_URL
          sync: true
        - key: VITE_SUPABASE_ANON_KEY
          sync: false
    `;
    const issues = auditSupabaseClientConfig({ renderFrontendSection: section });
    expect(issues).toContain("VITE_SUPABASE_URL must use 'sync: false' in render.yaml.");
  });

  it("fails when both supported public keys are missing in render.yaml", () => {
    const section = `
      name: bhalyam-frontend
      envVars:
        - key: VITE_SUPABASE_URL
          sync: false
    `;
    const issues = auditSupabaseClientConfig({ renderFrontendSection: section });
    expect(issues.some((i) => i.includes("missing Supabase public key declaration"))).toBe(true);
  });

  it("fails when only public key exists without URL in render.yaml", () => {
    const section = `
      name: bhalyam-frontend
      envVars:
        - key: VITE_SUPABASE_ANON_KEY
          sync: false
    `;
    const issues = auditSupabaseClientConfig({ renderFrontendSection: section });
    expect(issues).toContain("bhalyam-frontend missing VITE_SUPABASE_URL declaration in render.yaml.");
    expect(issues.filter((i) => i.includes("missing Supabase public key declaration"))).toHaveLength(0);
  });

  it("fails when URL exists without either public key in render.yaml", () => {
    const section = `
      name: bhalyam-frontend
      envVars:
        - key: VITE_SUPABASE_URL
          sync: false
    `;
    const issues = auditSupabaseClientConfig({ renderFrontendSection: section });
    expect(issues.some((i) => i.includes("missing Supabase public key declaration"))).toBe(true);
  });

  it("fails when variables are mentioned only in comments in client/.env.example", () => {
    const commentedEnv = `
# VITE_SUPABASE_URL=https://project.supabase.co
# VITE_SUPABASE_ANON_KEY=anon-key
    `;
    const issues = auditSupabaseClientConfig({ clientEnvContent: commentedEnv });
    expect(issues.some((i) => i.includes('does not actively declare "VITE_SUPABASE_URL"'))).toBe(true);
    expect(issues.some((i) => i.includes("does not actively declare a Supabase public key"))).toBe(true);
  });
});

describe("runDeploymentConfigGuard — end to end against the real repository", () => {
  it("passes cleanly against the current committed configuration", () => {
    const { ok, issues } = runDeploymentConfigGuard();
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe("runDeploymentConfigGuard — end to end against an isolated temp copy", () => {
  let tmpRoot: string;

  function copyFixtures(): void {
    fs.mkdirSync(path.join(tmpRoot, "scripts/quality-gates"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "client/src/pages"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "client/src/seo"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "server"), { recursive: true });
    fs.copyFileSync(
      path.join(ROOT_DIR, "scripts/quality-gates/deploymentConfigGuard.mjs"),
      path.join(tmpRoot, "scripts/quality-gates/deploymentConfigGuard.mjs"),
    );
    fs.copyFileSync(path.join(ROOT_DIR, "render.yaml"), path.join(tmpRoot, "render.yaml"));
    fs.copyFileSync(
      path.join(ROOT_DIR, "client/src/seo/metadata.ts"),
      path.join(tmpRoot, "client/src/seo/metadata.ts"),
    );
    fs.copyFileSync(path.join(ROOT_DIR, "client/src/vite-env.d.ts"), path.join(tmpRoot, "client/src/vite-env.d.ts"));
    fs.copyFileSync(
      path.join(ROOT_DIR, "client/src/pages/PrivacyPolicyPage.tsx"),
      path.join(tmpRoot, "client/src/pages/PrivacyPolicyPage.tsx"),
    );
    fs.copyFileSync(path.join(ROOT_DIR, "client/.env.example"), path.join(tmpRoot, "client/.env.example"));
    fs.copyFileSync(path.join(ROOT_DIR, "server/.env.example"), path.join(tmpRoot, "server/.env.example"));
  }

  function runGuardInTmp(): { code: number | null; stdout: string; stderr: string } {
    const result = spawnSync(process.execPath, [path.join(tmpRoot, "scripts/quality-gates/deploymentConfigGuard.mjs")], {
      encoding: "utf8",
    });
    return { code: result.status, stdout: result.stdout, stderr: result.stderr };
  }

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bhalyam-guard-test-"));
    copyFixtures();
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("baseline: the untouched temp copy passes exactly like the real repository", () => {
    const { code } = runGuardInTmp();
    expect(code).toBe(0);
  });

  it("Case: missing voucher-secret declaration fails closed", () => {
    const renderPath = path.join(tmpRoot, "render.yaml");
    const original = fs.readFileSync(renderPath, "utf8");
    const mutated = original.replace(/\s*- key: VOUCHER_HMAC_SECRET\r?\n\s*sync: false[^\r\n]*\r?\n/, "\n");
    expect(mutated).not.toBe(original);
    fs.writeFileSync(renderPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/VOUCHER_HMAC_SECRET/);

    fs.writeFileSync(renderPath, original);
  });

  it("Case: voucher-secret declaration without sync: false fails closed", () => {
    const renderPath = path.join(tmpRoot, "render.yaml");
    const original = fs.readFileSync(renderPath, "utf8");
    const mutated = original.replace(
      /- key: VOUCHER_HMAC_SECRET\r?\n(\s*)sync: false[^\r\n]*/,
      "- key: VOUCHER_HMAC_SECRET\n$1sync: true",
    );
    expect(mutated).not.toBe(original);
    fs.writeFileSync(renderPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/sync: false/);

    fs.writeFileSync(renderPath, original);
  });

  it("Case: missing privacy-contact declaration fails closed", () => {
    const renderPath = path.join(tmpRoot, "render.yaml");
    const original = fs.readFileSync(renderPath, "utf8");
    const mutated = original.replace(/\s*- key: VITE_PRIVACY_CONTACT_EMAIL\r?\n\s*sync: false[^\r\n]*\r?\n?/, "\n");
    expect(mutated).not.toBe(original);
    fs.writeFileSync(renderPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/VITE_PRIVACY_CONTACT_EMAIL/);

    fs.writeFileSync(renderPath, original);
  });

  it("Case: a route added to the metadata catalog without a matching Render rewrite fails closed", () => {
    const metadataPath = path.join(tmpRoot, "client/src/seo/metadata.ts");
    const original = fs.readFileSync(metadataPath, "utf8");
    const mutated = original.replace(
      "const RAW_PUBLIC_ROUTES_METADATA: Record<string, RouteMetadata> = {",
      'const RAW_PUBLIC_ROUTES_METADATA: Record<string, RouteMetadata> = {\n  "/brand-new-route-with-no-rewrite": { path: "/brand-new-route-with-no-rewrite" },',
    );
    expect(mutated).not.toBe(original);
    fs.writeFileSync(metadataPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/brand-new-route-with-no-rewrite/);

    fs.writeFileSync(metadataPath, original);
  });

  it("Case: missing VITE_SUPABASE_URL in render.yaml fails closed", () => {
    const renderPath = path.join(tmpRoot, "render.yaml");
    const original = fs.readFileSync(renderPath, "utf8");
    const mutated = original.replace(/\s*- key: VITE_SUPABASE_URL\r?\n\s*sync: false[^\r\n]*\r?\n?/, "\n");
    expect(mutated).not.toBe(original);
    fs.writeFileSync(renderPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/VITE_SUPABASE_URL/);

    fs.writeFileSync(renderPath, original);
  });

  it("Case: missing both Supabase public keys in render.yaml fails closed", () => {
    const renderPath = path.join(tmpRoot, "render.yaml");
    const original = fs.readFileSync(renderPath, "utf8");
    const mutated = original.replace(/\s*- key: VITE_SUPABASE_ANON_KEY\r?\n\s*sync: false[^\r\n]*\r?\n?/, "\n");
    expect(mutated).not.toBe(original);
    fs.writeFileSync(renderPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/Supabase public key/);

    fs.writeFileSync(renderPath, original);
  });

  it("Case: client/.env.example with commented-out Supabase keys fails closed", () => {
    const envPath = path.join(tmpRoot, "client/.env.example");
    const original = fs.readFileSync(envPath, "utf8");
    const mutated = original.replace(
      /^VITE_SUPABASE_URL=/m,
      "# VITE_SUPABASE_URL=",
    );
    expect(mutated).not.toBe(original);
    fs.writeFileSync(envPath, mutated);

    const { code, stderr } = runGuardInTmp();
    expect(code).toBe(1);
    expect(stderr).toMatch(/VITE_SUPABASE_URL/);

    fs.writeFileSync(envPath, original);
  });

  it("restored: the temp copy passes again after every mutation is reverted", () => {
    const { code } = runGuardInTmp();
    expect(code).toBe(0);
  });
});
