import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { HcState } from "@shared/types";
import { CricbuzzHeader } from "../cricbuzz/CricbuzzHeader";
import { DoordarshanHeader } from "../doordarshan/DoordarshanHeader";
import { HC_SKINS } from "../hc-skin";
import { Doordarshan3DMilestone } from "../animations3d/themes/doordarshan/Doordarshan3DMilestone";

const state: HcState = {
  kind: "handcricket",
  phase: "teamSelect",
  playerOrder: ["p0", "p1"],
  options: { format: "t20", mode: "single", category: "ipl" },
  teamSelections: {
    p0: { teamId: "csk", squadPlayerIds: null, captainId: null },
    p1: { teamId: "rcb", squadPlayerIds: null, captainId: null },
  },
  tossCallerId: "p0", tossCall: null, tossPicks: {}, tossSum: null, tossWinnerId: null,
  innings1: null, innings2: null, pendingPicks: {}, winnerId: null, result: null,
  maxWickets: 10, inningsBreakUntil: null, inningsBreakReady: [], oversPerInnings: 10,
  startedAt: 0, turnDeadline: null,
};

afterEach(cleanup);

describe("Hand Cricket broadcast identity", () => {
  it.each([
    { Header: CricbuzzHeader, title: "BHALYAM Live Score" },
    { Header: DoordarshanHeader, title: "Retro Broadcast" },
  ])("renders $title and fictional team abbreviations", ({ Header, title }) => {
    const { container, getByText, getAllByText } = render(<Header state={state} players={[]} selfId="p0" />);
    expect(getAllByText(title).length).toBeGreaterThan(0);
    expect(getByText("CCO")).toBeDefined();
    expect(getByText("BLZ")).toBeDefined();
    expect(container.textContent).not.toMatch(/cricbuzz|doordarshan|\bCSK\b|\bRCB\b/);
  });

  it.each([CricbuzzHeader, DoordarshanHeader])("handles seats without a chosen team", (Header) => {
    const { getByText } = render(
      <Header state={{ ...state, teamSelections: { p0: null, p1: null } }} players={[]} selfId="p0" />,
    );
    expect(getByText("TEAM 1")).toBeDefined();
    expect(getByText("TEAM 2")).toBeDefined();
  });

  it("preserves preference ids but only offers neutral labels", () => {
    expect(HC_SKINS.find((s) => s.id === "cricbuzz")?.label).toBe("Live Score");
    expect(HC_SKINS.find((s) => s.id === "doordarshan")?.label).toBe("Retro Broadcast");
  });

  it("does not reintroduce a broadcaster name in the Hindi milestone caption", () => {
    const { container } = render(<Doordarshan3DMilestone batter="Batter" runs={100} balls={48} />);
    expect(container.textContent).toContain("खेल प्रसारण");
    expect(container.textContent).not.toMatch(/दूरदर्शन|doordarshan|cricbuzz/i);
  });
});
