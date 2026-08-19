/**
 * Client-Side Cleanup & Disposable Registry for BHALYAM.
 * Guarantees zero dangling event listeners, timers, RAFs, or observers across React unmounts.
 */

export type TeardownLogic =
  | (() => void)
  | { dispose: () => void }
  | { unsubscribe: () => void }
  | AbortController;

export class CleanupScope {
  private disposables: Set<() => void> = new Set();
  private isDisposed = false;

  constructor(public readonly name: string) {}

  /**
   * Registers generic teardown logic to be executed on disposal.
   */
  public register(teardown: TeardownLogic): () => void {
    if (this.isDisposed) {
      this.executeTeardown(teardown);
      return () => {};
    }

    const disposer = () => this.executeTeardown(teardown);
    this.disposables.add(disposer);

    return () => {
      this.disposables.delete(disposer);
    };
  }

  /**
   * Tracks and returns a managed setTimeout.
   */
  public setTimeout(handler: () => void, timeoutMs: number): any {
    if (this.isDisposed) return 0;
    const id = globalThis.setTimeout(() => {
      this.disposables.delete(disposer);
      handler();
    }, timeoutMs);

    const disposer = () => globalThis.clearTimeout(id);
    this.disposables.add(disposer);
    return id;
  }

  /**
   * Tracks and returns a managed setInterval.
   */
  public setInterval(handler: () => void, intervalMs: number): any {
    if (this.isDisposed) return 0;
    const id = globalThis.setInterval(handler, intervalMs);
    const disposer = () => globalThis.clearInterval(id);
    this.disposables.add(disposer);
    return id;
  }

  /**
   * Tracks and returns a managed requestAnimationFrame.
   */
  public requestAnimationFrame(callback: FrameRequestCallback): any {
    if (this.isDisposed) return 0;
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      const id = window.requestAnimationFrame((time) => {
        this.disposables.delete(disposer);
        callback(time);
      });

      const disposer = () => window.cancelAnimationFrame(id);
      this.disposables.add(disposer);
      return id;
    } else {
      const id = globalThis.setTimeout(() => {
        this.disposables.delete(disposer);
        callback(Date.now());
      }, 16);
      const disposer = () => globalThis.clearTimeout(id);
      this.disposables.add(disposer);
      return id;
    }
  }

  /**
   * Binds an event listener with automatic cleanup on disposal.
   */
  public addEventListener<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  public addEventListener<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void;
  public addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    if (this.isDisposed) return () => {};

    target.addEventListener(type, listener, options);
    const disposer = () => target.removeEventListener(type, listener, options);
    this.disposables.add(disposer);

    return () => {
      disposer();
      this.disposables.delete(disposer);
    };
  }

  /**
   * Executes all registered teardown logic safely with error isolation.
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    for (const disposer of this.disposables) {
      try {
        disposer();
      } catch (err) {
        console.warn(`[CleanupRegistry] Error in scope "${this.name}" disposer:`, err);
      }
    }
    this.disposables.clear();
  }

  public get size(): number {
    return this.disposables.size;
  }

  public get disposed(): boolean {
    return this.isDisposed;
  }

  private executeTeardown(teardown: TeardownLogic): void {
    try {
      if (typeof teardown === "function") {
        teardown();
      } else if ("dispose" in teardown && typeof teardown.dispose === "function") {
        teardown.dispose();
      } else if ("unsubscribe" in teardown && typeof teardown.unsubscribe === "function") {
        teardown.unsubscribe();
      } else if (teardown instanceof AbortController) {
        teardown.abort();
      }
    } catch (err) {
      console.warn(`[CleanupRegistry] Error executing teardown in "${this.name}":`, err);
    }
  }
}

/**
 * Global Cleanup Registry holding scoped lifecycles.
 */
export class ClientCleanupRegistry {
  private scopes: Map<string, CleanupScope> = new Map();

  public createScope(name: string): CleanupScope {
    const existing = this.scopes.get(name);
    if (existing && !existing.disposed) {
      existing.dispose();
    }

    const scope = new CleanupScope(name);
    this.scopes.set(name, scope);
    return scope;
  }

  public disposeScope(name: string): void {
    const scope = this.scopes.get(name);
    if (scope) {
      scope.dispose();
      this.scopes.delete(name);
    }
  }

  public disposeAll(): void {
    for (const scope of this.scopes.values()) {
      scope.dispose();
    }
    this.scopes.clear();
  }

  public getActiveScopeCount(): number {
    return this.scopes.size;
  }
}

export const cleanupRegistry = new ClientCleanupRegistry();
