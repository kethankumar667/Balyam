import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RoomLobbyRoster from "../RoomLobbyRoster";
import type { Player } from "@shared/types";
import type { JoinEvent } from "../../../hooks/useJoinAnimationTracker";

vi.mock("../../../services/AudioManager", () => {
  const playMock = vi.fn();
  return {
    AudioManager: {
      getInstance: () => ({ play: playMock }),
    },
  };
});

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    name: "Alice",
    isBot: false,
    isConnected: true,
    isHost: false,
    isReady: false,
    ...overrides,
  };
}

/**
 * Room-level integration coverage: proves the real wiring from an
 * authoritative roster, through `useJoinAnimationTracker`, into the
 * rendered `JoinFeedbackBanner` and the participant-row highlight —
 * not just each piece rendered in isolation with hand-fed props.
 */
describe("RoomLobbyRoster — join-feedback integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderRoster(props: Partial<React.ComponentProps<typeof RoomLobbyRoster>> = {}) {
    const defaultProps: React.ComponentProps<typeof RoomLobbyRoster> = {
      roomCode: "ABC123",
      players: [makePlayer()],
      maxPlayers: 4,
      selfId: null,
      isHost: false,
      game: "rps",
      enabled: true,
      onAddBot: vi.fn(),
      ...props,
    };
    return render(<RoomLobbyRoster {...defaultProps} />);
  }

  it("1. initial participants render without join feedback", () => {
    renderRoster({ players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2", name: "Bob" })] });

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("2. adding one human produces one human banner", () => {
    const { rerender } = renderRoster({ players: [makePlayer({ id: "p1" })] });

    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ABC123"
          players={[makePlayer({ id: "p1" }), makePlayer({ id: "p2", name: "Bob" })]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
        />,
      );
    });

    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Bob");
    expect(banner.textContent).toContain("Player");
  });

  it("3. adding one bot produces one bot banner", () => {
    const { rerender } = renderRoster({ players: [makePlayer({ id: "p1" })] });

    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ABC123"
          players={[makePlayer({ id: "p1" }), makePlayer({ id: "bot_1", name: "Sparky", isBot: true })]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
        />,
      );
    });

    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Sparky");
    expect(banner.textContent).toContain("AI");
  });

  it("4. the corresponding participant receives newly joined presentation state", () => {
    const { rerender, container } = renderRoster({ players: [makePlayer({ id: "p1" })] });

    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ABC123"
          players={[makePlayer({ id: "p1" }), makePlayer({ id: "p2", name: "Bob" })]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
        />,
      );
    });

    const seat = container.querySelector("#seat-p2");
    expect(seat?.getAttribute("data-is-new")).toBe("true");
    const seatP1 = container.querySelector("#seat-p1");
    expect(seatP1?.getAttribute("data-is-new")).toBe("false");
  });

  it("5. repeating the same room state does not replay", () => {
    const players = [makePlayer({ id: "p1" }), makePlayer({ id: "p2", name: "Bob" })];
    const { rerender } = renderRoster({ players: [players[0]] });

    act(() => {
      rerender(
        <RoomLobbyRoster roomCode="ABC123" players={players} maxPlayers={4} selfId={null} isHost={false} game="rps" enabled onAddBot={vi.fn()} />,
      );
    });
    expect(screen.getByRole("status")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole("status")).toBeNull();

    // Same roster, new array reference (a resync broadcast)
    act(() => {
      rerender(
        <RoomLobbyRoster roomCode="ABC123" players={[...players]} maxPlayers={4} selfId={null} isHost={false} game="rps" enabled onAddBot={vi.fn()} />,
      );
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("6. changing isConnected does not replay", () => {
    const p1 = makePlayer({ id: "p1" });
    const p2 = makePlayer({ id: "p2", name: "Bob" });
    const { rerender } = renderRoster({ players: [p1, p2] });

    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ABC123"
          players={[p1, { ...p2, isConnected: false }]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
        />,
      );
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("7. recovery of the same player ID does not replay", () => {
    const p1 = makePlayer({ id: "p1" });
    const p2 = makePlayer({ id: "p2", name: "Bob", isConnected: false });
    const { rerender } = renderRoster({ players: [p1, p2] });

    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ABC123"
          players={[p1, { ...p2, isConnected: true }]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
        />,
      );
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("8. player reordering does not replay", () => {
    const p1 = makePlayer({ id: "p1" });
    const p2 = makePlayer({ id: "p2", name: "Bob" });
    const { rerender } = renderRoster({ players: [p1, p2] });

    act(() => {
      rerender(
        <RoomLobbyRoster roomCode="ABC123" players={[p2, p1]} maxPlayers={4} selfId={null} isHost={false} game="rps" enabled onAddBot={vi.fn()} />,
      );
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("9. room-code change silently reseeds, and 10. a subsequent genuine addition in the new room triggers once", () => {
    const roomAPlayers = [makePlayer({ id: "p1" })];
    const { rerender } = renderRoster({ roomCode: "ROOMA", players: roomAPlayers });

    // Route changes to a different room; reused ID "p1" must not replay
    const roomBPlayers = [makePlayer({ id: "p1" }), makePlayer({ id: "p9", name: "Zoe" })];
    act(() => {
      rerender(
        <RoomLobbyRoster roomCode="ROOMB" players={roomBPlayers} maxPlayers={4} selfId={null} isHost={false} game="rps" enabled onAddBot={vi.fn()} />,
      );
    });
    expect(screen.queryByRole("status")).toBeNull();

    // A genuine new arrival in room B fires exactly once
    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ROOMB"
          players={[...roomBPlayers, makePlayer({ id: "p10", name: "Yusuf" })]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
        />,
      );
    });
    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Yusuf");
  });

  it("11. four simultaneous additions produce no more than three banners", () => {
    const p1 = makePlayer({ id: "p1" });
    const { rerender, container } = renderRoster({ players: [p1] });

    const burst = [
      makePlayer({ id: "p2", name: "Bob" }),
      makePlayer({ id: "p3", name: "Charlie" }),
      makePlayer({ id: "p4", name: "Dave" }),
      makePlayer({ id: "p5", name: "Eve" }),
    ];
    act(() => {
      rerender(
        <RoomLobbyRoster roomCode="ABC123" players={[p1, ...burst]} maxPlayers={8} selfId={null} isHost={false} game="rps" enabled onAddBot={vi.fn()} />,
      );
    });

    const banner = screen.getByRole("status");
    const dismissButtons = banner.querySelectorAll("button[aria-label^='Dismiss notification']");
    expect(dismissButtons.length).toBe(3);

    // All 4 seats still get the newly-joined highlight even though only 3
    // banners are visible — the row state is not capped, only the banner is.
    burst.forEach((p) => {
      expect(container.querySelector(`#seat-${p.id}`)?.getAttribute("data-is-new")).toBe("true");
    });
  });

  it("12. existing lobby particle feedback is still generated through the unified mechanism", () => {
    const onLobbyJoin = vi.fn();
    const p1 = makePlayer({ id: "p1" });
    const { rerender } = renderRoster({ players: [p1], onLobbyJoin });

    act(() => {
      rerender(
        <RoomLobbyRoster
          roomCode="ABC123"
          players={[p1, makePlayer({ id: "p2", name: "Bob" })]}
          maxPlayers={4}
          selfId={null}
          isHost={false}
          game="rps"
          enabled
          onAddBot={vi.fn()}
          onLobbyJoin={onLobbyJoin}
        />,
      );
    });

    expect(onLobbyJoin).toHaveBeenCalledTimes(1);
    expect(onLobbyJoin.mock.calls[0][0][0].playerId).toBe("p2");
  });

  it("dismiss button click removes exactly its own banner", () => {
    const p1 = makePlayer({ id: "p1" });
    const { rerender } = renderRoster({ players: [p1] });

    act(() => {
      rerender(
        <RoomLobbyRoster roomCode="ABC123" players={[p1, makePlayer({ id: "p2", name: "Bob" })]} maxPlayers={4} selfId={null} isHost={false} game="rps" enabled onAddBot={vi.fn()} />,
      );
    });

    const dismissBtn = screen.getByRole("button", { name: /Dismiss notification for Bob/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
