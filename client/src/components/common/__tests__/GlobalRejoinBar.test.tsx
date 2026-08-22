import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GlobalRejoinBar from "../GlobalRejoinBar";
import { useRoomStore } from "../../../store/roomStore";

describe("GlobalRejoinBar Component", () => {
  beforeEach(() => {
    useRoomStore.setState({
      roomState: null,
    });
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    useRoomStore.setState({
      roomState: null,
    });
  });

  it("does not render when there is no active room", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <GlobalRejoinBar />
      </MemoryRouter>
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders when there is an active room in store and user is on home", () => {
    useRoomStore.setState({
      roomState: {
        code: "LUDO99",
        game: "ludo",
        hostId: "host_1",
        players: [],
        status: "in_game",
        gameOptions: {},
      } as any,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <GlobalRejoinBar />
      </MemoryRouter>
    );

    const banner = screen.getByRole("status");
    expect(banner).toBeDefined();
    expect(screen.getByText(/#LUDO99/i)).toBeDefined();
    expect(screen.getByText(/Rejoin/i)).toBeDefined();
  });

  it("hides when user dismisses the active match notification", () => {
    useRoomStore.setState({
      roomState: {
        code: "CHESS1",
        game: "chess",
        hostId: "host_1",
        players: [],
        status: "in_game",
        gameOptions: {},
      } as any,
    });

    render(
      <MemoryRouter initialEntries={["/games"]}>
        <GlobalRejoinBar />
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toBeDefined();

    const dismissBtn = screen.getByLabelText(/Dismiss active match alert/i);
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
