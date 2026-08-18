import { cleanupRegistry, type CleanupScope } from "./CleanupRegistry";
import { clientResourceTracker } from "./ResourceTracker";

export interface ViewportSnapshot {
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  devicePixelRatio: number;
  isVisible: boolean;
}

type ViewportListener = (snapshot: ViewportSnapshot) => void;

/**
 * High-performance, leak-safe Viewport and Visibility Monitor.
 */
export class ViewportMonitor {
  private listeners: Set<ViewportListener> = new Set();
  private scope: CleanupScope | null = null;
  private currentSnapshot: ViewportSnapshot;

  constructor() {
    this.currentSnapshot = this.readSnapshot();
  }

  public start(): void {
    if (this.scope) return;
    this.scope = cleanupRegistry.createScope("ViewportMonitor");

    if (typeof window !== "undefined") {
      const onResize = () => this.handleUpdate();
      const onVisibility = () => this.handleUpdate();

      this.scope.addEventListener(window, "resize", onResize, { passive: true });
      this.scope.addEventListener(window, "orientationchange", onResize, { passive: true });
      if (typeof document !== "undefined") {
        this.scope.addEventListener(document, "visibilitychange", onVisibility, { passive: true });
      }

      clientResourceTracker.register("observer", "viewport_monitor", "window_viewport");
    }
  }

  public stop(): void {
    if (this.scope) {
      this.scope.dispose();
      this.scope = null;
      clientResourceTracker.unregister("observer", "viewport_monitor");
    }
    this.listeners.clear();
  }

  public getSnapshot(): ViewportSnapshot {
    return this.currentSnapshot;
  }

  public subscribe(listener: ViewportListener): () => void {
    this.listeners.add(listener);
    listener(this.currentSnapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private readSnapshot(): ViewportSnapshot {
    if (typeof window === "undefined") {
      return {
        width: 1024,
        height: 768,
        isPortrait: false,
        isLandscape: true,
        devicePixelRatio: 1,
        isVisible: true,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;

    return {
      width,
      height,
      isPortrait,
      isLandscape: !isPortrait,
      devicePixelRatio: window.devicePixelRatio || 1,
      isVisible: typeof document !== "undefined" ? document.visibilityState === "visible" : true,
    };
  }

  private handleUpdate(): void {
    this.currentSnapshot = this.readSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(this.currentSnapshot);
      } catch (err) {
        console.warn("[ViewportMonitor] listener error:", err);
      }
    }
  }
}

export const viewportMonitor = new ViewportMonitor();
