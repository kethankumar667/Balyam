import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Modal from "../../../components/Modal";
import SeatAvatar from "../../../components/profile/SeatAvatar";
import { PlayerCardProvider } from "../PlayerCardProvider";
import type { PlayerCardResult, PublicPlayerCard } from "@shared/profile/PublicPlayerCard";

type SeatAck = (timeoutError: Error | null, result?: PlayerCardResult) => void;

const emitMock = vi.hoisted(() => vi.fn());
const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/socket", () => ({
  getSocket: () => ({ timeout: () => ({ emit: emitMock }) }),
}));
vi.mock("../../../lib/playerIdentity", () => ({ apiFetch: apiFetchMock }));

function cardFor(displayName: string, overrides: Partial<PublicPlayerCard> = {}): PublicPlayerCard {
  return {
    displayName,
    kind: "member",
    progression: { level: 3, levelTitle: "Novice", tierName: "Bronze", tierColor: "#cd7f32", currentXP: 10, xpForNextLevel: 100, levelProgressPercent: 10 },
    cosmetics: {},
    statsScope: "ludo",
    career: { totalMatches: 8, wins: 5, losses: 2, draws: 1, winRatePercent: 63 },
    ...overrides,
  };
}

/** Answers every seat lookup immediately with the card for that seat id. */
function answerSeatLookupsImmediately(cards: Record<string, PublicPlayerCard>): void {
  emitMock.mockImplementation((_event: string, seatId: string, ack: SeatAck) => {
    const card = cards[seatId];
    ack(null, card ? { ok: true, card } : { ok: false, error: "That player is not at this table" });
  });
}

function table() {
  return (
    <PlayerCardProvider>
      <SeatAvatar seatId="seat-a" name="Asha" />
      <SeatAvatar seatId="seat-b" name="Bala" />
    </PlayerCardProvider>
  );
}

beforeEach(() => {
  emitMock.mockReset();
  apiFetchMock.mockReset();
});

describe("player card provider", () => {
  it("asks the server for the tapped seat and shows the game-scoped record", async () => {
    answerSeatLookupsImmediately({ "seat-a": cardFor("Asha") });
    render(table());

    fireEvent.click(screen.getByRole("button", { name: "View Asha's profile" }));

    expect(await screen.findByText("Ludo record")).toBeDefined();
    expect(emitMock).toHaveBeenCalledWith("player:card", "seat-a", expect.any(Function));
    expect(screen.getByText("5 out of 8")).toBeDefined();
  });

  it("closes on Escape and returns focus to the face that opened it", async () => {
    answerSeatLookupsImmediately({ "seat-a": cardFor("Asha") });
    render(table());
    const face = screen.getByRole("button", { name: "View Asha's profile" });
    face.focus();

    fireEvent.click(face);
    await screen.findByText("Ludo record");
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(face);
  });

  it("offers a retry after a failure that could pass on a second try", async () => {
    emitMock.mockImplementation((_event: string, _seatId: string, ack: SeatAck) => ack(new Error("timeout")));
    render(table());

    fireEvent.click(screen.getByRole("button", { name: "View Asha's profile" }));

    expect(await screen.findByRole("button", { name: "Try again" })).toBeDefined();
  });

  it("shows a stale seat as a plain message", async () => {
    answerSeatLookupsImmediately({});
    render(table());

    fireEvent.click(screen.getByRole("button", { name: "View Asha's profile" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("That player is not at this table")).toBeDefined();
  });

  it("never lets a slow answer for the first face overwrite the second face", async () => {
    const pending: Record<string, SeatAck> = {};
    emitMock.mockImplementation((_event: string, seatId: string, ack: SeatAck) => {
      pending[seatId] = ack;
    });
    render(table());

    fireEvent.click(screen.getByRole("button", { name: "View Asha's profile" }));
    fireEvent.click(screen.getByRole("button", { name: "View Bala's profile" }));
    // Bala answers first, then Asha's older request limps in.
    act(() => pending["seat-b"](null, { ok: true, card: cardFor("Bala", { statsScope: "uno" }) }));
    await screen.findByText("UNO record");
    act(() => pending["seat-a"](null, { ok: true, card: cardFor("Asha") }));

    expect(screen.getByRole("heading", { name: "Bala" })).toBeDefined();
    expect(screen.queryByText("Ludo record")).toBeNull();
  });
});

describe("account cards", () => {
  it("treats a 404 as 'no record yet' with no retry", async () => {
    apiFetchMock.mockResolvedValue({ status: 404, ok: false, json: async () => ({}) });
    const { PlayerCardTrigger } = await import("../PlayerCardContext");
    render(
      <PlayerCardProvider>
        <PlayerCardTrigger accountId="acct-1" name="Ravi">
          <span>face</span>
        </PlayerCardTrigger>
      </PlayerCardProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "View Ravi's profile" }));

    expect(await screen.findByText(/has not finished a match yet/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("explains a rate limit instead of a generic failure", async () => {
    apiFetchMock.mockResolvedValue({ status: 429, ok: false, json: async () => ({}) });
    const { PlayerCardTrigger } = await import("../PlayerCardContext");
    render(
      <PlayerCardProvider>
        <PlayerCardTrigger accountId="acct-1" name="Ravi">
          <span>face</span>
        </PlayerCardTrigger>
      </PlayerCardProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "View Ravi's profile" }));

    expect(await screen.findByText(/too many profile lookups/i)).toBeDefined();
  });
});

describe("a card opened over another dialog", () => {
  function ResultScreen() {
    const [open, setOpen] = useState(true);
    return (
      <PlayerCardProvider>
        <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Match result">
          <SeatAvatar seatId="seat-a" name="Asha" />
        </Modal>
      </PlayerCardProvider>
    );
  }

  it("closes only the card on the first Escape, and the result screen on the second", async () => {
    answerSeatLookupsImmediately({ "seat-a": cardFor("Asha") });
    render(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "View Asha's profile" }));
    await screen.findByText("Ludo record");
    expect(screen.getAllByRole("dialog")).toHaveLength(2);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    expect(screen.getByRole("dialog", { name: "Match result" })).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
