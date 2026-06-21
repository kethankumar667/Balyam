# BHALYAM Audio Assets

This folder is served verbatim by Vite at runtime. Drop your audio files
here following the structure below — the `AudioManager` references them
via `/audio/themes/<theme>/<category>/<file>`.

Missing files **do not crash** the app — the manager swallows load
errors and logs a single console warning in development.

## Structure

```
public/audio/themes/
├── classic/                  # Classic 90's — childhood nostalgia
│   ├── music/                # Looped background tracks
│   │   ├── home.mp3
│   │   ├── lobby.mp3
│   │   ├── rummy.mp3
│   │   ├── ludo.mp3
│   │   ├── snake-ladder.mp3
│   │   ├── hand-cricket.mp3
│   │   ├── tournament.mp3
│   │   └── victory.mp3
│   ├── ui/                   # Buttons, hovers, popups, system sfx
│   │   ├── wooden-click.mp3
│   │   ├── pencil-tap.mp3
│   │   ├── cassette-open.mp3
│   │   ├── cassette-close.mp3
│   │   ├── switch.mp3
│   │   ├── school-bell.mp3
│   │   ├── chalk-swipe.mp3
│   │   ├── page-flip.mp3
│   │   ├── tick.mp3
│   │   ├── countdown.mp3
│   │   ├── success.mp3
│   │   ├── error.mp3
│   │   └── loading.mp3
│   ├── rummy/                # Card sfx
│   ├── ludo/                 # Dice / move / capture / win
│   ├── snake-ladder/         # Dice / ladder / snake / move
│   ├── hand-cricket/         # Bat / four / six / wicket / toss / crowd / out
│   └── rewards/              # Coin / cashback / unlock / level-up
├── modern/                   # Modern Gaming — minimal, premium
│   └── …same shape as classic
└── festival/                 # Festival — Indian festive
    └── …same shape as classic
```

## Format guidance

- **Music**: `.mp3`, loopable, ≤ 1.5 MB each (mobile-friendly). Howler
  uses `html5: true` for music so files stream and don't need full
  decode in memory.
- **SFX**: short `.mp3` or `.ogg`, ≤ 50 KB each. Decoded into memory
  for instant trigger.

## Adding a new theme

1. Add a new key to `AUDIO_THEME` in
   `src/constants/audio.ts`.
2. Add a new `ThemeManifest` and register it in `THEMES` inside
   `src/assets/audio/themes/manifests.ts`.
3. Drop matching audio files under
   `public/audio/themes/<your-theme-id>/…`.

The theme picker in `<AudioSettings />` and the AudioManager's
resolver pick it up automatically — **no component code needs to
change**.
