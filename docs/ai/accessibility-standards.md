# BHALYAM Accessibility (A11y) Standards

> **Compliance Target:** WCAG 2.1 Level AA  
> **Philosophy:** Inclusive, barrier-free gaming for all players across all abilities and devices.

---

## 1. Core WCAG 2.1 AA Requirements

1. **Color Contrast Ratios**:
   - **Body and UI Text**: Minimum **4.5:1** contrast ratio against the background surface.
   - **Large Headings & Badges (>=18pt)**: Minimum **3.0:1** contrast ratio.
   - **Interactive Borders & Icons**: Minimum **3.0:1** contrast ratio.
2. **Keyboard Traversal & Focus Management**:
   - Every interactive control must be reachable and operable using only the keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `ArrowKeys`, `Escape`).
   - **Focus Rings**: Standardized `:focus-visible` styling with `outline: 2px solid #F59E0B; outline-offset: 2px;`. Never use `outline: none;` without an explicit accessible replacement.
3. **Focus Trapping in Dialogs & Modals**:
   - When a modal, bottom sheet, or game-over dialog opens, focus must be trapped within the active dialog.
   - Pressing `Escape` must dismiss the dialog and restore keyboard focus to the triggering element.

---

## 2. Screen Reader & ARIA Implementation

1. **Semantic HTML First**:
   - Use native `<button>`, `<input>`, `<nav>`, `<main>`, `<header>`, `<section>`, and `<dialog>` tags instead of unsemantic `<div>` click listeners.
2. **Accessible Labels for Icon Controls**:
   - Every icon button (sound toggle, chat send, leave room, dice roll) must declare an `aria-label` or include a `<span className="sr-only">Label</span>`:
     ```tsx
     <button
       type="button"
       onClick={toggleAudio}
       aria-label={isMuted ? "Unmute audio" : "Mute audio"}
       className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl ..."
     >
       <VolumeIcon size={20} aria-hidden="true" />
     </button>
     ```
3. **Live Announcements (`aria-live`)**:
   - Dynamic game events (turn timers under 10 seconds, dice rolls, player joins, chat messages) must notify assistive technology using `aria-live="polite"` or `aria-live="assertive"`.

---

## 3. Gaming-Specific Accessibility

1. **Multi-Sensory Feedback**:
   - Never convey game state changes through color alone. Always pair color changes with text, iconography, sound effects, or haptic vibrations.
2. **Reduced Motion (`prefers-reduced-motion`)**:
   - Respect user preferences for reduced motion. Disable particle confetti, bouncy spring entrance transforms, and background auras when active.
3. **Text Scaling & Zoom**:
   - Layouts must support browser zoom scaling up to **200%** without text clipping, container overflow, or unreadable horizontal overlaps.
