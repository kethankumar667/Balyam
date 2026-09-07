import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CountdownNumeral3D, { chromeAccentFor } from "../CountdownNumeral3D";
import { pickCountdownSlogans } from "../countdownSlogans";

/**
 * The shared "3-2-1-GO" numeral both match-start ceremonies
 * (`GameStartSequence` and `BhalyamMatchCountdown`) render — covers the 3D
 * flip badge, the per-game color theme (UNO's card-color cycle, Rummy's
 * felt-and-gold), and the funny per-beat slogan text.
 */
describe("CountdownNumeral3D", () => {
  it("renders the numeral digit and the given slogan for a counting step", () => {
    render(<CountdownNumeral3D step={3} slogan="Get hyped!" />);
    expect(screen.getByTestId("countdown-numeral").textContent).toBe("3");
    expect(screen.getByTestId("countdown-slogan").textContent).toBe("Get hyped!");
  });

  it("renders a GO burst instead of a numeral on the final beat", () => {
    render(<CountdownNumeral3D step="GO" slogan="LET'S GO!" />);
    expect(screen.queryByTestId("countdown-numeral")).toBeNull();
    expect(screen.getByText("GO!")).toBeDefined();
    expect(screen.getByTestId("countdown-slogan").textContent).toBe("LET'S GO!");
  });

  // AnimatePresence keeps the exiting badge mounted alongside the newly
  // entering one for its exit transition, so right after a `rerender()`
  // there can be two `countdown-badge` elements — the last one in DOM
  // order is always the one that just entered.
  function currentChip(): string {
    const badges = screen.getAllByTestId("countdown-badge");
    return badges[badges.length - 1]!.style.getPropertyValue("--chip");
  }

  it("cycles through UNO's four card colors, one per beat", () => {
    const { rerender } = render(<CountdownNumeral3D step={3} game="uno" slogan="x" />);
    const redChip = currentChip();

    rerender(<CountdownNumeral3D step={2} game="uno" slogan="x" />);
    const yellowChip = currentChip();

    rerender(<CountdownNumeral3D step={1} game="uno" slogan="x" />);
    const blueChip = currentChip();

    rerender(<CountdownNumeral3D step="GO" game="uno" slogan="x" />);
    const greenChip = currentChip();

    const chips = [redChip, yellowChip, blueChip, greenChip];
    expect(new Set(chips).size).toBe(4); // all four beats get a genuinely distinct color
  });

  it("holds one steady felt-and-gold identity for Rummy across all four beats", () => {
    const { rerender } = render(<CountdownNumeral3D step={3} game="rummy" slogan="x" />);
    const chipAt3 = currentChip();

    rerender(<CountdownNumeral3D step="GO" game="rummy" slogan="x" />);
    const chipAtGo = currentChip();

    expect(chipAt3).toBe(chipAtGo);
  });
});

describe("chromeAccentFor", () => {
  it("gives UNO and Rummy their own eyebrow label, distinct from the generic one", () => {
    const uno = chromeAccentFor("uno");
    const rummy = chromeAccentFor("rummy");
    const generic = chromeAccentFor(undefined);

    expect(uno.eyebrow).toBe("UNO SHOWDOWN INCOMING");
    expect(rummy.eyebrow).toBe("RUMMY TABLE IS LIVE");
    expect(generic.eyebrow).toBe("MATCH COMMENCED");
  });
});

describe("pickCountdownSlogans", () => {
  it("returns a real UNO line for every beat, not empty/undefined", () => {
    const slogans = pickCountdownSlogans("uno");
    expect(slogans.three.length).toBeGreaterThan(0);
    expect(slogans.two.length).toBeGreaterThan(0);
    expect(slogans.one.length).toBeGreaterThan(0);
    expect(slogans.go.length).toBeGreaterThan(0);
  });

  it("returns different pools for UNO vs Rummy vs a generic game", () => {
    const uno = pickCountdownSlogans("uno");
    const rummy = pickCountdownSlogans("rummy");
    const generic = pickCountdownSlogans("chess");

    // The three pools never overlap by construction — any one pick from each
    // is enough to prove the games get distinct copy, not a shared pool.
    expect(uno.go).not.toBe(rummy.go);
    expect(rummy.go).not.toBe(generic.go);
  });

  it.each(["ludo", "handcricket", "tambola", "bingo"] as const)(
    "returns a real, non-generic line for every beat of %s",
    (game) => {
      const slogans = pickCountdownSlogans(game);
      const generic = pickCountdownSlogans("chess");
      expect(slogans.three.length).toBeGreaterThan(0);
      expect(slogans.two.length).toBeGreaterThan(0);
      expect(slogans.one.length).toBeGreaterThan(0);
      expect(slogans.go.length).toBeGreaterThan(0);
      // Each of these four games gets its own pool, not the generic fallback.
      expect(slogans.go).not.toBe(generic.go);
    },
  );

  it("keeps Tambola and Bingo distinct despite both being number-calling grid games", () => {
    const tambola = pickCountdownSlogans("tambola");
    const bingo = pickCountdownSlogans("bingo");
    expect(tambola.go).not.toBe(bingo.go);
  });
});
