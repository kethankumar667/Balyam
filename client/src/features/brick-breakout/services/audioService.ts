import { BREAKOUT_AUDIO_SPECS } from "../constants/audioFrequencies";
import { soundSynth } from "../utils/soundSynth";

/**
 * Breakout Audio Service triggering chiptune retro sounds.
 */
export const breakoutAudio = {
  setMuted(muted: boolean) {
    soundSynth.setMuted(muted);
  },

  playPaddleBounce() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.PADDLE_BOUNCE);
  },

  playWallBounce() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.WALL_BOUNCE);
  },

  playBrickHit() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.BRICK_HIT);
  },

  playBrickDestroy() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.BRICK_DESTROY);
  },

  playIndestructibleHit() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.INDESTRUCTIBLE_HIT);
  },

  playBallLaunch() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.BALL_LAUNCH);
  },

  playLifeLost() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.LIFE_LOST);
  },

  playLevelComplete() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.LEVEL_COMPLETE);
  },

  playGameOver() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.GAME_OVER);
  },

  playButtonClick() {
    soundSynth.playTone(BREAKOUT_AUDIO_SPECS.BUTTON_CLICK);
  },
};
