/**
 * Single source of truth for every sound the app references.
 *
 * Components import an opaque `AUDIO.*` key — never a filename. The
 * AudioManager resolves each key to a file path using the currently
 * selected theme manifest, which means theme switching (Classic 90's →
 * Modern → Festival) is transparent to every consumer.
 *
 * Add a new sound:
 *   1. Append a key here.
 *   2. Map it to a file in each theme manifest (assets/audio/themes/manifests.ts).
 *   3. Use it: `play(AUDIO.MY_NEW_SOUND)`.
 *
 * If the manifest doesn't list the key, the manager fails silently
 * (warning in dev only). No component code needs to change.
 */

export const AUDIO = {
  /* ── UI ── */
  UI_CLICK:          "ui_click",
  UI_HOVER:          "ui_hover",
  UI_POPUP_OPEN:     "ui_popup_open",
  UI_POPUP_CLOSE:    "ui_popup_close",
  UI_TOGGLE:         "ui_toggle",
  UI_NOTIFICATION:   "ui_notification",
  UI_SWIPE:          "ui_swipe",
  UI_SCROLL:         "ui_scroll",

  /* ── Background music ── */
  MUSIC_HOME:        "music_home",
  MUSIC_LOBBY:       "music_lobby",
  MUSIC_RUMMY:       "music_rummy",
  MUSIC_LUDO:        "music_ludo",
  MUSIC_SNL:         "music_snl",
  MUSIC_HC:          "music_hc",
  MUSIC_TOURNAMENT:  "music_tournament",
  MUSIC_VICTORY:     "music_victory",

  /* ── Rummy ── */
  RUMMY_SHUFFLE:        "rummy_shuffle",
  RUMMY_DEAL:           "rummy_deal",
  RUMMY_PICK:           "rummy_pick",
  RUMMY_DROP:           "rummy_drop",
  RUMMY_JOKER_REVEAL:   "rummy_joker_reveal",
  RUMMY_MELD_SUCCESS:   "rummy_meld_success",
  RUMMY_INVALID:        "rummy_invalid",
  RUMMY_YOUR_TURN:      "rummy_your_turn",
  RUMMY_OPPONENT_TURN:  "rummy_opponent_turn",

  /* ── Ludo ── */
  LUDO_DICE:    "ludo_dice",
  LUDO_MOVE:    "ludo_move",
  LUDO_CAPTURE: "ludo_capture",
  LUDO_SAFE:    "ludo_safe",
  LUDO_FINISH:  "ludo_finish",
  LUDO_WIN:     "ludo_win",

  /* ── Snake & Ladder ── */
  SNL_DICE:    "snl_dice",
  SNL_LADDER:  "snl_ladder",
  SNL_SNAKE:   "snl_snake",
  SNL_MOVE:    "snl_move",

  /* ── Hand Cricket ── */
  HC_BAT:    "hc_bat",
  HC_FOUR:   "hc_four",
  HC_SIX:    "hc_six",
  HC_WICKET: "hc_wicket",
  HC_TOSS:   "hc_toss",
  HC_CROWD:  "hc_crowd",
  HC_OUT:    "hc_out",

  /* ── Rewards ── */
  REWARD_COIN:        "reward_coin",
  REWARD_COINS_RAIN:  "reward_coins_rain",
  REWARD_CASHBACK:    "reward_cashback",
  REWARD_UNLOCK:      "reward_unlock",
  REWARD_ACHIEVEMENT: "reward_achievement",
  REWARD_LEVEL_UP:    "reward_level_up",

  /* ── System ── */
  SYS_TICK:      "sys_tick",
  SYS_COUNTDOWN: "sys_countdown",
  SYS_SUCCESS:   "sys_success",
  SYS_ERROR:     "sys_error",
  SYS_LOADING:   "sys_loading",
} as const;

export type AudioKey = (typeof AUDIO)[keyof typeof AUDIO];

/**
 * Keys treated as background tracks: looped, single-track-at-a-time,
 * routed through the music volume bus and crossfaded on change.
 *
 * Calling `play()` with a music key transparently routes to `playMusic()`,
 * so callers don't need to know whether a key is music or sfx.
 */
export const MUSIC_KEYS: ReadonlySet<AudioKey> = new Set<AudioKey>([
  AUDIO.MUSIC_HOME,
  AUDIO.MUSIC_LOBBY,
  AUDIO.MUSIC_RUMMY,
  AUDIO.MUSIC_LUDO,
  AUDIO.MUSIC_SNL,
  AUDIO.MUSIC_HC,
  AUDIO.MUSIC_TOURNAMENT,
  AUDIO.MUSIC_VICTORY,
]);

/**
 * Sounds the manager warms up the moment the user has unlocked audio
 * (first gesture). Everything else is lazily instantiated on first play.
 */
export const PRELOAD_KEYS: readonly AudioKey[] = [
  AUDIO.UI_CLICK,
  AUDIO.UI_HOVER,
  AUDIO.UI_NOTIFICATION,
  AUDIO.UI_POPUP_OPEN,
  AUDIO.UI_POPUP_CLOSE,
  AUDIO.REWARD_COIN,
  AUDIO.LUDO_DICE,
  AUDIO.RUMMY_SHUFFLE,
  AUDIO.SYS_SUCCESS,
  AUDIO.SYS_ERROR,
];

/* ── Themes ───────────────────────────────────────────────────────── */

export const AUDIO_THEME = {
  CLASSIC:  "classic",
  MODERN:   "modern",
  FESTIVAL: "festival",
} as const;

export type AudioThemeId = (typeof AUDIO_THEME)[keyof typeof AUDIO_THEME];

export const DEFAULT_THEME: AudioThemeId = AUDIO_THEME.CLASSIC;

/** Crossfade duration used for both theme switching and music transitions. */
export const AUDIO_CROSSFADE_MS = 700;
