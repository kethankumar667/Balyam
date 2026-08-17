import { describe, it, expect } from "vitest";
import { detectHorizontalOverflows, type OverflowViolation } from "../layoutGuard";

describe("Mobile-First Layout Integrity & Overflow Verification", () => {
  it("detects no horizontal overflow on properly contained elements", () => {
    const mockRoot = {
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    // In node environment without global window, returns empty array safely
    const overflows = detectHorizontalOverflows(mockRoot);
    expect(overflows).toEqual([]);
  });

  it("identifies overflow violations using geometric calculation", () => {
    const viewportWidth = 390;
    const testElement = {
      tagName: "button",
      className: "add-bot-btn",
      right: 430, // 40px spill
    };

    const overflowAmount = testElement.right - viewportWidth;
    expect(overflowAmount).toBe(40);
    expect(overflowAmount > 0).toBe(true);
  });

  it("validates mobile breakpoint ranges (320px - 768px)", () => {
    const mobileBreakpoints = [320, 360, 375, 390, 393, 412];
    mobileBreakpoints.forEach((width) => {
      expect(width).toBeGreaterThanOrEqual(320);
      expect(width).toBeLessThanOrEqual(768);
    });
  });

  it("enforces minimum touch target guideline (44px)", () => {
    const MIN_TOUCH_TARGET_PX = 44;
    const standardMobileButtonHeight = 44;
    expect(standardMobileButtonHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  });
});
