/**
 * Compatibility entry point. Both commands use the same evidence policy so
 * the enterprise report cannot bypass a blocked release gate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateReleaseReadinessReport } from "./releaseReadinessReport.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function generateEnterpriseReadinessReport() {
  const started = Date.now();
  const release = generateReleaseReadinessReport();
  const report = {
    ...release,
    domainEvaluations: release.domains,
    blockingDefects: release.blockers,
    advisoryWarnings: release.advisories,
    executionTimeMs: Date.now() - started,
  };
  fs.writeFileSync(path.join(ROOT, "ENTERPRISE_READINESS_REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = generateEnterpriseReadinessReport().releaseApproved ? 0 : 1;
}
