import type { WebRTCSignal, WebRTCSignalRecvPayload } from "@shared/types";
import type { AppSocket } from "./socket";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface RemotePeerInfo {
  playerId: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

type Listener = (peers: RemotePeerInfo[]) => void;

interface PeerEntry {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  pendingCandidates: RTCIceCandidateInit[];
  remoteDescSet: boolean;
  /** Which side owns the offer for this pair (lexicographic tie-break). */
  weInitiate: boolean;
  /** Whether our local audio has been attached to this connection yet. */
  tracksAdded: boolean;
}

/**
 * Mesh-topology WebRTC voice manager.
 * For each remote player, opens a peer connection and exchanges SDP/ICE via Socket.IO.
 * The peer with the lexicographically smaller playerId initiates the offer ("polite" tie-break).
 */
export class VoiceManager {
  private socket: AppSocket;
  private localPlayerId: string;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerEntry>();
  private listeners = new Set<Listener>();
  private muted = false;

  constructor(socket: AppSocket, localPlayerId: string) {
    this.socket = socket;
    this.localPlayerId = localPlayerId;
    this.socket.on("webrtc:signal", this.handleSignal);
  }

  async start(): Promise<void> {
    if (this.localStream) return;
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
  }

  isActive(): boolean {
    return this.localStream !== null;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    this.muted = !this.muted;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.muted;
    }
    return this.muted;
  }

  /**
   * Reconcile peer connections with the current set of remote player IDs.
   * Call this every time the room state's player list changes.
   */
  async syncPeers(remotePlayerIds: string[]): Promise<void> {
    if (!this.localStream) return;
    const targets = new Set(remotePlayerIds.filter((id) => id !== this.localPlayerId));

    for (const id of this.peers.keys()) {
      if (!targets.has(id)) this.closePeer(id);
    }

    for (const id of targets) {
      if (this.peers.has(id)) continue;
      this.openPeer(id, this.localPlayerId < id);
    }
    // Connections opened before our mic existed still need it.
    this.renegotiateAll();
    this.emitChange();
  }

  destroy(): void {
    this.socket.off("webrtc:signal", this.handleSignal);
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop();
      this.localStream = null;
    }
    this.listeners.clear();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private snapshot(): RemotePeerInfo[] {
    return [...this.peers.entries()].map(([playerId, e]) => ({
      playerId,
      stream: e.stream,
      connectionState: e.pc.connectionState,
    }));
  }

  private emitChange(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  private openPeer(playerId: string, weInitiate: boolean): PeerEntry {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = {
      pc,
      stream: null,
      pendingCandidates: [],
      remoteDescSet: false,
      weInitiate,
      tracksAdded: false,
    };
    this.peers.set(playerId, entry);
    this.attachLocalTracks(entry);

    pc.ontrack = (e) => {
      entry.stream = e.streams[0] ?? null;
      this.emitChange();
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal(playerId, { kind: "candidate", candidate: e.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      this.emitChange();
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        // keep entry; let syncPeers decide whether to retry
      }
    };

    if (weInitiate) {
      this.makeOffer(playerId).catch((err) => console.error("makeOffer failed:", err));
    }
    return entry;
  }

  /**
   * Put our microphone on an existing connection.
   *
   * Peers are NOT always created after we have a mic: whoever connects first
   * signals the other, and `handleSignal` opens a connection on the receiving
   * side immediately — before that person has clicked "Connect mic". The
   * original code only ever called `addTrack` inside `openPeer`, so that
   * connection was answered with NO audio track and the initiator heard
   * silence forever. Nothing errored; voice just half-worked, one direction
   * only, which is exactly how it was reported.
   */
  private attachLocalTracks(entry: PeerEntry): boolean {
    if (!this.localStream || entry.tracksAdded) return false;
    for (const track of this.localStream.getTracks()) {
      entry.pc.addTrack(track, this.localStream);
    }
    entry.tracksAdded = true;
    return true;
  }

  /**
   * Our mic just became available (or came back) — make sure every existing
   * connection carries it. The side that owns the offer re-offers; the other
   * side asks for one with `ready`, the signal kind that was declared in
   * shared/types.ts but never actually sent.
   */
  private renegotiateAll(): void {
    for (const [playerId, entry] of this.peers) {
      this.attachLocalTracks(entry);
      // Already flowing — leave it alone.
      if (entry.stream && entry.pc.connectionState === "connected") continue;
      // Mid-negotiation; the in-flight offer/answer will finish the job.
      if (entry.pc.signalingState !== "stable") continue;
      if (entry.weInitiate) {
        this.makeOffer(playerId).catch((err) => console.error("re-offer failed:", err));
      } else {
        // We do not own the offer for this pair, so ask the side that does.
        // Without this the staggered case deadlocks: the first person to
        // connect offered into the void (nobody was listening yet) and the
        // second never had a reason to speak up.
        this.sendSignal(playerId, { kind: "ready" });
      }
    }
  }

  private async makeOffer(playerId: string): Promise<void> {
    const entry = this.peers.get(playerId);
    if (!entry) return;
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    this.sendSignal(playerId, { kind: "offer", sdp: offer.sdp });
  }

  private closePeer(playerId: string): void {
    const entry = this.peers.get(playerId);
    if (!entry) return;
    entry.pc.ontrack = null;
    entry.pc.onicecandidate = null;
    entry.pc.onconnectionstatechange = null;
    entry.pc.close();
    this.peers.delete(playerId);
  }

  private sendSignal(toPlayerId: string, signal: WebRTCSignal): void {
    this.socket.emit("webrtc:signal", { toPlayerId, signal });
  }

  private handleSignal = async ({ fromPlayerId, signal }: WebRTCSignalRecvPayload): Promise<void> => {
    let entry = this.peers.get(fromPlayerId);
    if (!entry) {
      entry = this.openPeer(fromPlayerId, false);
    }
    try {
      if (signal.kind === "ready") {
        // The far side now has a mic and wants a fresh offer from us.
        this.attachLocalTracks(entry);
        if (entry.weInitiate) await this.makeOffer(fromPlayerId);
        return;
      }
      if (signal.kind === "offer" && signal.sdp) {
        // Attach BEFORE answering so the answer advertises our audio.
        this.attachLocalTracks(entry);
        await entry.pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
        entry.remoteDescSet = true;
        await this.flushCandidates(entry);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        this.sendSignal(fromPlayerId, { kind: "answer", sdp: answer.sdp });
      } else if (signal.kind === "answer" && signal.sdp) {
        await entry.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
        entry.remoteDescSet = true;
        await this.flushCandidates(entry);
      } else if (signal.kind === "candidate" && signal.candidate) {
        if (entry.remoteDescSet) {
          await entry.pc.addIceCandidate(signal.candidate);
        } else {
          entry.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error("[webrtc] signal handling error:", err);
    }
  };

  private async flushCandidates(entry: PeerEntry): Promise<void> {
    while (entry.pendingCandidates.length > 0) {
      const c = entry.pendingCandidates.shift();
      if (c) {
        try {
          await entry.pc.addIceCandidate(c);
        } catch (err) {
          console.warn("[webrtc] addIceCandidate failed:", err);
        }
      }
    }
  }
}
