/**
 * Server-side switch for in-room voice chat. Off by default.
 *
 * Voice is hidden for the first public launch. The client simply never starts
 * a voice session, but a modified client could still emit `webrtc:signal` or
 * ask for TURN credentials, so the relay itself is closed too. Set
 * `VOICE_ENABLED=true` (together with the client's `VITE_VOICE_ENABLED=true`)
 * to turn voice back on.
 *
 * Read at call time, not at import time, so a test can flip it.
 */
export function isVoiceEnabled(): boolean {
  const v = process.env.VOICE_ENABLED?.trim().toLowerCase();
  return v === "true" || v === "1";
}
