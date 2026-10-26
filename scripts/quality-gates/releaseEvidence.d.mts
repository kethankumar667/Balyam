export type EvidenceKind = "persistence" | "schema" | "accessibility" | "mobile" |
  "multiplayer" | "soak" | "browserCompatibility" | "supabaseCloud";
export interface EvidenceContext {
  gitCommit: string;
  sourceClean: boolean;
  now: number;
  stagingEndpoint?: string;
  migrations: string[];
}
export interface EvidenceResult {
  status: "PASS" | "FAIL" | "UNVERIFIED";
  passed: boolean;
  message: string;
}
export interface EvidenceProvenance {
  schemaVersion: number;
  gitCommit: string;
  sourceClean: boolean;
  environment: string;
  startedAt: string;
  completedAt?: string;
}
export function captureEvidence(root: string, environment?: string): EvidenceProvenance;
export function completeEvidence(evidence: EvidenceProvenance, root: string): EvidenceProvenance;
export function validateReleaseReceipt(kind: EvidenceKind, receipt: unknown, context: EvidenceContext): EvidenceResult;
export function evaluateReleaseEvidence(root: string, context: EvidenceContext): Record<EvidenceKind, EvidenceResult>;
