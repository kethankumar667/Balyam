import { describe, it, expect, beforeEach, vi } from "vitest";
import { CleanupScope, ClientCleanupRegistry } from "../CleanupRegistry";

describe("CleanupRegistry & CleanupScope", () => {
  let registry: ClientCleanupRegistry;

  beforeEach(() => {
    registry = new ClientCleanupRegistry();
  });

  it("registers and executes function disposers upon dispose()", () => {
    const scope = registry.createScope("test_scope");
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    scope.register(fn1);
    scope.register(fn2);

    expect(scope.size).toBe(2);
    expect(scope.disposed).toBe(false);

    scope.dispose();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(scope.size).toBe(0);
    expect(scope.disposed).toBe(true);
  });

  it("handles AbortController, { dispose }, and { unsubscribe } objects", () => {
    const scope = registry.createScope("test_objects");
    const controller = new AbortController();
    const disposableObj = { dispose: vi.fn() };
    const subscriptionObj = { unsubscribe: vi.fn() };

    scope.register(controller);
    scope.register(disposableObj);
    scope.register(subscriptionObj);

    expect(controller.signal.aborted).toBe(false);

    scope.dispose();

    expect(controller.signal.aborted).toBe(true);
    expect(disposableObj.dispose).toHaveBeenCalledTimes(1);
    expect(subscriptionObj.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("clears tracked window timeouts and intervals on disposal", () => {
    vi.useFakeTimers();
    const scope = registry.createScope("timers");
    const timerFn = vi.fn();
    const intervalFn = vi.fn();

    scope.setTimeout(timerFn, 1000);
    scope.setInterval(intervalFn, 500);

    // Dispose before timer fires
    scope.dispose();

    vi.advanceTimersByTime(2000);

    expect(timerFn).not.toHaveBeenCalled();
    expect(intervalFn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("disposes all scopes cleanly in registry.disposeAll()", () => {
    const s1 = registry.createScope("s1");
    const s2 = registry.createScope("s2");
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    s1.register(fn1);
    s2.register(fn2);

    registry.disposeAll();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(registry.getActiveScopeCount()).toBe(0);
  });
});
