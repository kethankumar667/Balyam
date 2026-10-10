/**
 * How many particles a celebration should use on THIS device.
 *
 * Most of the audience is on budget Android phones, where 40 animated coins can drop frames, and a
 * celebration that stutters is worse than a lighter one. The browser offers coarse hints about a weak
 * device (few CPU cores, little memory, the data-saver switch), and any one of them is enough to halve
 * the count. Nothing is sent anywhere and nothing is stored: the hints are read from `navigator` and
 * used for this one decision, and a browser that reports none of them gets the full effect.
 */

export const LOW_END_PARTICLE_SCALE = 0.5;
/** Never fewer than this, so a lighter celebration still reads as one. */
const MIN_PARTICLES = 8;

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function isLowEndDevice(nav: NavigatorHints | undefined = typeof navigator === "undefined" ? undefined : (navigator as NavigatorHints)): boolean {
  if (!nav) return false;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true;
  if (nav.connection?.saveData === true) return true;
  return false;
}

/** The particle count to actually use, given the count meant for a capable device. */
export function scaledCount(full: number, nav?: NavigatorHints): number {
  if (!isLowEndDevice(nav)) return full;
  return Math.max(MIN_PARTICLES, Math.round(full * LOW_END_PARTICLE_SCALE));
}
