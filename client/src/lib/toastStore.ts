/**
 * Tiny in-house toast store — no third-party toast library. `useSyncExternalStore`
 * singleton, same shape as `FavouritesManager`/`RecentlyPlayedManager`: `getSnapshot`
 * returns a stable reference until the list actually changes, and every mutation
 * (`show`/`dismiss`) builds a NEW array so `Object.is` can tell the difference —
 * both halves are required or the toast stack either loops or goes stale.
 */

export type ToastType = "default" | "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** A toast with the same key is updated in place instead of stacking another. */
  key?: string;
  /** One button on the toast, e.g. "Join". */
  action?: ToastAction;
}

export interface ToastRecord {
  id: string;
  message: string;
  type: ToastType;
  key?: string;
  action?: ToastAction;
}

type Listener = () => void;

const DEFAULT_DURATION_MS = 3200;

class ToastStore {
  private toasts: ToastRecord[] = [];
  private listeners = new Set<Listener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ToastRecord[] => this.toasts;

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  show(
    message: string,
    type: ToastType = "default",
    duration: number = DEFAULT_DURATION_MS,
    options: ToastOptions = {},
  ): string {
    const existing = options.key ? this.toasts.find((t) => t.key === options.key) : undefined;
    const id = existing?.id ?? `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: ToastRecord = { id, message, type, key: options.key, action: options.action };

    this.toasts = existing
      ? this.toasts.map((t) => (t.id === id ? record : t))
      : [...this.toasts, record];
    this.notify();

    const running = this.timers.get(id);
    if (running) clearTimeout(running);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), duration),
    );
    return id;
  }

  /** True while a toast with this key is on screen. */
  isShowing = (key: string): boolean => this.toasts.some((t) => t.key === key);

  dismiss = (id: string): void => {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    if (!this.toasts.some((t) => t.id === id)) return;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  };
}

export const toastStore = new ToastStore();
