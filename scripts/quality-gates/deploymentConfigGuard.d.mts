export interface RewriteEntry {
  source: string;
  destination: string;
}

export interface GuardResult {
  ok: boolean;
  issues: string[];
}

export function extractAuthoritativeRoutes(metadataSource: string): string[] | null;
export function extractRewrites(renderYamlContent: string): RewriteEntry[];
export function isActivelyDeclared(envContent: string, varName: string): boolean;
export function isDocumented(envContent: string, varName: string): boolean;
export function auditSupabaseClientConfig(params: {
  renderFrontendSection?: string;
  clientEnvContent?: string;
}): string[];
export function runDeploymentConfigGuard(): GuardResult;
