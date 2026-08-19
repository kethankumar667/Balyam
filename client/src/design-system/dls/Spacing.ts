export const SPACING = {
  // 4px-based standard spatial scale
  scale: {
    1: "4px",   // 0.25rem
    2: "8px",   // 0.5rem
    3: "12px",  // 0.75rem
    4: "16px",  // 1rem
    5: "20px",  // 1.25rem
    6: "24px",  // 1.5rem
    8: "32px",  // 2rem
    12: "48px", // 3rem
    16: "64px", // 4rem
  },
  // Layout spacing patterns
  pagePadding: "py-6 sm:py-10 px-4 sm:px-6 lg:px-8",
  pageMaxWidth: "max-w-6xl mx-auto space-y-6 sm:space-y-8",
  sectionGap: "space-y-6 sm:space-y-8",
  gridGap: "gap-4 sm:gap-6",
  cardPadding: "p-5 sm:p-6",
  panelPadding: "p-4 sm:p-5",
  modalPadding: "p-6 sm:p-8",

  /**
   * Touch-target minimums, as tokens rather than as classes people remember.
   *
   * ── Why these exist ───────────────────────────────────────────────────
   * A browser-measured audit across eleven viewports found 60 controls under
   * WCAG 2.2 AA's 24px floor and 47 more under the product's 44px thumb bar —
   * including a "Back to Lounge" link 16px tall, repeated on five screens. Every
   * one was written by hand with `py-1` or nothing, because the rule lived in a
   * document (`docs/ai/ui-ux-standards.md` §4.1) and not in the design system.
   *
   * A rule you have to remember is a rule that gets missed. These are the rule.
   *
   * ── Which to use ──────────────────────────────────────────────────────
   * • `touchTarget`      — any control a thumb operates. The default.
   * • `touchTargetInline`— text links inside a paragraph, where a 44px box would
   *                        break the line box. Meets the 24px WCAG floor and is
   *                        the ONLY acceptable smaller option.
   * • `touchTargetIcon`  — square icon buttons.
   *
   * Sizes are enforced by `npm run check:mobile-layout`, which measures the
   * rendered rectangle rather than trusting the class list.
   */
  touchTarget: "min-h-[44px] min-w-[44px] inline-flex items-center justify-center",
  touchTargetInline: "min-h-[24px] inline-flex items-center",
  touchTargetIcon: "min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0",
} as const;
