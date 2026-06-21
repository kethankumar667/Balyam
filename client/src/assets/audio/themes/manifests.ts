import { AUDIO, AUDIO_THEME, type AudioKey, type AudioThemeId } from "../../../constants/audio";

/**
 * A theme manifest is just data — a name + a mapping from AudioKey to a
 * URL relative to the public folder. The AudioManager loads files by URL
 * via Howler; no `import` of audio binaries here, so themes stay
 * code-splittable / hot-swappable at runtime.
 *
 * Add a new theme:
 *   1. Drop the audio files under `public/audio/themes/<your-theme>/...`
 *   2. Append a new entry to `AUDIO_THEME` in constants/audio.ts.
 *   3. Add a new `ThemeManifest` here and register it in `THEMES`.
 *   No component code needs to change — the theme picker in
 *   AudioSettings reads from THEMES.
 *
 * Missing files in a manifest are not an error. The AudioManager's
 * `onloaderror` swallows the failure with a dev-only warning.
 */

export interface ThemeManifest {
  id: AudioThemeId;
  name: string;
  description: string;
  /** Partial — themes can omit sounds they choose not to provide. */
  files: Partial<Record<AudioKey, string>>;
}

/** Helper: `f("classic", "ui", "click.mp3")` → `/audio/themes/classic/ui/click.mp3` */
const f = (theme: string, category: string, file: string): string =>
  `/audio/themes/${theme}/${category}/${file}`;

/* ── Classic 90's — childhood nostalgia ──────────────────────────── */

const CLASSIC_THEME: ThemeManifest = {
  id: AUDIO_THEME.CLASSIC,
  name: "Classic 90's",
  description:
    "Soft flute, xylophone, light tabla, acoustic guitar — childhood evenings on Doordarshan.",
  files: {
    /* UI */
    [AUDIO.UI_CLICK]:        f("classic", "ui", "wooden-click.mp3"),
    [AUDIO.UI_HOVER]:        f("classic", "ui", "pencil-tap.mp3"),
    [AUDIO.UI_POPUP_OPEN]:   f("classic", "ui", "cassette-open.mp3"),
    [AUDIO.UI_POPUP_CLOSE]:  f("classic", "ui", "cassette-close.mp3"),
    [AUDIO.UI_TOGGLE]:       f("classic", "ui", "switch.mp3"),
    [AUDIO.UI_NOTIFICATION]: f("classic", "ui", "school-bell.mp3"),
    [AUDIO.UI_SWIPE]:        f("classic", "ui", "chalk-swipe.mp3"),
    [AUDIO.UI_SCROLL]:       f("classic", "ui", "page-flip.mp3"),

    /* Music */
    [AUDIO.MUSIC_HOME]:       f("classic", "music", "home.mp3"),
    [AUDIO.MUSIC_LOBBY]:      f("classic", "music", "lobby.mp3"),
    [AUDIO.MUSIC_RUMMY]:      f("classic", "music", "rummy.mp3"),
    [AUDIO.MUSIC_LUDO]:       f("classic", "music", "ludo.mp3"),
    [AUDIO.MUSIC_SNL]:        f("classic", "music", "snake-ladder.mp3"),
    [AUDIO.MUSIC_HC]:         f("classic", "music", "hand-cricket.mp3"),
    [AUDIO.MUSIC_TOURNAMENT]: f("classic", "music", "tournament.mp3"),
    [AUDIO.MUSIC_VICTORY]:    f("classic", "music", "victory.mp3"),

    /* Rummy */
    [AUDIO.RUMMY_SHUFFLE]:       f("classic", "rummy", "shuffle.mp3"),
    [AUDIO.RUMMY_DEAL]:          f("classic", "rummy", "deal.mp3"),
    [AUDIO.RUMMY_PICK]:          f("classic", "rummy", "pick.mp3"),
    [AUDIO.RUMMY_DROP]:          f("classic", "rummy", "drop.mp3"),
    [AUDIO.RUMMY_JOKER_REVEAL]:  f("classic", "rummy", "joker-reveal.mp3"),
    [AUDIO.RUMMY_MELD_SUCCESS]:  f("classic", "rummy", "meld-success.mp3"),
    [AUDIO.RUMMY_INVALID]:       f("classic", "rummy", "invalid.mp3"),
    [AUDIO.RUMMY_YOUR_TURN]:     f("classic", "rummy", "your-turn.mp3"),
    [AUDIO.RUMMY_OPPONENT_TURN]: f("classic", "rummy", "opponent-turn.mp3"),

    /* Ludo */
    [AUDIO.LUDO_DICE]:    f("classic", "ludo", "dice.mp3"),
    [AUDIO.LUDO_MOVE]:    f("classic", "ludo", "move.mp3"),
    [AUDIO.LUDO_CAPTURE]: f("classic", "ludo", "capture.mp3"),
    [AUDIO.LUDO_SAFE]:    f("classic", "ludo", "safe.mp3"),
    [AUDIO.LUDO_FINISH]:  f("classic", "ludo", "finish.mp3"),
    [AUDIO.LUDO_WIN]:     f("classic", "ludo", "win.mp3"),

    /* SnL */
    [AUDIO.SNL_DICE]:   f("classic", "snake-ladder", "dice.mp3"),
    [AUDIO.SNL_LADDER]: f("classic", "snake-ladder", "ladder-climb.mp3"),
    [AUDIO.SNL_SNAKE]:  f("classic", "snake-ladder", "snake-bite.mp3"),
    [AUDIO.SNL_MOVE]:   f("classic", "snake-ladder", "move.mp3"),

    /* Hand Cricket */
    [AUDIO.HC_BAT]:    f("classic", "hand-cricket", "bat-hit.mp3"),
    [AUDIO.HC_FOUR]:   f("classic", "hand-cricket", "four.mp3"),
    [AUDIO.HC_SIX]:    f("classic", "hand-cricket", "six.mp3"),
    [AUDIO.HC_WICKET]: f("classic", "hand-cricket", "wicket.mp3"),
    [AUDIO.HC_TOSS]:   f("classic", "hand-cricket", "toss.mp3"),
    [AUDIO.HC_CROWD]:  f("classic", "hand-cricket", "crowd-cheer.mp3"),
    [AUDIO.HC_OUT]:    f("classic", "hand-cricket", "out.mp3"),

    /* Rewards */
    [AUDIO.REWARD_COIN]:        f("classic", "rewards", "coin-box.mp3"),
    [AUDIO.REWARD_COINS_RAIN]:  f("classic", "rewards", "coins-rain.mp3"),
    [AUDIO.REWARD_CASHBACK]:    f("classic", "rewards", "cashback.mp3"),
    [AUDIO.REWARD_UNLOCK]:      f("classic", "rewards", "temple-bell.mp3"),
    [AUDIO.REWARD_ACHIEVEMENT]: f("classic", "rewards", "achievement-whistle.mp3"),
    [AUDIO.REWARD_LEVEL_UP]:    f("classic", "rewards", "children-cheering.mp3"),

    /* System */
    [AUDIO.SYS_TICK]:      f("classic", "ui", "tick.mp3"),
    [AUDIO.SYS_COUNTDOWN]: f("classic", "ui", "countdown.mp3"),
    [AUDIO.SYS_SUCCESS]:   f("classic", "ui", "success.mp3"),
    [AUDIO.SYS_ERROR]:     f("classic", "ui", "error.mp3"),
    [AUDIO.SYS_LOADING]:   f("classic", "ui", "loading.mp3"),
  },
};

/* ── Modern Gaming — minimal & premium ───────────────────────────── */

const MODERN_THEME: ThemeManifest = {
  id: AUDIO_THEME.MODERN,
  name: "Modern Gaming",
  description: "Electronic, synth, clean transitions — minimal and premium.",
  files: {
    [AUDIO.UI_CLICK]:        f("modern", "ui", "digital-click.mp3"),
    [AUDIO.UI_HOVER]:        f("modern", "ui", "hover.mp3"),
    [AUDIO.UI_POPUP_OPEN]:   f("modern", "ui", "popup-open.mp3"),
    [AUDIO.UI_POPUP_CLOSE]:  f("modern", "ui", "popup-close.mp3"),
    [AUDIO.UI_TOGGLE]:       f("modern", "ui", "toggle.mp3"),
    [AUDIO.UI_NOTIFICATION]: f("modern", "ui", "notification.mp3"),
    [AUDIO.UI_SWIPE]:        f("modern", "ui", "swipe.mp3"),
    [AUDIO.UI_SCROLL]:       f("modern", "ui", "scroll.mp3"),

    [AUDIO.MUSIC_HOME]:       f("modern", "music", "home.mp3"),
    [AUDIO.MUSIC_LOBBY]:      f("modern", "music", "lobby.mp3"),
    [AUDIO.MUSIC_RUMMY]:      f("modern", "music", "rummy.mp3"),
    [AUDIO.MUSIC_LUDO]:       f("modern", "music", "ludo.mp3"),
    [AUDIO.MUSIC_SNL]:        f("modern", "music", "snake-ladder.mp3"),
    [AUDIO.MUSIC_HC]:         f("modern", "music", "hand-cricket.mp3"),
    [AUDIO.MUSIC_TOURNAMENT]: f("modern", "music", "tournament.mp3"),
    [AUDIO.MUSIC_VICTORY]:    f("modern", "music", "victory.mp3"),

    [AUDIO.RUMMY_SHUFFLE]:       f("modern", "rummy", "shuffle.mp3"),
    [AUDIO.RUMMY_DEAL]:          f("modern", "rummy", "deal.mp3"),
    [AUDIO.RUMMY_PICK]:          f("modern", "rummy", "pick.mp3"),
    [AUDIO.RUMMY_DROP]:          f("modern", "rummy", "drop.mp3"),
    [AUDIO.RUMMY_JOKER_REVEAL]:  f("modern", "rummy", "joker-reveal.mp3"),
    [AUDIO.RUMMY_MELD_SUCCESS]:  f("modern", "rummy", "meld-success.mp3"),
    [AUDIO.RUMMY_INVALID]:       f("modern", "rummy", "invalid.mp3"),
    [AUDIO.RUMMY_YOUR_TURN]:     f("modern", "rummy", "your-turn.mp3"),
    [AUDIO.RUMMY_OPPONENT_TURN]: f("modern", "rummy", "opponent-turn.mp3"),

    [AUDIO.LUDO_DICE]:    f("modern", "ludo", "dice.mp3"),
    [AUDIO.LUDO_MOVE]:    f("modern", "ludo", "move.mp3"),
    [AUDIO.LUDO_CAPTURE]: f("modern", "ludo", "capture.mp3"),
    [AUDIO.LUDO_SAFE]:    f("modern", "ludo", "safe.mp3"),
    [AUDIO.LUDO_FINISH]:  f("modern", "ludo", "finish.mp3"),
    [AUDIO.LUDO_WIN]:     f("modern", "ludo", "win.mp3"),

    [AUDIO.SNL_DICE]:   f("modern", "snake-ladder", "dice.mp3"),
    [AUDIO.SNL_LADDER]: f("modern", "snake-ladder", "ladder.mp3"),
    [AUDIO.SNL_SNAKE]:  f("modern", "snake-ladder", "snake.mp3"),
    [AUDIO.SNL_MOVE]:   f("modern", "snake-ladder", "move.mp3"),

    [AUDIO.HC_BAT]:    f("modern", "hand-cricket", "bat.mp3"),
    [AUDIO.HC_FOUR]:   f("modern", "hand-cricket", "four.mp3"),
    [AUDIO.HC_SIX]:    f("modern", "hand-cricket", "six.mp3"),
    [AUDIO.HC_WICKET]: f("modern", "hand-cricket", "wicket.mp3"),
    [AUDIO.HC_TOSS]:   f("modern", "hand-cricket", "toss.mp3"),
    [AUDIO.HC_CROWD]:  f("modern", "hand-cricket", "crowd.mp3"),
    [AUDIO.HC_OUT]:    f("modern", "hand-cricket", "out.mp3"),

    [AUDIO.REWARD_COIN]:        f("modern", "rewards", "coin.mp3"),
    [AUDIO.REWARD_COINS_RAIN]:  f("modern", "rewards", "coins-rain.mp3"),
    [AUDIO.REWARD_CASHBACK]:    f("modern", "rewards", "cashback.mp3"),
    [AUDIO.REWARD_UNLOCK]:      f("modern", "rewards", "unlock.mp3"),
    [AUDIO.REWARD_ACHIEVEMENT]: f("modern", "rewards", "achievement.mp3"),
    [AUDIO.REWARD_LEVEL_UP]:    f("modern", "rewards", "level-up.mp3"),

    [AUDIO.SYS_TICK]:      f("modern", "ui", "tick.mp3"),
    [AUDIO.SYS_COUNTDOWN]: f("modern", "ui", "countdown.mp3"),
    [AUDIO.SYS_SUCCESS]:   f("modern", "ui", "success.mp3"),
    [AUDIO.SYS_ERROR]:     f("modern", "ui", "error.mp3"),
    [AUDIO.SYS_LOADING]:   f("modern", "ui", "loading.mp3"),
  },
};

/* ── Festival — Indian festive atmosphere ────────────────────────── */

const FESTIVAL_THEME: ThemeManifest = {
  id: AUDIO_THEME.FESTIVAL,
  name: "Festival",
  description: "Mridangam, flute, dappu, veena, temple ambience — pongal-week energy.",
  files: {
    [AUDIO.UI_CLICK]:        f("festival", "ui", "temple-bell-tap.mp3"),
    [AUDIO.UI_HOVER]:        f("festival", "ui", "wooden-percussion.mp3"),
    [AUDIO.UI_POPUP_OPEN]:   f("festival", "ui", "conch-open.mp3"),
    [AUDIO.UI_POPUP_CLOSE]:  f("festival", "ui", "conch-close.mp3"),
    [AUDIO.UI_TOGGLE]:       f("festival", "ui", "ghungroo.mp3"),
    [AUDIO.UI_NOTIFICATION]: f("festival", "ui", "temple-bell.mp3"),
    [AUDIO.UI_SWIPE]:        f("festival", "ui", "drum-roll.mp3"),
    [AUDIO.UI_SCROLL]:       f("festival", "ui", "tabla-tap.mp3"),

    [AUDIO.MUSIC_HOME]:       f("festival", "music", "home.mp3"),
    [AUDIO.MUSIC_LOBBY]:      f("festival", "music", "lobby.mp3"),
    [AUDIO.MUSIC_RUMMY]:      f("festival", "music", "rummy.mp3"),
    [AUDIO.MUSIC_LUDO]:       f("festival", "music", "ludo.mp3"),
    [AUDIO.MUSIC_SNL]:        f("festival", "music", "snake-ladder.mp3"),
    [AUDIO.MUSIC_HC]:         f("festival", "music", "hand-cricket.mp3"),
    [AUDIO.MUSIC_TOURNAMENT]: f("festival", "music", "tournament.mp3"),
    [AUDIO.MUSIC_VICTORY]:    f("festival", "music", "victory.mp3"),

    [AUDIO.RUMMY_SHUFFLE]:       f("festival", "rummy", "shuffle.mp3"),
    [AUDIO.RUMMY_DEAL]:          f("festival", "rummy", "deal.mp3"),
    [AUDIO.RUMMY_PICK]:          f("festival", "rummy", "pick.mp3"),
    [AUDIO.RUMMY_DROP]:          f("festival", "rummy", "drop.mp3"),
    [AUDIO.RUMMY_JOKER_REVEAL]:  f("festival", "rummy", "joker-reveal.mp3"),
    [AUDIO.RUMMY_MELD_SUCCESS]:  f("festival", "rummy", "meld-success.mp3"),
    [AUDIO.RUMMY_INVALID]:       f("festival", "rummy", "invalid.mp3"),
    [AUDIO.RUMMY_YOUR_TURN]:     f("festival", "rummy", "your-turn.mp3"),
    [AUDIO.RUMMY_OPPONENT_TURN]: f("festival", "rummy", "opponent-turn.mp3"),

    [AUDIO.LUDO_DICE]:    f("festival", "ludo", "dice.mp3"),
    [AUDIO.LUDO_MOVE]:    f("festival", "ludo", "move.mp3"),
    [AUDIO.LUDO_CAPTURE]: f("festival", "ludo", "capture.mp3"),
    [AUDIO.LUDO_SAFE]:    f("festival", "ludo", "safe.mp3"),
    [AUDIO.LUDO_FINISH]:  f("festival", "ludo", "finish.mp3"),
    [AUDIO.LUDO_WIN]:     f("festival", "ludo", "win.mp3"),

    [AUDIO.SNL_DICE]:   f("festival", "snake-ladder", "dice.mp3"),
    [AUDIO.SNL_LADDER]: f("festival", "snake-ladder", "ladder.mp3"),
    [AUDIO.SNL_SNAKE]:  f("festival", "snake-ladder", "snake.mp3"),
    [AUDIO.SNL_MOVE]:   f("festival", "snake-ladder", "move.mp3"),

    [AUDIO.HC_BAT]:    f("festival", "hand-cricket", "bat.mp3"),
    [AUDIO.HC_FOUR]:   f("festival", "hand-cricket", "four.mp3"),
    [AUDIO.HC_SIX]:    f("festival", "hand-cricket", "six.mp3"),
    [AUDIO.HC_WICKET]: f("festival", "hand-cricket", "wicket.mp3"),
    [AUDIO.HC_TOSS]:   f("festival", "hand-cricket", "toss.mp3"),
    [AUDIO.HC_CROWD]:  f("festival", "hand-cricket", "crowd.mp3"),
    [AUDIO.HC_OUT]:    f("festival", "hand-cricket", "out.mp3"),

    [AUDIO.REWARD_COIN]:        f("festival", "rewards", "coin.mp3"),
    [AUDIO.REWARD_COINS_RAIN]:  f("festival", "rewards", "coins-rain.mp3"),
    [AUDIO.REWARD_CASHBACK]:    f("festival", "rewards", "cashback.mp3"),
    [AUDIO.REWARD_UNLOCK]:      f("festival", "rewards", "celebration-drums.mp3"),
    [AUDIO.REWARD_ACHIEVEMENT]: f("festival", "rewards", "fireworks.mp3"),
    [AUDIO.REWARD_LEVEL_UP]:    f("festival", "rewards", "festival-crowd.mp3"),

    [AUDIO.SYS_TICK]:      f("festival", "ui", "tick.mp3"),
    [AUDIO.SYS_COUNTDOWN]: f("festival", "ui", "countdown.mp3"),
    [AUDIO.SYS_SUCCESS]:   f("festival", "ui", "success.mp3"),
    [AUDIO.SYS_ERROR]:     f("festival", "ui", "error.mp3"),
    [AUDIO.SYS_LOADING]:   f("festival", "ui", "loading.mp3"),
  },
};

/**
 * Registry: drives the theme picker, the manager's resolveFile lookup,
 * and the loader. Add a new theme here in one place to roll it out.
 */
export const THEMES: readonly ThemeManifest[] = [
  CLASSIC_THEME,
  MODERN_THEME,
  FESTIVAL_THEME,
];

export const THEME_BY_ID: Readonly<Record<AudioThemeId, ThemeManifest>> = {
  [AUDIO_THEME.CLASSIC]:  CLASSIC_THEME,
  [AUDIO_THEME.MODERN]:   MODERN_THEME,
  [AUDIO_THEME.FESTIVAL]: FESTIVAL_THEME,
};
