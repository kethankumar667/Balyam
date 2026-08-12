# BHALYAM Audio Assets

This folder is served verbatim by Vite at runtime. Drop your audio files
here following the structure below — the `AudioManager` references them
via `/audio/themes/<theme>/<category>/<file>`.

Missing files **do not crash** the app — the manager swallows load
errors and logs a single console warning in development.

## Placeholders (read this first)

No real recordings exist yet. Because missing files fail silently, that
made the app **completely silent in production** with nothing pointing at
the cause.

`client/scripts/gen-placeholder-audio.mjs` synthesizes a stand-in for every
one of the 195 URLs named in `src/assets/audio/themes/manifests.ts`:

```
npm run audio:placeholders           # generate (skips existing)
npm run audio:placeholders -- --force  # regenerate everything
```

It also runs automatically before `npm run dev`. Output is gitignored —
it is ~7 MB of throwaway audio, rebuilt from the manifest in a second.

Placeholders are written as **`.wav` siblings** (`dice.mp3` → `dice.wav`),
because encoding MP3 would mean a build dependency for disposable assets.
`AudioManager.tryPlaceholderFallback` retries the `.wav` when the `.mp3`
404s, so:

> **Dropping a real `.mp3` at the path the manifest names makes it win
> immediately.** No code change, no manifest change — the fallback just
> stops firing for that file.

The synthesized sounds are deliberately plain. They exist to prove the
wiring, the volume buses, the theme picker and the crossfade all work —
not to be shipped to players.

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
