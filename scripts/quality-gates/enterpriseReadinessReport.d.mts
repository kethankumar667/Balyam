import type { ReleaseReadinessReport } from "./releaseReadinessReport.mjs";
export interface EnterpriseReadinessReport extends ReleaseReadinessReport {
  domainEvaluations: ReleaseReadinessReport["domains"];
  blockingDefects: string[];
  advisoryWarnings: string[];
  executionTimeMs: number;
}
export function generateEnterpriseReadinessReport(): EnterpriseReadinessReport;
