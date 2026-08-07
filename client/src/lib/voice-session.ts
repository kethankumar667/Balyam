import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Player } from "@shared/types";
import { getSocket } from "./socket";
import { VoiceManager, hasTurnServer, type RemotePeerInfo } from "./webrtc";

/**
 * Room-wide voice session.
 *
 * This lives OUTSIDE the React tree on purpose. Voice used to be owned by
 * <VoicePanel>, which is mounted conditionally at every one of its call
 * sites — the lobby panel (`phase === "lobby"`), the inline rail drawer
 * (`open === "voice"`), the UNO rail tab (`activeTab === "voice"`), the
 * Rummy modal (`voiceOpen`). Unmounting ran the cleanup effect, which called
 * `destroy()`: microphone stopped, every peer connection closed, remote
 * <audio> elements removed from the DOM.
 *
 * So the call was killed by starting the game, closing the drawer, or
 * switching to the chat tab to type a message — with no error and no notice,
 * and the panel showing "Connect mic" again when reopened. That is the bug
 * players were describing.
 *
 * The session keeps the mic, the peer mesh and the remote audio elements
 * alive for as long as the player is in the room. Panels are now just views
 * onto it, free to mount and unmount as the UI pleases.
 */

export type VoiceStatus = "idle" | "connecting" | "live";

export interface VoiceState {
  status: VoiceStatus;
  muted: boolean;
  error: string | null;
  /** The browser refused to play remote audio until the user interacts. */
  audioBlocked: boolean;
  /** True when no TURN relay is configured (see webrtc.ts). */
  relayless: boolean;
  peers: RemotePeerInfo[];
}

const EMPTY_PEERS: RemotePeerInfo[] = [];

const IDLE_STATE: VoiceState = {
  status: "idle",
  muted: false,
  error: null,
  audioBlocked: false,
  relayless: !hasTurnServer(),
  peers: EMPTY_PEERS,
};

class VoiceSession {
  readonly selfId: string;
  private manager: VoiceManager | null = null;
  private unsubscribeManager: (() => void) | null = null;
  private audioEls = new Map<string, HTMLAudioElement>();
  private roster: string[] = [];
  private listeners = new Set<() => void>();
  private state: VoiceState = IDLE_STATE;

  constructor(selfId: string) {
    this.selfId = selfId;
  }

  getState = (): VoiceState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private patch(next: Partial<VoiceState>): void {
    this.state = { ...this.state, ...next };
    for (const fn of this.listeners) fn();
  }

  /**
   * Latest roster from the room. Called from <Room>, which is mounted for
   * the whole session — so someone joining mid-game gets connected even
   * while every voice panel in the app is closed.
   */
  setRoster(players: Player[]): void {
    const ids = players
      // Bots have no socket, so signals to them vanish and the peer sits at
      // "connecting" forever. Local pass-and-play seats share OUR socket, so
      // signals to them are relayed straight back to us.
      .filter((p) => !p.isBot && !p.isLocal && p.id !== this.selfId)
      .map((p) => p.id);

    const unchanged =
      ids.length === this.roster.length && ids.every((id, i) => id === this.roster[i]);
    this.roster = ids;
    if (!this.manager) return;
    // syncPeers is cheap and idempotent, but skipping the no-op case keeps
    // the common path (a roster tick on every room broadcast) free.
    if (!unchanged) this.pruneAudio(ids);
    this.manager.syncPeers(ids);
  }

  async connect(): Promise<void> {
    if (this.state.status !== "idle") return;
    this.patch({ status: "connecting", error: null });
    try {
      const socket = getSocket();
      const mgr = new VoiceManager(socket, this.selfId);
      await mgr.start();
      this.manager = mgr;
      // Carry a mute chosen before connecting, and keep it across reconnects.
      mgr.setMuted(this.state.muted);
      this.unsubscribeManager = mgr.subscribe(this.onPeers);
      socket.on("connect", this.onSocketReconnect);
      this.patch({ status: "live" });
      mgr.syncPeers(this.roster);
    } catch (err) {
      this.patch({ status: "idle", error: describeMicError(err) });
    }
  }

  disconnect(): void {
    this.unsubscribeManager?.();
    this.unsubscribeManager = null;
    getSocket().off("connect", this.onSocketReconnect);
    this.manager?.destroy();
    this.manager = null;
    this.pruneAudio([]);
    this.patch({ status: "idle", muted: false, peers: EMPTY_PEERS, audioBlocked: false });
  }

  toggleMute(): void {
    if (!this.manager) {
      this.patch({ muted: !this.state.muted });
      return;
    }
    this.patch({ muted: this.manager.toggleMute() });
  }

  /** Re-attempt blocked playback. Must be called from a user gesture. */
  retryAudio(): void {
    let blocked = false;
    for (const el of this.audioEls.values()) {
      el.play().catch(() => {
        blocked = true;
      });
    }
    if (!blocked) this.patch({ audioBlocked: false });
  }

  private onSocketReconnect = (): void => {
    // Peer connections negotiated over the old socket are unreachable: the
    // server maps signals by socket id, and ours just changed. Rebuild.
    this.manager?.resetPeers();
  };

  private onPeers = (peers: RemotePeerInfo[]): void => {
    for (const peer of peers) {
      if (!peer.stream) continue;
      this.bindAudio(peer.playerId, peer.stream);
    }
    this.patch({ peers });
  };

  /**
   * Remote audio plays from a detached element owned by the session rather
   * than from an <audio> inside the panel's peer list. Elements in the panel
   * are torn out of the DOM the moment the panel closes, which silenced
   * everyone even when the connection underneath was healthy.
   */
  private bindAudio(playerId: string, stream: MediaStream): void {
    let el = this.audioEls.get(playerId);
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "");
      el.dataset.voicePeer = playerId;
      el.style.display = "none";
      document.body.appendChild(el);
      this.audioEls.set(playerId, el);
    }
    if (el.srcObject === stream) return;
    el.srcObject = stream;
    el.play().catch(() => {
      // Autoplay policy: mobile Safari and Chrome block playback that is not
      // tied to a gesture. Surface it so the panel can offer a tap target —
      // the old code swallowed this, so the call was live and silent with
      // nothing on screen to explain why.
      this.patch({ audioBlocked: true });
    });
  }

  private pruneAudio(keep: string[]): void {
    const wanted = new Set(keep);
    for (const [id, el] of this.audioEls) {
      if (wanted.has(id)) continue;
      el.srcObject = null;
      el.remove();
      this.audioEls.delete(id);
    }
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
  }
}

function describeMicError(err: unknown): string {
  if (!(err instanceof Error)) return "Could not start the microphone.";
  switch (err.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone blocked. Allow mic access for this site in your browser settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone found. Plug one in or check your input device.";
    case "NotReadableError":
      return "Your microphone is in use by another app. Close it and try again.";
    default:
      return err.message || "Could not start the microphone.";
  }
}

let session: VoiceSession | null = null;

function getSession(selfId: string): VoiceSession {
  if (session && session.selfId !== selfId) {
    session.dispose();
    session = null;
  }
  if (!session) session = new VoiceSession(selfId);
  return session;
}

/** Called when the player leaves the room, so the mic light goes out. */
export function destroyVoiceSession(): void {
  session?.dispose();
  session = null;
}

export interface VoiceControls extends VoiceState {
  /** Resolves once the mic prompt has settled, so callers can restore UI state. */
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  retryAudio: () => void;
}

export function useVoiceSession(selfId: string | null): VoiceControls {
  const active = selfId ? getSession(selfId) : null;

  const state = useSyncExternalStore(
    active ? active.subscribe : noopSubscribe,
    active ? active.getState : getIdleState,
    active ? active.getState : getIdleState,
  );

  const connect = useCallback(async () => {
    await active?.connect();
  }, [active]);
  const disconnect = useCallback(() => active?.disconnect(), [active]);
  const toggleMute = useCallback(() => active?.toggleMute(), [active]);
  const retryAudio = useCallback(() => active?.retryAudio(), [active]);

  return { ...state, connect, disconnect, toggleMute, retryAudio };
}

/**
 * Feeds the room roster to the voice session. Mount this once, high up and
 * unconditionally — <Room> — so peer reconciliation does not depend on a
 * voice panel being open.
 */
export function useVoiceRoster(players: Player[] | undefined, selfId: string | null): void {
  useEffect(() => {
    if (!selfId || !players) return;
    getSession(selfId).setRoster(players);
  }, [players, selfId]);
}

function noopSubscribe(): () => void {
  return () => {};
}

function getIdleState(): VoiceState {
  return IDLE_STATE;
}
