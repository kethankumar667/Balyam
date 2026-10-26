export const ROOT: string;
export const MEMBERS: string[];
export interface LocalFixture {
  url: string;
  tokens: string[];
  close(): Promise<void>;
  output(): string;
}
export function startReleaseFixture(options?: { paid?: boolean }): Promise<LocalFixture>;
export function readJson(url: string, options?: RequestInit): Promise<unknown>;
export function waitUntil<T>(probe: () => Promise<T | false>, description: string, timeout?: number): Promise<T>;
export function startReleaseFrontend(backendUrl: string): Promise<{ url: string; close(): Promise<void> }>;
