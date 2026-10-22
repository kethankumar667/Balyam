import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The announcer keeps its on/off choice in module state seeded from localStorage at import, so each test
 * loads a fresh copy after setting up the storage it wants to start from.
 */
const KEY = "bhalyam.bingo.callout";

const speak = vi.fn();
const cancel = vi.fn();

class FakeUtterance {
  lang = "";
  rate = 1;
  pitch = 1;
  voice: unknown = null;
  constructor(public text: string) {}
}

async function loadAnnouncer() {
  vi.resetModules();
  return import("../announcer");
}

beforeEach(() => {
  speak.mockClear();
  cancel.mockClear();
  window.localStorage.removeItem(KEY);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak, cancel, getVoices: () => [] },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.removeItem(KEY);
});

describe("calling numbers out loud", () => {
  it("is off until the player turns it on, so a new player hears nothing", async () => {
    const { announceNumber, isCallOutEnabled } = await loadAnnouncer();

    announceNumber(17, "en");

    expect(isCallOutEnabled()).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  it("speaks the number once the player switches it on", async () => {
    const { announceNumber, setCallOutEnabled } = await loadAnnouncer();

    setCallOutEnabled(true);
    announceNumber(17, "en");

    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0][0] as FakeUtterance).text).toBe("17");
  });

  it("stops speaking, and goes quiet mid-sentence, the moment it is switched off", async () => {
    const { announceNumber, setCallOutEnabled } = await loadAnnouncer();
    setCallOutEnabled(true);
    cancel.mockClear();

    setCallOutEnabled(false);
    announceNumber(4, "en");

    expect(cancel).toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
  });

  it("remembers the choice on the device, as 1 or 0", async () => {
    const first = await loadAnnouncer();
    first.setCallOutEnabled(true);
    expect(window.localStorage.getItem(KEY)).toBe("1");

    const reloaded = await loadAnnouncer();
    expect(reloaded.isCallOutEnabled()).toBe(true);

    reloaded.setCallOutEnabled(false);
    expect(window.localStorage.getItem(KEY)).toBe("0");
    expect((await loadAnnouncer()).isCallOutEnabled()).toBe(false);
  });

  it("treats anything but 1 as off, so a stray stored value never turns the voice on", async () => {
    window.localStorage.setItem(KEY, "true");

    expect((await loadAnnouncer()).isCallOutEnabled()).toBe(false);
  });

  it("tells every board when the choice changes, and stops telling one that has left", async () => {
    const { setCallOutEnabled, subscribeCallOut } = await loadAnnouncer();
    const listener = vi.fn();
    const unsubscribe = subscribeCallOut(listener);

    setCallOutEnabled(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setCallOutEnabled(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing, and does not tell anyone, when set to the value it already has", async () => {
    const { setCallOutEnabled, subscribeCallOut } = await loadAnnouncer();
    const listener = vi.fn();
    subscribeCallOut(listener);

    setCallOutEnabled(false);

    expect(listener).not.toHaveBeenCalled();
  });

  it("still keeps the choice for this visit when the browser will not store it", async () => {
    const { setCallOutEnabled, isCallOutEnabled } = await loadAnnouncer();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => setCallOutEnabled(true)).not.toThrow();
    expect(isCallOutEnabled()).toBe(true);

    setItem.mockRestore();
  });

  it("costs the player nothing on a browser with no speech support", async () => {
    // @ts-expect-error — simulating a browser without the API
    delete window.speechSynthesis;
    const { announceNumber, setCallOutEnabled } = await loadAnnouncer();

    setCallOutEnabled(true);

    expect(() => announceNumber(9, "en")).not.toThrow();
  });
});
