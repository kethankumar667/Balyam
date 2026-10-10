import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MandaliMember } from "@shared/mandali/types.js";
import { PeopleList } from "../PeopleList";

/** Joined 2026-03-12 at noon UTC (the English locale writes it "March 12, 2026"), so the date reads the same in every timezone. */
const JOINED_AT = Date.UTC(2026, 2, 12, 12, 0, 0);

function member(over: Partial<MandaliMember> & Pick<MandaliMember, "playerId" | "displayName">): MandaliMember {
  return {
    memberId: `m_${over.playerId}`,
    mandaliId: "mnd_1",
    avatar: "",
    role: "MEMBER",
    state: "ACTIVE",
    joinedAt: JOINED_AT,
    presence: "offline",
    contributionScore: 0,
    ...over,
  };
}

const MEMBERS = [
  member({ playerId: "me", displayName: "Kethan", role: "OWNER", presence: "online" }),
  member({ playerId: "p1", displayName: "Anand", presence: "in-game", activeGame: "ludo" }),
  member({ playerId: "p2", displayName: "Babji", role: "ADMIN" as string as MandaliMember["role"] }),
  member({ playerId: "p3", displayName: "Chinna", presence: "idle" }),
];

describe("PeopleList → member profile", () => {
  it("opens a profile for each of the other members, not just management actions", () => {
    render(<PeopleList members={MEMBERS} currentUserId="me" />);

    for (const name of ["Anand", "Babji", "Chinna"]) {
      expect(screen.getByRole("button", { name: `View ${name}'s profile` })).toBeTruthy();
    }
  });

  it("shows who they are, their role, whether they are around, and when they joined", () => {
    render(<PeopleList members={MEMBERS} currentUserId="me" />);

    fireEvent.click(screen.getByRole("button", { name: "View Babji's profile" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Babji")).toBeTruthy();
    expect(within(dialog).getByText("Admin")).toBeTruthy();
    expect(within(dialog).getByText("Not here")).toBeTruthy();
    expect(within(dialog).getByText(/March 12, 2026/)).toBeTruthy();
  });

  it("says which game a member is in when they are playing", () => {
    render(<PeopleList members={MEMBERS} currentUserId="me" />);

    fireEvent.click(screen.getByRole("button", { name: "View Anand's profile" }));

    expect(within(screen.getByRole("dialog")).getByText(/Playing Ludo/)).toBeTruthy();
  });

  it("closes again", () => {
    render(<PeopleList members={MEMBERS} currentUserId="me" />);

    fireEvent.click(screen.getByRole("button", { name: "View Chinna's profile" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers coins from the card, aimed at that person", () => {
    const onCoinsWith = vi.fn();
    render(<PeopleList members={MEMBERS} currentUserId="me" onCoinsWith={onCoinsWith} />);

    fireEvent.click(screen.getByRole("button", { name: "View Anand's profile" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /coins/i }));

    expect(onCoinsWith).toHaveBeenCalledWith("p1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens your own card without a coins button", () => {
    render(<PeopleList members={MEMBERS} currentUserId="me" onCoinsWith={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "View Kethan's profile" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Host")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: /coins/i })).toBeNull();
  });

  it("shows nothing beyond what the list already shows: no balance, no score", () => {
    render(<PeopleList members={[member({ playerId: "p9", displayName: "Eswari", contributionScore: 777 })]} currentUserId="me" />);

    fireEvent.click(screen.getByRole("button", { name: "View Eswari's profile" }));

    expect(within(screen.getByRole("dialog")).queryByText(/777/)).toBeNull();
  });
});
