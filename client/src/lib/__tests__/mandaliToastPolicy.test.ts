import { describe, it, expect } from "vitest";
import { decideToast, CHAT_TOAST_COOLDOWN_MS, type ToastContext } from "../mandaliToastPolicy";

const ctx = (over: Partial<ToastContext> = {}): ToastContext => ({
  level: "ALL",
  isInvite: false,
  isViewingThisMandali: false,
  isInRoom: false,
  chatToastOnScreen: false,
  lastChatToastAt: null,
  now: 1_000_000,
  ...over,
});

describe("decideToast", () => {
  it("lets the first chat message in a Mandali through", () => {
    expect(decideToast(ctx())).toBe("chat-new");
  });

  it("updates the toast already on screen instead of stacking another", () => {
    expect(decideToast(ctx({ chatToastOnScreen: true, lastChatToastAt: 999_000 }))).toBe("chat-update");
  });

  it("stays quiet for a while after a chat toast has gone away", () => {
    const now = 1_000_000;
    expect(decideToast(ctx({ now, lastChatToastAt: now - (CHAT_TOAST_COOLDOWN_MS - 1) }))).toBe("none");
    expect(decideToast(ctx({ now, lastChatToastAt: now - CHAT_TOAST_COOLDOWN_MS }))).toBe("chat-new");
  });

  it("always gives a shared room its own toast — even mid-cooldown, even with a chat toast up", () => {
    expect(decideToast(ctx({ isInvite: true, chatToastOnScreen: true, lastChatToastAt: 999_999 }))).toBe("invite");
  });

  it("never interrupts a match, not even for an invitation", () => {
    expect(decideToast(ctx({ isInRoom: true }))).toBe("none");
    expect(decideToast(ctx({ isInRoom: true, isInvite: true }))).toBe("none");
  });

  it("never notifies about the chat you are reading", () => {
    expect(decideToast(ctx({ isViewingThisMandali: true }))).toBe("none");
    expect(decideToast(ctx({ isViewingThisMandali: true, isInvite: true }))).toBe("none");
  });

  it("MUTED is silent for everything", () => {
    expect(decideToast(ctx({ level: "MUTED" }))).toBe("none");
    expect(decideToast(ctx({ level: "MUTED", isInvite: true }))).toBe("none");
  });

  it("INVITES_ONLY lets an invitation through and blocks chat", () => {
    expect(decideToast(ctx({ level: "INVITES_ONLY", isInvite: true }))).toBe("invite");
    expect(decideToast(ctx({ level: "INVITES_ONLY" }))).toBe("none");
    expect(decideToast(ctx({ level: "INVITES_ONLY", chatToastOnScreen: true }))).toBe("none");
  });

  describe("a group notice (someone joined)", () => {
    it("is told at the loudest setting only", () => {
      expect(decideToast(ctx({ isNotice: true }))).toBe("notice");
      expect(decideToast(ctx({ isNotice: true, level: "INVITES_ONLY" }))).toBe("none");
      expect(decideToast(ctx({ isNotice: true, level: "MUTED" }))).toBe("none");
    });

    it("never interrupts a match or the chat being read", () => {
      expect(decideToast(ctx({ isNotice: true, isInRoom: true }))).toBe("none");
      expect(decideToast(ctx({ isNotice: true, isViewingThisMandali: true }))).toBe("none");
    });

    it("is not held back by the chat cooldown or a chat toast already up", () => {
      expect(decideToast(ctx({ isNotice: true, chatToastOnScreen: true, lastChatToastAt: 999_999 }))).toBe("notice");
    });
  });
});
