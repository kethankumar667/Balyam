/**
 * Service worker registration for the PWA shell.
 *
 * Registration only — the SW itself is a plain script at /public/sw.js so
 * it stays auditable and framework-free, and so it can be updated without
 * touching any React code.
 *
 * Deliberate choices:
 *   - Production only. In dev the SW would fight Vite's HMR: a cached
 *     stale module graph is the classic "my changes aren't showing up"
 *     trap. `import.meta.env.PROD` is statically replaced, so this whole
 *     branch drops out of the dev bundle.
 *   - Registered AFTER hydration would be fine, but idle-registration
 *     (`controllerchange` + load) is the standard pattern so first-visit
 *     bandwidth competes with the app, not with SW bookkeeping.
 *   - Failures are swallowed: an unregistered SW costs installability,
 *     but a thrown error in boot code costs the whole app.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Not worth a toast: installability silently degrades to a normal
        // website, which is what the app was before this file existed.
      });
  });
}
