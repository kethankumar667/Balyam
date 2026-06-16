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
    };
    this.peers.set(playerId, entry);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

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
      if (signal.kind === "offer" && signal.sdp) {
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
