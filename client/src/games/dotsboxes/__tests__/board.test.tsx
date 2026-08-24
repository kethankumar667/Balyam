import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import DotsBoxesBoardMobile from "../DotsBoxesBoardMobile";
import DotsBoxesBoardDesktop from "../DotsBoxesBoardDesktop";
import DotsBoxesNotebookDesktop from "../DotsBoxesNotebookDesktop";
import DotsBoxesNotebookMobile from "../DotsBoxesNotebookMobile";
import {
  getPlayerTheme,
  getPlayerThemeByColor,
  DOTSBOXES_NEON_THEMES,
  DOTSBOXES_NOTEBOOK_THEMES,
  NOTEBOOK_HANDWRITING_FONTS,
  getHandwritingFont,
  getPlayerInitials,
} from "../dotsboxes-theme";
import type { DotsBoxesPublicState, Player } from "@shared/types";

const mockPlayers: Player[] = [
  { id: "p1", name: "Kethan Kumar", isHost: true, isReady: true, isConnected: true, penColor: "blue" },
  { id: "p2", name: "Monica", isHost: false, isReady: true, isConnected: true, penColor: "gold" },
  { id: "p3", name: "Geetha Priya", isHost: false, isReady: true, isConnected: true, penColor: "purple" },
  { id: "p4", name: "Santhosh", isHost: false, isReady: true, isConnected: true, penColor: "green" },
  { id: "p5", name: "Pencil", isHost: false, isReady: true, isConnected: true, penColor: "pink" },
  { id: "p6", name: "Eraser", isHost: false, isReady: true, isConnected: true, penColor: "cyan" },
];

const mockState: DotsBoxesPublicState = {
  kind: "dotsboxes",
  phase: "playing",
  options: { boardSize: 5, turnTimerSeconds: 30 },
  playerOrder: ["p1", "p2", "p3", "p4", "p5", "p6"],
  turnPlayerId: "p1",
  hLines: [
    { kind: "h", r: 0, c: 0, playerId: "p1" },
    { kind: "h", r: 1, c: 0, playerId: "p2" },
  ],
  vLines: [
    { kind: "v", r: 0, c: 0, playerId: "p1" },
    { kind: "v", r: 0, c: 1, playerId: "p2" },
  ],
  claims: [
    { r: 0, c: 0, ownerId: "p1", closedAt: 1 },
    { r: 0, c: 1, ownerId: "p2", closedAt: 2 },
    { r: 1, c: 0, ownerId: "p3", closedAt: 3 },
    { r: 1, c: 1, ownerId: "p4", closedAt: 4 },
  ],
  scores: { p1: 8, p2: 6, p3: 4, p4: 3, p5: 2, p6: 1 },
  turnDeadline: Date.now() + 30000,
  winnerId: null,
  moveCount: 4,
  lastMoveScored: true,
};

const mockFinishedState: DotsBoxesPublicState = {
  ...mockState,
  phase: "finished",
  winnerId: "p1",
  scores: { p1: 10, p2: 4, p3: 2, p4: 0, p5: 0, p6: 0 },
  claims: Array.from({ length: 16 }).map((_, i) => ({
    r: Math.floor(i / 4),
    c: i % 4,
    ownerId: i < 10 ? "p1" : "p2",
    closedAt: i + 1,
  })),
};

describe("Dots & Boxes UI & Themes", () => {
  it("provides 6 distinct vibrant neon player themes", () => {
    expect(DOTSBOXES_NEON_THEMES.length).toBe(6);
    expect(getPlayerTheme(0, "neon").primary).toBe("#3B82F6"); // Blue
    expect(getPlayerTheme(1, "neon").primary).toBe("#F59E0B"); // Orange
    expect(getPlayerTheme(2, "neon").primary).toBe("#A855F7"); // Purple
    expect(getPlayerTheme(3, "neon").primary).toBe("#10B981"); // Green
    expect(getPlayerTheme(4, "neon").primary).toBe("#EF4444"); // Red
    expect(getPlayerTheme(5, "neon").primary).toBe("#06B6D4"); // Cyan
  });

  it("provides 6 realistic notebook pen themes with 6 distinct handwriting fonts", () => {
    expect(DOTSBOXES_NOTEBOOK_THEMES.length).toBe(6);
    expect(NOTEBOOK_HANDWRITING_FONTS.length).toBe(6);

    // Verify 6 handwriting fonts
    expect(getHandwritingFont(0)).toContain("Caveat");
    expect(getHandwritingFont(1)).toContain("Kalam");
    expect(getHandwritingFont(2)).toContain("Patrick Hand");
    expect(getHandwritingFont(3)).toContain("Architects Daughter");
    expect(getHandwritingFont(4)).toContain("Indie Flower");
    expect(getHandwritingFont(5)).toContain("Gochi Hand");

    // Verify bright notebook pen colors
    expect(getPlayerTheme(0, "notebook").primary).toBe("#2563EB"); // Bright Blue
    expect(getPlayerTheme(1, "notebook").primary).toBe("#EA580C"); // Bright Orange
    expect(getPlayerTheme(2, "notebook").primary).toBe("#9333EA"); // Bright Purple
    expect(getPlayerTheme(3, "notebook").primary).toBe("#16A34A"); // Bright Green
    expect(getPlayerTheme(4, "notebook").primary).toBe("#DC2626"); // Bright Red
    expect(getPlayerTheme(5, "notebook").primary).toBe("#0284C7"); // Bright Cyan
  });

  it("resolves player themes by chosen penColor and skin", () => {
    expect(getPlayerThemeByColor("blue", "neon")?.primary).toBe("#3B82F6");
    expect(getPlayerThemeByColor("blue", "notebook")?.primary).toBe("#2563EB");
    expect(getPlayerThemeByColor("purple", "notebook")?.primary).toBe("#9333EA");
    expect(getPlayerThemeByColor(undefined)).toBeNull();
  });

  it("correctly derives player initials matching user specifications", () => {
    expect(getPlayerInitials("Kethan Kumar")).toBe("KK");
    expect(getPlayerInitials("Geetha Priya")).toBe("GP");
    expect(getPlayerInitials("Rahul Sharma")).toBe("RS");
    expect(getPlayerInitials("Monica")).toBe("M");
    expect(getPlayerInitials("Santhosh")).toBe("S");
    expect(getPlayerInitials("kethan")).toBe("K");
    expect(getPlayerInitials("Pencil")).toBe("P");
    expect(getPlayerInitials("")).toBe("?");
  });

  it("renders Desktop Notebook Board matching reference design with spiral rings and 6 handwriting fonts", () => {
    render(
      <DotsBoxesNotebookDesktop
        state={mockState}
        players={mockPlayers}
        selfId="p1"
      />
    );

    expect(screen.getAllByText(/DOTS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/BOXES/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/PLAYERS \(6\/6\)/i)).toBeDefined();
    expect(screen.getAllByText(/YOUR TURN/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CHAT/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("KK").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Mobile Notebook Board with horizontal spiral rings and quick controls", () => {
    render(
      <DotsBoxesNotebookMobile
        state={mockState}
        players={mockPlayers}
        selfId="p1"
      />
    );

    expect(screen.getAllByText(/DOTS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/BOXES/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Your Turn/i)).toBeDefined();
  });

  it("renders Desktop Neon 3-Column Board without side nav", () => {
    render(
      <DotsBoxesBoardDesktop
        state={mockState}
        players={mockPlayers}
        selfId="p1"
      />
    );

    expect(screen.getByText(/PLAYERS \(6\/6\)/i)).toBeDefined();
    expect(screen.queryByText(/GAME ACTIVITY/i)).toBeNull();
    expect(screen.getAllByText(/CHAT/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Leave/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Scorecard Modal with winner celebration, medals, and standings", () => {
    render(
      <DotsBoxesBoardDesktop
        state={mockFinishedState}
        players={mockPlayers}
        selfId="p1"
      />
    );

    expect(screen.getAllByText(/Won the Match/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/You Won/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Final Standings/i)).toBeDefined();
    expect(screen.getByText(/🥇/i)).toBeDefined();
    expect(screen.getByText(/🥈/i)).toBeDefined();
  });
});
