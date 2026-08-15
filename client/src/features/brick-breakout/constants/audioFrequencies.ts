/**
 * Audio frequencies and waveform definitions for retro chiptune sounds.
 */

export interface SoundSpec {
  freqs: readonly number[];
  durationSec: number;
  type: OscillatorType;
  gain: number;
}

export const BREAKOUT_AUDIO_SPECS = {
  PADDLE_BOUNCE: {
    freqs: [440, 520],
    durationSec: 0.06,
    type: "square" as OscillatorType,
    gain: 0.15,
  },
  WALL_BOUNCE: {
    freqs: [320, 280],
    durationSec: 0.04,
    type: "square" as OscillatorType,
    gain: 0.1,
  },
  BRICK_HIT: {
    freqs: [600, 750],
    durationSec: 0.08,
    type: "square" as OscillatorType,
    gain: 0.18,
  },
  BRICK_DESTROY: {
    freqs: [300, 450, 700, 900],
    durationSec: 0.12,
    type: "sawtooth" as OscillatorType,
    gain: 0.22,
  },
  INDESTRUCTIBLE_HIT: {
    freqs: [180, 160],
    durationSec: 0.07,
    type: "triangle" as OscillatorType,
    gain: 0.14,
  },
  BALL_LAUNCH: {
    freqs: [350, 450, 600, 800],
    durationSec: 0.15,
    type: "square" as OscillatorType,
    gain: 0.16,
  },
  LIFE_LOST: {
    freqs: [380, 320, 260, 180, 120],
    durationSec: 0.45,
    type: "sawtooth" as OscillatorType,
    gain: 0.25,
  },
  LEVEL_COMPLETE: {
    freqs: [523, 659, 784, 1046, 1318],
    durationSec: 0.55,
    type: "square" as OscillatorType,
    gain: 0.25,
  },
  GAME_OVER: {
    freqs: [400, 350, 300, 250, 200, 150],
    durationSec: 0.7,
    type: "sawtooth" as OscillatorType,
    gain: 0.3,
  },
  BUTTON_CLICK: {
    freqs: [700],
    durationSec: 0.03,
    type: "square" as OscillatorType,
    gain: 0.08,
  },
} as const;
