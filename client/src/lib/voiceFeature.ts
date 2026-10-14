/**
 * Master switch for in-room voice chat.
 *
 * Voice is hidden for the first public launch (decision 2026-10-14): the mesh
 * has no TURN relay provisioned yet, and a voice channel between strangers who
 * share a room code is the part of the product that most needs child-safety
 * tooling (report / block / parental controls) before it goes live.
 *
 * Every voice entry point reads this one constant, and the voice session
 * refuses to start while it is off, so flipping it back is a one-line change
 * (or `VITE_VOICE_ENABLED=true` at build time). The server has a matching
 * `VOICE_ENABLED` switch that must be turned on at the same time.
 */
const envValue = (import.meta.env?.VITE_VOICE_ENABLED as string | undefined)?.trim().toLowerCase();

export const VOICE_CHAT_ENABLED: boolean = envValue === "true" || envValue === "1";
