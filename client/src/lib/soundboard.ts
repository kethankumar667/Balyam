import { AUDIO, type AudioKey } from "../constants/audio";
import { SOUNDBOARD_CLIPS } from "@shared/soundboard";

/**
 * Wire clip id → theme-resolved audio key.
 *
 * This is the ONLY place the two vocabularies meet. The shared catalogue
 * knows nothing about audio themes (it is imported by the server), and the
 * AudioManager knows nothing about the wire protocol — this table joins them.
 *
 * A clip id with no entry here plays nothing but still shows its banner, so
 * a half-finished clip degrades to a visual reaction rather than to a crash.
 */
const CLIP_AUDIO: Record<string, AudioKey> = {
  dhol: AUDIO.SB_DHOL,
  applause: AUDIO.SB_APPLAUSE,
  tada: AUDIO.SB_TADA,
  shankh: AUDIO.SB_SHANKH,
  airhorn: AUDIO.SB_AIRHORN,
  laugh: AUDIO.SB_LAUGH,
  boo: AUDIO.SB_BOO,
  sadtrombone: AUDIO.SB_SADTROMBONE,
  drumroll: AUDIO.SB_DRUMROLL,
  suspense: AUDIO.SB_SUSPENSE,
  tick: AUDIO.SB_TICK,
  whoosh: AUDIO.SB_WHOOSH,
};

export function audioKeyForClip(clipId: string): AudioKey | null {
  return CLIP_AUDIO[clipId] ?? null;
}

/**
 * Guard against the mapping drifting from the catalogue. Called by the test
 * suite rather than at runtime — a missing entry is a build-time mistake,
 * not something to crash a live room over.
 */
export function unmappedClipIds(): string[] {
  return SOUNDBOARD_CLIPS.filter((c) => !CLIP_AUDIO[c.id]).map((c) => c.id);
}
