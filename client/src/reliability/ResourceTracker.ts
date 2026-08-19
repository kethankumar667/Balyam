/**
 * Client-Side Resource Tracker for BHALYAM.
 * Tracks and audits DOM listeners, WebRTC peer connections, audio instances, and animations.
 */

export type ClientResourceType =
  | "listener"
  | "timeout"
  | "interval"
  | "raf"
  | "audio_howl"
  | "webrtc_peer"
  | "media_stream"
  | "observer";

export interface ClientResourceRecord {
  id: string;
  type: ClientResourceType;
  tag: string;
  createdAt: number;
}

export class ClientResourceTracker {
  private resources: Map<string, ClientResourceRecord> = new Map();

  public register(type: ClientResourceType, id: string, tag: string): void {
    const key = `${type}:${id}`;
    this.resources.set(key, {
      id,
      type,
      tag,
      createdAt: Date.now(),
    });
  }

  public unregister(type: ClientResourceType, id: string): void {
    const key = `${type}:${id}`;
    this.resources.delete(key);
  }

  public getCount(type: ClientResourceType): number {
    let count = 0;
    for (const r of this.resources.values()) {
      if (r.type === type) count++;
    }
    return count;
  }

  public getSummary(): Record<ClientResourceType, number> {
    const summary: Record<ClientResourceType, number> = {
      listener: 0,
      timeout: 0,
      interval: 0,
      raf: 0,
      audio_howl: 0,
      webrtc_peer: 0,
      media_stream: 0,
      observer: 0,
    };
    for (const r of this.resources.values()) {
      summary[r.type] = (summary[r.type] || 0) + 1;
    }
    return summary;
  }

  public getTotal(): number {
    return this.resources.size;
  }

  public reset(): void {
    this.resources.clear();
  }
}

export const clientResourceTracker = new ClientResourceTracker();
