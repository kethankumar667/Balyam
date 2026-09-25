# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who already know each other and want to stay close: close friend groups (about 5 to 20 people: college friends, old neighbours, a cricket gang), extended families (cousins, parents and grandparents together), and work or hobby circles that already trust each other. They are mostly on mobile phones, including budget Android, and switch between Telugu, Hindi and English. A group often spans several generations, so what suits the least technical member has to work for everyone.

For a Mandali (a private group inside BHALYAM) the job is to talk, play a game together, share a room code, keep memories, and feel close to people who are far away.

## Product Purpose

BHALYAM is a web-based lounge for playing classic multiplayer games with friends and family. Its purpose is to reduce the distance between people who already know each other by connecting them virtually, and to strengthen the emotional bond between them. It is not a social network, and it is not built for online gaming for its own sake, betting, fraud or toxicity.

A Mandali is the private, lasting home for one such group. Success is a group that keeps coming back to each other, not a group that spends more minutes in the app.

## Positioning

A private, lasting home for people who already know each other, where playing together, talking and keeping memories happen in one place. It has no public discovery of strangers, no follower counts, no feeds and no wagering. Neighbouring products (general chat apps, public game platforms, social networks) are built for reach or engagement; this one is built for closeness.

## Operating Context

- Mobile first. A Mandali is used one-handed on a phone far more than on a desktop, and both must be first-class layouts.
- Guests can play games freely. A Mandali (its chat, members and controls) is for signed-in members only.
- People arrive from a shared link or invite, often from a chat app, and need to be inside in a few taps.
- Roles: the owner (host), admins and ordinary members. The owner can hand over the group and leave, or delete the Mandali permanently.
- Groups are small and personal, so a quiet moment is normal and should not feel like failure.

## Capabilities and Constraints

Existing capabilities: group chat with replies, reactions, pinned and deleted messages; sharing a game room to the group as a live join card; a fixed-size coin request between members; parties and game launches; a memory timeline called Gnapakalu; events; invite links and join requests; member roles and management; per-group notification levels; a new-member join notice; leaving (a host must hand over first) and permanent deletion by the owner.

Constraints future work must preserve:
- The design system in `docs/ai/bhalyam-design-system.md`, and its rule to consume the shared primitives rather than one-off styling.
- Separate, dedicated mobile (320 to 767 px) and desktop (1024 px and up) layouts, both designed. 44 by 44 px minimum touch targets, and no hover-only interactions.
- Dark and light themes that both work fully (panels and text flip together).
- WCAG 2.1 AA, visible keyboard focus, and reduced-motion respected.
- Never use the `Sparkles` icon from lucide-react anywhere.
- No dark patterns, no artificial urgency, no intrusive overlays, no real-money mechanics.
- India's DPDP Act applies to any personal data. Message retention is one year.

A translation system already exists (English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, with an English fallback and `t()` keys in `client/src/i18n/locales/`), but none of the Mandali screens use it yet, so their copy is English-only. Undecided: how minors are handled.

## Brand Commitments

The names BHALYAM, Mandali and Gnapakalu (Telugu for "memories") are binding. The user asked for a design that is neat, clean, professional and emotional. That is recorded here as a binding requirement, and it is not expanded into a visual direction.

## Evidence on Hand

The real product exists and runs: the current Mandali screens are in `client/src/pages/mandali/` and `client/src/components/mandali/`. There are no real customer testimonials, usage numbers or photographs of real groups. Future work must not invent any.

## Product Principles

1. Closeness over reach. Every element should deepen a relationship that already exists.
2. Private and calm by default. Nothing is broadcast, ranked or urgent; quiet is fine.
3. Legible to every generation. The least technical member of the group sets the bar for clarity.
4. Warm without being childish, and professional without being cold.
5. Never at the expense of trust: destructive actions are deliberate, and people always know what will happen.

## Accessibility & Inclusion

WCAG 2.1 AA, as set out in `docs/ai/accessibility-standards.md`. Multi-generation use means large legible text, clear labels rather than icon-only controls, and forgiving touch targets. Content may mix Telugu, Hindi and English scripts in one screen.
