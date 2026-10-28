import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes";
import ScorecardChallengePage from "../ScorecardChallengePage";
import { parseScorecardChallenge, scorecardChallengePath } from "../../lib/scorecardChallenge";

afterEach(cleanup);

function Destination() {
  const { pathname, state } = useLocation();
  return <p>Destination: {pathname} {state?.newRoom}</p>;
}

function draw(search: string) {
  return render(<MemoryRouter initialEntries={[`/challenge${search}`]}>
    <Routes>
      <Route path="/challenge" element={<ScorecardChallengePage />} />
      <Route path="*" element={<Destination />} />
    </Routes>
  </MemoryRouter>);
}

describe("public scorecard challenges", () => {
  it("canonicalizes the saved Tetris alias before sharing", () => {
    const path = scorecardChallengePath("tetris", "arcade_marathon", 1000);
    expect(parseScorecardChallenge(new URL(path, "https://example.test").search))
      .toMatchObject({ config: { game: "brickblocks" }, score: 1000 });
  });

  it.each(Object.values(GAME_MODE_REGISTRY).flatMap(config => config.modes.map(mode => ({ game: config.game, mode }))))(
    "round trips $game/$mode.modeId without dropping the game or mode", ({ game, mode }) => {
      const path = scorecardChallengePath(game, mode.modeId, 123);
      const parsed = parseScorecardChallenge(new URL(path, "https://example.test").search);
      expect(parsed).toMatchObject({ config: { game }, mode: { modeId: mode.modeId }, score: 123 });
    },
  );

  it("shows a room game's target while signed out and launches only on an explicit click", () => {
    draw("?game=handcricket&mode=international_t20&score=184");
    expect(screen.getByRole("heading", { name: "Hand Cricket challenge" })).toBeVisible();
    expect(screen.getByText("184 runs")).toBeVisible();
    expect(screen.getByText("International T20 (10 Overs)")).toBeVisible();
    expect(screen.getByText(/shared by a player.*not a verified record/i)).toBeVisible();
    expect(screen.getByText(/choose.*mode.*setup/i)).toBeVisible();
    expect(screen.queryByText(/Destination:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Play Hand Cricket" }));
    expect(screen.getByText("Destination: / handcricket")).toBeVisible();
  });

  it("formats a timed challenge and uses the existing solo route", () => {
    draw("?game=sudoku&mode=medium&score=300");
    expect(screen.getByText("5m 00s")).toBeVisible();
    expect(screen.getByText("Lower is better")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Play Sudoku Cyber-Matrix" }));
    expect(screen.getByText("Destination: /sudoku")).toBeVisible();
  });

  it.each([
    "", "?game=constructor&mode=medium&score=100", "?game=__proto__&mode=medium&score=100",
    "?game=snl&mode=medium", "?game=snl&mode=medium&score=",
    "?game=snl&mode=medium&score=-1", "?game=snl&mode=medium&score=Infinity",
    "?game=snl&mode=medium&score=NaN", "?game=snl&mode=medium&score=1e999",
    "?game=snl&mode=medium&score=9007199254740992",
    "?game=snl&mode=%3Cscript%3E&score=10", "?game=snl&mode=medium&score=10&score=20",
  ])("shows an explicit unavailable state for malformed input %s", search => {
    draw(search);
    expect(screen.getByRole("heading", { name: "Challenge unavailable" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse games" })).toHaveAttribute("href", "/games");
    expect(screen.queryByRole("link", { name: /^Play/ })).not.toBeInTheDocument();
  });

  it("keeps historical modes unitless and does not pretend they can be replayed", () => {
    draw("?game=handcricket&mode=t20&score=184");
    expect(screen.getByText("Historical mode")).toBeVisible();
    expect(screen.getByText("184")).toBeVisible();
    expect(screen.queryByText("184 runs")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Play current modes" })).toBeVisible();
  });

  it("preserves zero targets and offers browsing for an unlaunchable historical game", () => {
    draw("?game=blockblast&mode=classic_endless&score=0");
    expect(screen.getByText("0 pts")).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse games" })).toBeVisible();
    expect(screen.getByText(/not currently available/i)).toBeVisible();
  });
});
