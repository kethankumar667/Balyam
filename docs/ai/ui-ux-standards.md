# BHALYAM UI/UX & Gaming Experience Standards

> **Design Language System:** BHALYAM DLS + Premium Gaming Tokens  
> **Target Audience:** Casual, Competitive, and Social Players  
> **Aesthetic Philosophy:** *Warm parchment in light mode, deep navy in dark mode, nostalgic gilded accents, readable hierarchy and purposeful feedback.*

---

## 1. Design Language System (DLS) Principles

1. **Zero Ad-Hoc Styling**:
   - Never invent arbitrary hex colors (e.g., `#382914`, `#992211`) in component markup.
   - All surfaces, typography, borders, and shadows must be referenced from `client/src/design-system/dls/` and `client/src/design-system/premium/`.
2. **5 Core Visual Pillars**:
   - **Pillar 1: Theme-complete Gaming** — Shared lounge panels and text use paired `--chrome-*` tokens in both document themes; individual game worlds retain their identity.
   - **Pillar 2: Purposeful Motion** — Hover/press feedback must not be required to understand an action. Suppress decorative transforms, pulse and spin for `prefers-reduced-motion`.
   - **Pillar 3: Immediate Feedback** — Show pending, success and failure states explicitly. Respect audio/haptic preferences rather than making every action noisy.
   - **Pillar 4: Uncompromising Accessibility & Ergonomics** — Touch targets >= 44x44px, safe area notch compliance, WCAG 2.1 AA contrast.
   - **Pillar 5: Cohesive Gaming Hierarchy** — Unmistakable rank tiers, achievement rarities, and championship badges.

---

## 2. Color Palette & Thematic Hierarchy

```
┌────────────────────────────────────────────────────────┐
│ BHALYAM CORE PALETTE TOKENS                            │
├────────────────────────────────────────────────────────┤
│ • Primary Brand Gold:    #F59E0B (Amber 500) / #D97706 │
│ • Deep Gaming Obsidian:  #070B14 (Surface 0)           │
│ • Elevated Dark Surface: #0E1526 (Surface 1)           │
│ • Border Rail Gray:      #292524 (Stone 800 / 850)     │
│ • Victory Emerald:       #10B981 (Success / Ready)     │
│ • Danger Crimson:        #EF4444 (Disband / Out)       │
│ • Arcane Celestial:      #8B5CF6 (Season / Epic)       │
└────────────────────────────────────────────────────────┘
```

### Competitive Rank Colors (`PREMIUM_RANK_COLORS`)
- **Bronze**: `#CD7F32` (Metallic Bronze)
- **Silver**: `#C0C0C0` (Polished Chrome)
- **Gold**: `#FFD700` (Radiant Gold)
- **Platinum**: `#00CED1` (Cyan Luster)
- **Diamond**: `#B9F2FF` (Crystalline Diamond)
- **Master**: `#9932CC` (Imperial Amethyst)
- **Grandmaster / Vanguard**: `#FF4500` (Solar Phoenix Glow)

---

## 3. Typography Hierarchy (`TYPOGRAPHY`)

All typography must adhere to the standardized typographic scale:
- **Hero Title**: `TYPOGRAPHY.heroTitle` (24/30/36px), adaptive chrome ink.
- **Page Title**: `TYPOGRAPHY.pageTitle` (20/24/30px), adaptive chrome ink.
- **Section Header**: `TYPOGRAPHY.sectionHeader` (16/18px), not small uppercase metadata.
- **Card Title**: `TYPOGRAPHY.cardTitle` (14/16px).
- **Body Text**: `TYPOGRAPHY.body` / `bodySubtle` (14px), adaptive soft ink.
- **Caption**: `TYPOGRAPHY.caption` (12px), adaptive soft ink.
- **Pill / Badge Label**: `TYPOGRAPHY.metaPill`; reserve small uppercase labels for short metadata, never instructions.

---

## 4. Mobile Ergonomics & Responsive Standards

1. **Strict 44x44px Touch Target Rule**:
   - Every clickable button, avatar, filter tab, icon toggle, and dice trigger must measure at least `44px × 44px` on mobile screens (`<768px`).
   - Add `min-h-[44px] min-w-[44px]` or adequate padding (`p-2.5` to `p-3`).
2. **Safe Area Insets**:
   - Use `.pt-safe`, `.pb-safe`, `.pl-safe`, and `.pr-safe` for notched screens, Dynamic Island, and virtual home bars.
3. **Touch Responsiveness**:
   - All interactive controls must specify `touch-action: manipulation;` and `-webkit-tap-highlight-color: transparent;` to eliminate 300ms touch delay and grey tap highlights.
4. **Horizontal Swipe Guides**:
   - Any horizontally scrollable element on mobile (brackets, filter pills, roster rails) must use `.touch-pan-x` and display a subtle visual swipe indicator.
   - A scroll cue that is a button must be keyboard reachable, named and at least
     44px wide. Hide inactive cues from assistive technology and pointer input.
   - Reveal category selections with `scrollIntoViewHorizontally`; do not call
     `scrollIntoView` on a below-the-fold rail, which also scrolls the page.

---

## 5. State Handling Excellence

### Empty States (`EmptyStateIllustration`)
- Never show blank space or plain text `"No items"`.
- Provide an icon, bold headline, explanatory copy, and a direct action CTA:
  ```tsx
  <EmptyStateIllustration
    type="tournaments"
    title="No Tournaments In Progress"
    description="Check the seasonal calendar or register for the next weekend knockout cup."
    actionText="Browse Seasons"
    onAction={() => navigate('/tournaments?tab=season')}
  />
  ```

### Loading Skeletons (`SkeletonLoader`)
- Use skeleton layouts matching the target content (`hero`, `card`, `profile`, `table`, `grid`).
- Expose one named busy status; hide decorative blocks from assistive technology.
- Use adaptive chrome control colors, fluid widths and wrapping placeholder actions.
- Disable pulse for OS reduced motion. A visible text loading status is appropriate
  where there is no meaningful content shape to preview.

### Error Fallbacks (`PremiumErrorState`)
- Display glowing danger border, friendly gaming diagnostic copy, and a prominent retry button.

---

## 6. Motion & Animation Standards

1. **Framer Motion Presets**: Use standardized springs from `client/src/lib/motion.ts` (`bhalyamSpring`, `tileHover`, `ctaPress`).
2. **Hardware Acceleration**: Animate only `transform` and `opacity` for buttery 60/120fps performance on mobile.
3. **Respect `prefers-reduced-motion`**: When reduced motion is requested, instantly set transition durations to 0.
