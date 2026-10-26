import type { EvidenceResult } from "./releaseEvidence.mjs";
export interface ReleaseReadinessReport {
  timestamp: string;
  gitCommit: string;
  certificationState: string;
  releaseApproved: boolean;
  stateCapped: boolean;
  stateCappingReason: string | null;
  domains: Record<string, EvidenceResult>;
  blockers: string[];
  advisories: string[];
  scope: string;
}
export function generateReleaseReadinessReport(): ReleaseReadinessReport;
