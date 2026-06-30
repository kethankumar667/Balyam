# Bhalyam Rummy — Anti-Patterns

What we will **not** build. Read this before pitching any new feature. Anything on this list is rejected by default — bringing it back requires explicit, recorded approval.

## Hard "no"s — monetisation & money

| Anti-pattern | Why we say no |
|---|---|
| Real-money rummy / cash entry tables | Not the product. Not the brand. Permanent. |
| Wallets, deposits, withdrawals, "add funds" | Same. |
| Coin/gem currencies redeemable for anything | The moment a token has external value, every other anti-pattern below becomes a financial incentive to ship. |
| "Buy 50,000 chips for ₹99" | No. |
| Skin/cosmetic stores priced in real currency | If we ever introduce skins, they unlock through play history, not purchase. |
| Daily ad walls / interstitials between rounds | Breaks ritual. Hostile. |
| Rewarded ads for joker / undo / extra time | Turns the game into a slot machine. |

## Hard "no"s — engagement coercion

| Anti-pattern | Why we say no |
|---|---|
| Streak-loss anxiety ("Play today or lose your 12-day streak!") | The brief says the game does not beg. |
| Time-limited "Last chance!" events | Same. Manufactured FOMO is the opposite of nostalgia. |
| Push notifications nudging idle players | Bhalyam invites, never demands. |
| Energy / stamina systems gating play | Players sit down when they sit down. |
| Battle passes, seasons, tiers, XP grinds | Reframes friendship as content treadmill. |
| Loot boxes / gacha — even cosmetic-only | Slot-machine psychology. Off-brand. |
| Auto-rejoining a player to a "tournament" without consent | Surprises only delight when they're not transactional. |

## Hard "no"s — UX tropes that wreck the room

| Anti-pattern | Why we say no |
|---|---|
| Casino jingles, slot-machine spinners, neon-glow chips | Wrong aesthetic. Wrong feeling. |
| Big "WINNER!" banners with confetti cannons | The brief says the score sheet *quietly* circles a name. |
| Hostile leaderboards (global top 100, public shame) | Within a *room*, ranking is fine. Across the platform, no. |
| "Pro tips" interstitials between rounds | Patronising. Microcopy carries warmth, not tutoring. |
| Live-coaching overlays ("Your best move: discard 8♠") | Removes the *thinking* that makes rummy rummy. |
| Spectator chat with strangers | The room is closed by design. Friends only. |
| "Trash talk" emote sets aimed at opponents | Banter is welcome; weaponised emotes are not. |
| Skip-the-turn / auto-play for "convenience" | Replaces presence with absence. The whole point is being there. |

## Hard "no"s — engine & rules

| Anti-pattern | Why we say no |
|---|---|
| Letting the client compute valid declarations | Server-authoritative. Don't regress this. |
| Hidden information on a shared device | Rummy is permanently excluded from Pass & Play for this reason — see `RoomManager.ts`. |
| "Helpful" auto-arrange that secretly improves your hand | Auto-arrange visualises; it never reorders cards across hands or invents melds. |
| Visible-to-others draw/discard during another player's turn | Breaks the turn boundary. Confuses everyone. |
| Showing other players' hand sizes inaccurately | Reduces trust. |

## "Yes, but carefully" — things that look like an anti-pattern but aren't

These are allowed; they just have to be done in the brief's voice.

| Allowed | What "carefully" means |
|---|---|
| Bot personalities | They get *one* line of flavour text per match. Not a chat torrent. |
| Festival skins (Diwali diya, Sankranti kite) | Time-window only, never paywalled, never tied to a "miss-this-and-it's-gone" countdown timer. |
| Match history surfacing past wins | Photo-album voice, never leaderboard voice. |
| Share-to-WhatsApp room invites | One tap, no friend-of-friend mining, no contact-list scraping. |
| Per-room "house champion" titles | Scoped to the room. Nothing platform-wide. |

## How to add to this list

When you spot a new anti-pattern in the wild — open a PR adding it here with a one-line "why we say no". Keep the section it lives in consistent. The doc should grow over time; lessons learned belong here, not in commit messages that nobody re-reads.
