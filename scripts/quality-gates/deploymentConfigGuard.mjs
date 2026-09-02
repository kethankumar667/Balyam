/**
 * BHALYAM Deployment Configuration & Render Blueprint Guard
 *
 * Verifies repository-level production deployment contracts:
 * 1. render.yaml includes secure declarations for VOUCHER_HMAC_SECRET (sync: false)
 *    and VITE_PRIVACY_CONTACT_EMAIL (sync: false).
 * 2. Every route in the AUTHORITATIVE public route catalog (excluding root /) has an
 *    explicit Render rewrite rule, with the correct destination.
 * 3. Zero extra rewrites exist for routes the catalog does not declare.
 * 4. Specific route rewrites precede the SPA catch-all (/* -> /index.html), which
 *    must be the last rewrite.
 * 5. Zero duplicate rewrite sources exist in render.yaml.
 * 6. PrivacyPolicyPage imports PRIVACY_CONTACT_EMAIL from contact.ts and contains no
 *    hardcoded addresses.
 * 7. client/src/vite-env.d.ts declares typing for VITE_PRIVACY_CONTACT_EMAIL.
 * 8. Environment example files ACTIVELY declare every production-required variable —
 *    a commented-out line or a bare prose mention of the name does not count.
 * 9. Secret boundaries: no VITE_VOUCHER_HMAC_SECRET or VITE_SESSION_SECRET exists in
 *    client code or configuration.
 *
 * ── Route truth: one authoritative source ─────────────────────────────────
 * The public route catalog is read directly from `client/src/seo/metadata.ts`'s
 * `RAW_PUBLIC_ROUTES_METADATA` object — the same object `PUBLIC_ROUTES_METADATA` (and
 * therefore `PRERENDER_ROUTES`, and therefore the actual prerender build) is derived
 * from 1:1 (see that file's own `Object.fromEntries(Object.entries(...).map(...))`).
 * This guard does NOT read `client/scripts/prerender.mjs` at all — there is nothing
 * there to read; prerender.mjs no longer carries its own route list (see its own
 * header). One object, in one file, is the entire route-truth surface every other
 * piece of route validation in this repository ultimately traces back to.
 *
 * Usage: node scripts/quality-gates/deploymentConfigGuard.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const RENDER_YAML = path.join(ROOT_DIR, "render.yaml");
const METADATA_SOURCE = path.join(ROOT_DIR, "client/src/seo/metadata.ts");
const VITE_ENV = path.join(ROOT_DIR, "client/src/vite-env.d.ts");
const PRIVACY_PAGE = path.join(ROOT_DIR, "client/src/pages/PrivacyPolicyPage.tsx");
const CLIENT_ENV_EXAMPLE = path.join(ROOT_DIR, "client/.env.example");
const SERVER_ENV_EXAMPLE = path.join(ROOT_DIR, "server/.env.example");

/**
 * Extract the authoritative public route list directly from the source object
 * literal — no build step, no compiled artifact, required. A top-level string
 * key (`"/something": {`) inside the `RAW_PUBLIC_ROUTES_METADATA` block is a route;
 * anything outside that block (helper objects, `GAME_SOCIAL_METADATA`, etc.) is not.
 */
export function extractAuthoritativeRoutes(metadataSource) {
  const startMarker = "const RAW_PUBLIC_ROUTES_METADATA";
  const start = metadataSource.indexOf(startMarker);
  if (start === -1) return null;

  const endMarker = "export const PUBLIC_ROUTES_METADATA";
  const end = metadataSource.indexOf(endMarker, start);
  if (end === -1) return null;

  const section = metadataSource.slice(start, end);
  const matches = [...section.matchAll(/^\s*"(\/[^"]*)":\s*\{/gm)];
  return matches.map((m) => m[1]);
}

/** Every `- type: rewrite` block's source/destination pair, in file order. */
export function extractRewrites(renderYamlContent) {
  const matches = [
    ...renderYamlContent.matchAll(
      /-\s*type:\s*rewrite[\r\n\s]+source:\s*([^\r\n]+)[\r\n\s]+destination:\s*([^\r\n]+)/g,
    ),
  ];
  return matches.map((m) => ({ source: m[1].trim(), destination: m[2].trim() }));
}

/**
 * Is `varName` ACTIVELY declared — a real, uncommented `VAR=...` line — in this
 * env-example file? A commented-out example (`# VAR=...`) or a bare prose mention
 * of the name (inside a comment sentence, or as a substring of another key) must
 * NOT satisfy this. Anchored to start-of-line (optional leading whitespace only,
 * no `#`) so `# SUPABASE_SERVICE_ROLE_KEY=...` and `# see SUPABASE_SERVICE_ROLE_KEY
 * above` both correctly fail this check.
 */
export function isActivelyDeclared(envContent, varName) {
  const re = new RegExp(`^[ \\t]*${varName}=`, "m");
  return re.test(envContent);
}

/** Is `varName` mentioned anywhere at all — active OR as a commented example? */
export function isDocumented(envContent, varName) {
  const re = new RegExp(`^[ \\t]*#?[ \\t]*${varName}=`, "m");
  return re.test(envContent);
}

export function runDeploymentConfigGuard() {
  const issues = [];

  console.log("🛡️  [DeploymentConfigGuard] Auditing repository deployment configuration...");

  // ── 1. Inspect render.yaml ───────────────────────────────────────────────
  if (!fs.existsSync(RENDER_YAML)) {
    issues.push("render.yaml is missing from repository root.");
    return { ok: false, issues };
  }
  const renderContent = fs.readFileSync(RENDER_YAML, "utf8");

  // Verify backend VOUCHER_HMAC_SECRET
  const backendMatch = renderContent.match(/name:\s*bhalyam-backend[\s\S]*?(?=name:\s*bhalyam-frontend|$)/);
  if (!backendMatch) {
    issues.push("bhalyam-backend service definition not found in render.yaml.");
  } else {
    const backendSection = backendMatch[0];
    if (!backendSection.includes("key: VOUCHER_HMAC_SECRET")) {
      issues.push("bhalyam-backend missing VOUCHER_HMAC_SECRET declaration in render.yaml.");
    } else if (!/key:\s*VOUCHER_HMAC_SECRET[\r\n\s]+sync:\s*false/.test(backendSection)) {
      issues.push("VOUCHER_HMAC_SECRET must use 'sync: false' in render.yaml.");
    }
  }

  // Verify frontend VITE_PRIVACY_CONTACT_EMAIL
  const frontendMatch = renderContent.match(/name:\s*bhalyam-frontend[\s\S]*$/);
  if (!frontendMatch) {
    issues.push("bhalyam-frontend service definition not found in render.yaml.");
  } else {
    const frontendSection = frontendMatch[0];
    if (!frontendSection.includes("key: VITE_PRIVACY_CONTACT_EMAIL")) {
      issues.push("bhalyam-frontend missing VITE_PRIVACY_CONTACT_EMAIL declaration in render.yaml.");
    } else if (!/key:\s*VITE_PRIVACY_CONTACT_EMAIL[\r\n\s]+sync:\s*false/.test(frontendSection)) {
      issues.push("VITE_PRIVACY_CONTACT_EMAIL must use 'sync: false' in render.yaml.");
    }
  }

  // ── 2. Route Rewrites vs the Authoritative Route Catalog ─────────────────
  if (!fs.existsSync(METADATA_SOURCE)) {
    issues.push(`Authoritative route catalog source not found: ${METADATA_SOURCE}`);
  } else {
    const metadataContent = fs.readFileSync(METADATA_SOURCE, "utf8");
    const authoritativeRoutes = extractAuthoritativeRoutes(metadataContent);

    if (!authoritativeRoutes || authoritativeRoutes.length === 0) {
      issues.push(
        "Could not extract RAW_PUBLIC_ROUTES_METADATA from client/src/seo/metadata.ts — the " +
          "authoritative route catalog is unreadable. Refusing to validate against an empty set.",
      );
    } else {
      const rewrites = extractRewrites(renderContent);
      const rewriteSources = rewrites.map((r) => r.source);

      // Duplicate rewrite sources
      const seenSources = new Set();
      for (const src of rewriteSources) {
        if (seenSources.has(src)) {
          issues.push(`Duplicate rewrite source in render.yaml: "${src}"`);
        }
        seenSources.add(src);
      }

      // SPA catch-all placement
      const catchAllIndex = rewrites.findIndex((r) => r.source === "/*");
      if (catchAllIndex === -1) {
        issues.push("Missing SPA catch-all rewrite (/* -> /index.html) in render.yaml.");
      } else if (catchAllIndex !== rewrites.length - 1) {
        issues.push("SPA catch-all rewrite (/*) must be the LAST rewrite in render.yaml.");
      }

      // Every non-root authoritative route must have a correctly-destined rewrite
      const nonRootAuthoritative = authoritativeRoutes.filter((r) => r !== "/");
      for (const route of nonRootAuthoritative) {
        const expectedDest = `${route}/index.html`;
        const match = rewrites.find((r) => r.source === route);
        if (!match) {
          issues.push(`Authoritative public route "${route}" has no rewrite rule in render.yaml.`);
        } else if (match.destination !== expectedDest) {
          issues.push(`Route "${route}" maps to "${match.destination}", expected "${expectedDest}".`);
        }
      }

      // Every specific (non-catch-all) rewrite must correspond to a real
      // authoritative route — an orphaned rewrite for a route the catalog no
      // longer declares is exactly the "extra rewrite" drift this guard exists
      // to catch, in the opposite direction from a missing one.
      const authoritativeSet = new Set(nonRootAuthoritative);
      for (const r of rewrites) {
        if (r.source === "/*") continue;
        if (!authoritativeSet.has(r.source)) {
          issues.push(
            `render.yaml rewrite "${r.source}" does not correspond to any route in the ` +
              "authoritative public route catalog (client/src/seo/metadata.ts).",
          );
        }
      }
    }
  }

  // ── 3. Typings: ImportMetaEnv ────────────────────────────────────────────
  const viteEnvContent = fs.readFileSync(VITE_ENV, "utf8");
  if (!viteEnvContent.includes("VITE_PRIVACY_CONTACT_EMAIL")) {
    issues.push("client/src/vite-env.d.ts is missing VITE_PRIVACY_CONTACT_EMAIL typing.");
  }

  // ── 4. Privacy Contact Source of Truth ───────────────────────────────────
  const privacyContent = fs.readFileSync(PRIVACY_PAGE, "utf8");
  if (!privacyContent.includes("PRIVACY_CONTACT_EMAIL")) {
    issues.push("PrivacyPolicyPage.tsx does not import or use PRIVACY_CONTACT_EMAIL.");
  }
  if (privacyContent.includes("privacy@bhalyam.com")) {
    issues.push("PrivacyPolicyPage.tsx contains hardcoded email address 'privacy@bhalyam.com'.");
  }

  // ── 5. Environment Example Documentation ─────────────────────────────────
  const clientEnv = fs.readFileSync(CLIENT_ENV_EXAMPLE, "utf8");
  const serverEnv = fs.readFileSync(SERVER_ENV_EXAMPLE, "utf8");

  // Must be an ACTIVE, uncommented declaration — these are required for a
  // production boot (or, for VITE_SERVER_URL, required for the app to reach
  // its backend at all), so a commented-out example does not satisfy them.
  const requiredActiveClientVars = ["VITE_SERVER_URL", "VITE_PRIVACY_CONTACT_EMAIL"];
  for (const v of requiredActiveClientVars) {
    if (!isActivelyDeclared(clientEnv, v)) {
      issues.push(
        `client/.env.example does not actively declare "${v}" (found only as a comment, or not ` +
          "at all — a commented-out example does not count as documentation of a required variable).",
      );
    }
  }

  const requiredActiveServerVars = [
    "NODE_ENV",
    "PORT",
    "CLIENT_ORIGIN",
    "OPERATIONAL_SECRET",
    "SESSION_SECRET",
    "VOUCHER_HMAC_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const v of requiredActiveServerVars) {
    if (!isActivelyDeclared(serverEnv, v)) {
      issues.push(
        `server/.env.example does not actively declare "${v}" (found only as a comment, or not ` +
          "at all — a commented-out example does not count as documentation of a required variable).",
      );
    }
  }

  // Genuinely optional in every environment — a commented example is the
  // correct, intended documentation shape for these, so only presence
  // (active OR commented) is required.
  const documentedOptionalServerVars = [
    "SUPABASE_JWT_SECRET",
    "SUPABASE_ANON_KEY",
    "ADMIN_USER_IDS",
    "TURN_URLS",
    "TURN_SECRET",
    "TURN_USERNAME",
    "TURN_PASSWORD",
    "TURN_TTL_SECONDS",
  ];
  for (const v of documentedOptionalServerVars) {
    if (!isDocumented(serverEnv, v)) {
      issues.push(`server/.env.example is missing any documentation for "${v}".`);
    }
  }

  // ── 6. Secret Boundaries ─────────────────────────────────────────────────
  if (
    clientEnv.includes("VITE_VOUCHER_HMAC_SECRET") ||
    clientEnv.includes("VITE_SESSION_SECRET") ||
    renderContent.includes("VITE_VOUCHER_HMAC_SECRET") ||
    renderContent.includes("VITE_SESSION_SECRET")
  ) {
    issues.push("Prohibited client-side secret variable (VITE_VOUCHER_HMAC_SECRET / VITE_SESSION_SECRET) detected.");
  }

  return { ok: issues.length === 0, issues };
}

// Direct CLI invocation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { ok, issues } = runDeploymentConfigGuard();
  if (ok) {
    console.log("✅ [DeploymentConfigGuard] All production configuration contracts verified!");
    process.exit(0);
  } else {
    console.error(`❌ [DeploymentConfigGuard] Found ${issues.length} configuration defect(s):`);
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }
}
