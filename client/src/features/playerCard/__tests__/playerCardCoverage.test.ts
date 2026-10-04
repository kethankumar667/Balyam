import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every face at a table must open a player card, and a new game must not be
 * able to forget.
 *
 * Wiring is one prop per avatar (`seatId`), which is exactly the kind of thing
 * that is missed when the next game is built. This test reads the game sources
 * and fails on any `<SeatAvatar` element that neither passes `seatId` nor
 * carries an explicit opt-out comment, so the omission shows up in CI instead
 * of in a player's report.
 *
 * ── Limits, stated plainly ────────────────────────────────────────────
 * It sees `<SeatAvatar` only. A game that draws faces with its own component
 * (Ludo, Rummy, UNO and Carrom do) is wrapped in `PlayerCardTrigger` at the
 * call site, and a source scan cannot tell whether a hand-rolled avatar was
 * wrapped. That case is covered by review and by the new-game checklist.
 *
 * ── Opting out ────────────────────────────────────────────────────────
 * A face that should NOT be tappable (a decorative one, or one inside another
 * button) says so on the line above the element:
 *     {/* player-card:none — inside the row's own button *\/}
 */

const GAMES_ROOT = join(__dirname, "..", "..", "..", "games");
const OPT_OUT_MARKER = "player-card:none";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return entry === "__tests__" ? [] : sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

interface SeatAvatarUse {
  line: number;
  props: string;
  precedingLine: string;
}

/** Finds each `<SeatAvatar ...>` element and returns its raw prop text, tracking braces so arrow functions inside props do not end it early. */
function findSeatAvatarUses(source: string): SeatAvatarUse[] {
  const uses: SeatAvatarUse[] = [];
  const lines = source.split("\n");
  const opener = /<SeatAvatar\b/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source)) !== null) {
    let depth = 0;
    let index = match.index + match[0].length;
    for (; index < source.length; index++) {
      const character = source[index];
      if (character === "{") depth++;
      else if (character === "}") depth--;
      else if (character === ">" && depth === 0) break;
    }
    const line = source.slice(0, match.index).split("\n").length;
    uses.push({
      line,
      props: source.slice(match.index, index),
      precedingLine: lines[line - 2] ?? "",
    });
  }
  return uses;
}

describe("player card coverage in games", () => {
  const files = sourceFiles(GAMES_ROOT);

  it("finds the game sources it is meant to guard", () => {
    // A path mistake would make every assertion below pass over nothing.
    expect(files.length).toBeGreaterThan(40);
    const totalUses = files.reduce((sum, file) => sum + findSeatAvatarUses(readFileSync(file, "utf8")).length, 0);
    expect(totalUses).toBeGreaterThan(20);
  });

  it("gives every game SeatAvatar a seatId or an explicit opt-out", () => {
    const unwired: string[] = [];
    for (const file of files) {
      for (const use of findSeatAvatarUses(readFileSync(file, "utf8"))) {
        const optedOut = use.precedingLine.includes(OPT_OUT_MARKER);
        if (!/\bseatId=/.test(use.props) && !optedOut) {
          unwired.push(`${relative(GAMES_ROOT, file)}:${use.line}`);
        }
      }
    }
    expect(unwired, `SeatAvatar without seatId (add seatId={...} or a "${OPT_OUT_MARKER}" comment):\n${unwired.join("\n")}`).toEqual([]);
  });
});
