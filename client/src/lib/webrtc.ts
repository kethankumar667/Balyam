import type { WebRTCSignal, WebRTCSignalRecvPayload } from "@shared/types";
import type { AppSocket } from "./socket";

/**
 * ICE servers.
 *
 * STUN alone only tells a peer its public address; it does not move audio.
 * When both sides sit behind a symmetric NAT — the norm on mobile carrier
 * data and plenty of corporate wifi — no direct path exists and the only way
 * through is a TURN relay. Without one those players connect to nobody, no
 * matter how correct the signalling above it is, which is why voice "works
 * for some people and not others".
 *
 * Supply credentials through the client env to switch relaying on:
 *   VITE_TURN_URL=turn:turn.example.com:3478
 *   VITE_TURN_USERNAME=...
 *   VITE_TURN_CREDENTIAL=...
 */
const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME as string | undefined;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

export function hasTurnServer(): boolean {
  return Boolean(TURN_URL);
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  if (TURN_URL) {
    servers.push(
      TURN_USERNAME && TURN_CREDENTIAL
        ? { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }
        : { urls: TURN_URL },
    );
  }
  return servers;
}

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
  /**
   * Which side owns the offer for this pair (lexicographic tie-break).
   * The other side is the "polite" peer and yields when offers collide.
   */
  weInitiate: boolean;
  /** Whether our local audio has been attached to this connection yet. */
  tracksAdded: boolean;
  /** Set across createOffer→setLocalDescription so glare can be detected. */
  makingOffer: boolean;
  /** How many times we have rebuilt this connection after a failure. */
  retries: number;
}

/** Give up rebuilding a peer after this many consecutive failures. */
const MAX_RETRIES = 3;

/**
 * Mesh-topology WebRTC voice manager.
 *
 * For each remote player it opens a peer connection and exchanges SDP/ICE
 * over Socket.IO. The peer with the lexicographically smaller playerId owns
 * the offer; the other is "polite" and rolls back on collision.
 *
 * Renegotiation is driven by the `negotiationneeded` event rather than by
 * the caller. The previous version re-offered from inside `syncPeers`, which
 * the UI calls on every roster tick — and since the roster object identity
 * changes on every room broadcast, that meant a fresh offer or `ready` ping
 * to every not-yet-flowing peer several times a second. The resulting
 * signalling storm kept connections permanently mid-negotiation.
 */
export class VoiceManager {
  private socket: AppSocket;
  private localPlayerId: string;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerEntry>();
  private listeners = new Set<Listener>();
  private muted = false;
  private targets: string[] = [];
  private destroyed = false;

  constructor(socket: AppSocket, localPlayerId: string) {
    this.socket = socket;
    this.localPlayerId = localPlayerId;
    this.socket.on("webrtc:signal", this.handleSignal);
  }

  async start(): Promise<void> {
    if (this.localStream) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    if (this.destroyed) {
      for (const t of stream.getTracks()) t.stop();
      return;
    }
    this.localStream = stream;
    // A mute toggled before the mic resolved must still apply.
    this.applyMute();
  }

  isActive(): boolean {
    return this.localStream !== null;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): boolean {
    this.muted = muted;
    this.applyMute();
    return this.muted;
  }

  toggleMute(): boolean {
    return this.setMuted(!this.muted);
  }

  private applyMute(): void {
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.muted;
    }
  }

  /**
   * Reconcile peer connections with the current set of remote player IDs.
   *
   * Safe to call on every roster tick: when the ID set is unchanged and no
   * connection has failed, this does nothing at all.
   */
  syncPeers(remotePlayerIds: string[]): void {
    if (this.destroyed) return;
    this.targets = [...new Set(remotePlayerIds.filter((id) => id && id !== this.localPlayerId))];
    if (!this.localStream) return;

    const wanted = new Set(this.targets);
    let changed = false;

    for (const id of [...this.peers.keys()]) {
      if (!wanted.has(id)) {
        this.closePeer(id);
        changed = true;
      }
    }

    for (const id of wanted) {
      const existing = this.peers.get(id);
      if (!existing) {
        this.openPeer(id, this.localPlayerId < id);
        changed = true;
        continue;
      }
      // A peer that has fallen over stays dead forever unless we rebuild it.
      // The old code left failed entries in the map and skipped them here,
      // so a single dropped connection ended voice with that player for the
      // rest of the session.
      const state = existing.pc.connectionState;
      if ((state === "failed" || state === "closed") && existing.retries < MAX_RETRIES) {
        const retries = existing.retries + 1;
        this.closePeer(id);
        const entry = this.openPeer(id, this.localPlayerId < id);
        entry.retries = retries;
        changed = true;
      } else if (!existing.tracksAdded && this.attachLocalTracks(existing)) {
        // Mic arrived after this connection was opened by an inbound signal;
        // `negotiationneeded` picks the renegotiation up from here.
        changed = true;
      }
    }

    if (changed) this.emitChange();
  }

  /** Tear down every peer and rebuild — used after a socket reconnect. */
  resetPeers(): void {
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.emitChange();
    this.syncPeers(this.targets);
  }

  destroy(): void {
    this.destroyed = true;
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
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    const entry: PeerEntry = {
      pc,
      stream: null,
      pendingCandidates: [],
      remoteDescSet: false,
      weInitiate,
      tracksAdded: false,
      makingOffer: false,
      retries: 0,
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
    pc.onnegotiationneeded = () => {
      void this.negotiate(playerId);
    };
    pc.oniceconnectionstatechange = () => {
      // A dropped ICE path recovers with a fresh candidate gather far faster
      // than a full connection rebuild, so try that before syncPeers gives up
      // on the peer entirely.
      if (pc.iceConnectionState === "failed" && entry.weInitiate) {
        try {
          pc.restartIce();
        } catch {
          /* older engines: syncPeers will rebuild instead */
        }
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") entry.retries = 0;
      this.emitChange();
      if (pc.connectionState === "failed") {
        // Rebuild through the normal reconcile path so retry counting and
        // the polite/impolite tie-break stay in one place.
        this.syncPeers(this.targets);
      }
    };

    return entry;
  }

  /**
   * Put our microphone on a connection.
   *
   * Peers are NOT always created after we have a mic: whoever connects first
   * signals the other, and `handleSignal` opens a connection on the receiving
   * side immediately — before that person has clicked "Connect mic". Adding
   * the track later fires `negotiationneeded`, which is what actually gets
   * the audio flowing in the staggered case.
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
   * Something on this connection changed and needs a new offer/answer round.
   * Only the offer-owning side may offer; the other asks for one with
   * `ready`, the signal kind that shared/types.ts declared but nothing sent.
   */
  private async negotiate(playerId: string): Promise<void> {
    const entry = this.peers.get(playerId);
    if (!entry || this.destroyed) return;
    if (!entry.weInitiate) {
      this.sendSignal(playerId, { kind: "ready" });
      return;
    }
    if (entry.pc.signalingState !== "stable" || entry.makingOffer) return;
    await this.makeOffer(playerId);
  }

  private async makeOffer(playerId: string): Promise<void> {
    const entry = this.peers.get(playerId);
    if (!entry) return;
    entry.makingOffer = true;
    try {
      // No argument: the browser builds the offer from the current
      // transceivers, which is what we want for a plain renegotiation.
      await entry.pc.setLocalDescription();
      const sdp = entry.pc.localDescription?.sdp;
      if (sdp) this.sendSignal(playerId, { kind: "offer", sdp });
    } catch (err) {
      console.error("[webrtc] makeOffer failed:", err);
    } finally {
      entry.makingOffer = false;
    }
  }

  private closePeer(playerId: string): void {
    const entry = this.peers.get(playerId);
    if (!entry) return;
    entry.pc.ontrack = null;
    entry.pc.onicecandidate = null;
    entry.pc.onnegotiationneeded = null;
    entry.pc.oniceconnectionstatechange = null;
    entry.pc.onconnectionstatechange = null;
    try {
      entry.pc.close();
    } catch {
      /* already closed */
    }
    this.peers.delete(playerId);
  }

  private sendSignal(toPlayerId: string, signal: WebRTCSignal): void {
    if (this.destroyed) return;
    this.socket.emit("webrtc:signal", { toPlayerId, signal });
  }

  private handleSignal = async ({
    fromPlayerId,
    signal,
  }: WebRTCSignalRecvPayload): Promise<void> => {
    if (this.destroyed) return;
    // The server relays with the SENDER's primary player id. A signal
    // addressed to one of our own pass-and-play seats comes straight back to
    // us, and answering it opened a connection to ourselves — every word
    // echoed back into the room. Drop those.
    if (fromPlayerId === this.localPlayerId) return;

    let entry = this.peers.get(fromPlayerId);
    if (!entry) {
      entry = this.openPeer(fromPlayerId, this.localPlayerId < fromPlayerId);
    }
    const pc = entry.pc;

    try {
      if (signal.kind === "ready") {
        // The far side now has a mic and wants a fresh offer from us.
        this.attachLocalTracks(entry);
        if (entry.weInitiate) await this.negotiate(fromPlayerId);
        return;
      }

      if (signal.kind === "offer" && signal.sdp) {
        // Perfect-negotiation glare handling: if an offer lands while we
        // have one of our own in flight, the polite peer (the side that
        // does not own the offer) rolls back and takes theirs; the impolite
        // peer ignores it and its own offer wins.
        const collision = entry.makingOffer || pc.signalingState !== "stable";
        const polite = !entry.weInitiate;
        if (collision && !polite) return;
        if (collision) {
          await pc.setLocalDescription({ type: "rollback" } as RTCLocalSessionDescriptionInit);
        }
        // Attach BEFORE answering so the answer advertises our audio.
        this.attachLocalTracks(entry);
        await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
        entry.remoteDescSet = true;
        await this.flushCandidates(entry);
        await pc.setLocalDescription();
        const sdp = pc.localDescription?.sdp;
        if (sdp) this.sendSignal(fromPlayerId, { kind: "answer", sdp });
        return;
      }

      if (signal.kind === "answer" && signal.sdp) {
        // An answer that arrives when we are not expecting one (a duplicate,
        // or the tail of a rolled-back round) throws and used to poison the
        // connection. Ignore it instead.
        if (pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
        entry.remoteDescSet = true;
        await this.flushCandidates(entry);
        return;
      }

      if (signal.kind === "candidate" && signal.candidate) {
        if (entry.remoteDescSet) {
          await pc.addIceCandidate(signal.candidate);
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
