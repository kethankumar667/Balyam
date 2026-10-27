import type { LudoColor, LudoToken } from "@shared/types";

/** Track positions are global; home lanes belong to an arm, not its cosmetic colour. */
export function stackKeyOf(token: LudoToken, arm: LudoColor): string | null {
  if (token.state === "track" && token.trackPos != null) return `t:${token.trackPos}`;
  if (token.state === "stretch" && token.stretchPos != null) return `s:${arm}:${token.stretchPos}`;
  return null;
}

export function indexTokenStacks(
  entries: readonly { pid: string; token: LudoToken }[],
  arms: Record<string, LudoColor>,
): Map<string, string[]> {
  const byCell = new Map<string, string[]>();
  for (const { pid, token } of entries) {
    const key = stackKeyOf(token, arms[pid] ?? "red");
    if (!key) continue;
    const group = byCell.get(key);
    if (group) group.push(token.id);
    else byCell.set(key, [token.id]);
  }
  for (const group of byCell.values()) group.sort();
  return byCell;
}
