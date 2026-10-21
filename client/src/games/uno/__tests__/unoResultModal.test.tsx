import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Player, UnoPlayerState } from "@shared/types";
import UnoResultModal from "../UnoResultModal";
import { buildUnoStandings, describeSelfResult, describeWinnerPoints, ordinal } from "../unoStandings";

// The celebration, the confetti and the settlement lookup reach for a canvas and the network: none of them is what
// this screen is being tested for.
vi.mock("../uno-confetti", () => ({ fireUnoWinConfetti: vi.fn() }));
vi.mock("../../../animations/card/WinnerCelebration", () => ({ WinnerCelebration: () => null }));
vi.mock("../../../animations/card/VictoryDance", () => ({ VictoryDance: () => null }));
vi.mock("../../../hooks/useMatchSettlement", () => ({
  useMatchSettlement: () => ({ settlement: null }),
  winnerPrizesFor: () => null,
}));

afterEach(cleanup);

const human = (id: string, name: string): Player => ({ id, name, isHost: false, isReady: true, isConnected: true });
const bot = (id: string, name: string, tagline: string): Player =>
  ({ ...human(id, name), isBot: true, botProfile: { tagline } }) as unknown as Player;

function unoState(over: Partial<UnoPlayerState> & { playerOrder: string[] }): UnoPlayerState {
  return {
    kind: "uno",
    phase: "finished",
    scores: {},
    handSizes: {},
    winnerId: null,
    round: 1,
    targetScore: null,
    ...over,
  } as unknown as UnoPlayerState;
}

const names = (id: string) => ({ a: "Khatarnak", b: "Kethan Kumar", c: "Jugadu", d: "Ravi" })[id] ?? id;

describe("uno standings", () => {
  it("ranks by score, and gives players on the same score the same rank", () => {
    const rows = buildUnoStandings(
      unoState({ playerOrder: ["b", "a", "c", "d"], scores: { a: 138, b: 0, c: 0, d: 0 }, winnerId: "a" }),
      [],
      "b",
      names,
    );
    expect(rows.map((r) => [r.id, r.rank, r.isTied])).toEqual([
      ["a", 1, false],
      ["b", 2, true],
      ["c", 2, true],
      ["d", 2, true],
    ]);
    expect(rows[0].isWinner).toBe(true);
    expect(rows[1].isSelf).toBe(true);
  });

  it("keeps seating order between players who tie, so prizes by placement stay where the economy put them", () => {
    const rows = buildUnoStandings(unoState({ playerOrder: ["d", "c", "b"], scores: { b: 5, c: 5, d: 5 } }), [], null, names);
    expect(rows.map((r) => r.id)).toEqual(["d", "c", "b"]);
  });

  it("reports cards left, or nothing for a seat the server did not mention", () => {
    const rows = buildUnoStandings(unoState({ playerOrder: ["a", "b"], scores: { a: 10 }, handSizes: { a: 0 } }), [], null, names);
    expect(rows[0].cardsLeft).toBe(0);
    expect(rows[1].cardsLeft).toBeNull();
  });

  it("writes ordinals the way people say them", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 102, 111].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "102nd", "111th"]);
  });

  it("words the viewer's own result, and says when it is shared", () => {
    expect(describeSelfResult({ rank: 2, isTied: false })).toBe("You finished 2nd");
    expect(describeSelfResult({ rank: 2, isTied: true })).toBe("You tied for 2nd");
  });

  it("words the winner's points as a running total for a multi-round match and a haul for a single round", () => {
    expect(describeWinnerPoints(138, null, 1)).toBe("+138 pts");
    expect(describeWinnerPoints(310, 500, 3)).toBe("310 pts · 3 rounds");
    expect(describeWinnerPoints(60, 500, 1)).toBe("60 pts · 1 round");
  });
});

// jsdom applies no stylesheet, so layout cannot be measured here; it was measured in a real browser across 20 phone and
// tablet viewports, three font sizes and nine scenarios. What can be held is the structure that made those results
// true, so a later edit cannot quietly undo it.
describe("the results screen's responsive structure", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const modalSource = readFileSync(join(dir, "..", "UnoResultModal.tsx"), "utf8");
  const tailwindConfig = readFileSync(join(dir, "..", "..", "..", "..", "tailwind.config.js"), "utf8");

  it("registers `roomy:` before `short-land:`, because the later variant wins a tie and 'two columns, but tighter' needs that", () => {
    const roomy = tailwindConfig.indexOf('addVariant("roomy"');
    const shortLand = tailwindConfig.indexOf('addVariant("short-land"');
    expect(roomy).toBeGreaterThan(-1);
    expect(shortLand).toBeGreaterThan(roomy);
  });

  it("gives a phone held sideways the two-pane layout, which a width-only breakpoint would not", () => {
    const query = tailwindConfig.match(/addVariant\("roomy",\s*"([^"]*)"/)?.[1] ?? "";
    expect(query).toContain("min-width: 768px");
    expect(query).toContain("orientation: landscape");
    expect(query).toContain("max-height: 520px");
  });

  it("switches layout on `roomy:`, never on a width-only breakpoint", () => {
    const widthOnly = modalSource.match(/(^|[\s"`])(sm|md|lg|xl|2xl):/g) ?? [];
    expect(widthOnly).toEqual([]);
  });

  it("sizes the skeleton in px, so a larger system font grows the text and not the avatars, badges and columns", () => {
    // These rem-based sizes are what squeezed every name at a 150% font; they are written in px now.
    for (const remSized of [/\bh-9 w-9\b/, /\bh-10 w-10\b/, /\bw-10 shrink-0\b/, /\bw-12 shrink-0\b/, /\bh-7 w-7\b/, /\bh-11 w-11\b/]) {
      expect(modalSource).not.toMatch(remSized);
    }
  });

  it("keeps the standings list as the scrolling region of the right-hand pane", () => {
    // The winner pane may scroll as a last resort at an extreme font size; the standings list is the one that always can.
    expect(modalSource.match(/overflow-y-auto/g)?.length).toBe(2);
    expect(modalSource).toMatch(/<ol className="[^"]*overflow-y-auto/);
  });
});

describe("the UNO results screen", () => {
  const base = unoState({
    playerOrder: ["b", "a", "c", "d"],
    scores: { a: 138, b: 0, c: 0, d: 0 },
    handSizes: { a: 0, b: 7, c: 3, d: 1 },
    winnerId: "a",
  });
  const players = [human("a", "Khatarnak"), human("b", "Kethan Kumar"), human("c", "Jugadu"), bot("d", "Ravi", "Plays it safe")];

  it("names the winner and their points", () => {
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "Khatarnak wins!" })).toBeInTheDocument();
    expect(screen.getByText("+138 pts")).toBeInTheDocument();
  });

  it("tells the winner they won", () => {
    render(<UnoResultModal state={base} players={players} selfId="a" onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "You win!" })).toBeInTheDocument();
  });

  it("puts a loser's own result in the header, not down the list", () => {
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/You tied for 2nd/)).toBeInTheDocument();
    expect(within(dialog).getByText(/7 cards left/)).toBeInTheDocument();
  });

  it("shows no 'your result' line to the winner, whose headline already says it", () => {
    render(<UnoResultModal state={base} players={players} selfId="a" onClose={() => {}} />);
    expect(screen.queryByText(/You finished|You tied/)).toBeNull();
  });

  it("lists every player with their rank, cards left and score", () => {
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={() => {}} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("Khatarnak")).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText("138 points")).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText("0 cards left")).toBeInTheDocument();
    expect(within(rows[1]).getByLabelText("Rank 2, tied")).toBeInTheDocument();
    expect(within(rows[1]).getByText("You")).toBeInTheDocument();
    expect(within(rows[3]).getByLabelText("1 cards left")).toBeInTheDocument();
  });

  it("keeps a bot's tagline on the row", () => {
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={() => {}} />);
    expect(screen.getByText("Plays it safe")).toBeInTheDocument();
  });

  it("holds a full ten-seat table in one list, with the standings as the only scrolling region", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const state = unoState({
      playerOrder: ids,
      scores: Object.fromEntries(ids.map((id, i) => [id, 100 - i * 10])),
      handSizes: Object.fromEntries(ids.map((id, i) => [id, i])),
      winnerId: "p0",
    });
    render(<UnoResultModal state={state} players={ids.map((id) => human(id, id.toUpperCase()))} selfId="p9" onClose={() => {}} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    // The old scorecard nested a 175px scroller inside a second one, so only two and a half rows ever showed.
    expect(screen.getByRole("dialog").querySelectorAll(".overflow-y-auto")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("starts on Continue, the safe action", async () => {
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus());
  });

  it("closes from Continue and the close button, and leaves from Leave table", () => {
    const onClose = vi.fn();
    const onLeave = vi.fn();
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={onClose} onLeave={onLeave} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /Leave table/ }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("falls back to closing when no leave handler is given", () => {
    const onClose = vi.fn();
    render(<UnoResultModal state={base} players={players} selfId="b" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Leave table/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reads 'Round over' with no points line when nobody won", () => {
    render(<UnoResultModal state={unoState({ playerOrder: ["a", "b"] })} players={players} selfId="b" onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "Round over" })).toBeInTheDocument();
    // The winner's points chip ("+138 pts") is gone; the viewer's own result line still reports their score.
    expect(screen.queryByText(/^\+\d+ pts$/)).toBeNull();
  });
});
