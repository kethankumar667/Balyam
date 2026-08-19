import type { EventName, EventPayloadMap } from "@shared/events";
import { telemetry } from "./observability";
import { isFeatureEnabled } from "./featureFlags";

export type EventCallback<E extends EventName> = (payload: EventPayloadMap[E]) => void;

class TypedEventBus {
  private subscribers: Map<EventName, Set<EventCallback<any>>> = new Map();

  /**
   * Publishes a typed event to all registered listeners.
   */
  publish<E extends EventName>(event: E, payload: Omit<EventPayloadMap[E], "timestamp">): void {
    const fullPayload = {
      ...payload,
      timestamp: Date.now(),
    } as EventPayloadMap[E];

    // Telemetry logging if feature flag enabled
    if (isFeatureEnabled("EVENT_BUS_LOGGING")) {
      if (event === "ERROR_OCCURRED") {
        const p = fullPayload as EventPayloadMap["ERROR_OCCURRED"];
        telemetry.error(p.module, p.error, p.context);
      } else {
        telemetry.multiplayer(event, fullPayload as unknown as Record<string, unknown>);
      }
    }

    const callbacks = this.subscribers.get(event);
    if (!callbacks || callbacks.size === 0) return;

    for (const cb of callbacks) {
      try {
        cb(fullPayload);
      } catch (err) {
        telemetry.error("EventBusSubscriberError", err, { event });
      }
    }
  }

  /**
   * Subscribes to a typed event. Returns an unsubscribe cleanup function.
   */
  subscribe<E extends EventName>(event: E, callback: EventCallback<E>): () => void {
    let set = this.subscribers.get(event);
    if (!set) {
      set = new Set();
      this.subscribers.set(event, set);
    }
    set.add(callback);

    return () => {
      set?.delete(callback);
      if (set?.size === 0) {
        this.subscribers.delete(event);
      }
    };
  }

  /**
   * Subscribes to an event for a single invocation only.
   */
  once<E extends EventName>(event: E, callback: EventCallback<E>): () => void {
    const unsubscribe = this.subscribe(event, (payload) => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
  }

  /**
   * Clears all subscribers (useful in test teardown).
   */
  clear(): void {
    this.subscribers.clear();
  }
}

export const eventBus = new TypedEventBus();
