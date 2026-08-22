import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommandPalette from "../CommandPalette";

describe("CommandPalette Component", () => {
  const onClose = vi.fn();
  const onOpenGameSheet = vi.fn();
  const onOpenJoinRoom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    const { container } = render(
      <MemoryRouter>
        <CommandPalette
          open={false}
          onClose={onClose}
          onOpenGameSheet={onOpenGameSheet}
          onOpenJoinRoom={onOpenJoinRoom}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders when open is true with input search field", () => {
    render(
      <MemoryRouter>
        <CommandPalette
          open={true}
          onClose={onClose}
          onOpenGameSheet={onOpenGameSheet}
          onOpenJoinRoom={onOpenJoinRoom}
        />
      </MemoryRouter>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByPlaceholderText(/Search games, pages, actions/i)).toBeDefined();
  });

  it("filters game commands on search query", () => {
    render(
      <MemoryRouter>
        <CommandPalette
          open={true}
          onClose={onClose}
          onOpenGameSheet={onOpenGameSheet}
          onOpenJoinRoom={onOpenJoinRoom}
        />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search games, pages, actions/i);
    fireEvent.change(input, { target: { value: "Ludo" } });

    expect(screen.getByText("Ludo")).toBeDefined();
  });

  it("triggers direct room join when typing room code", () => {
    render(
      <MemoryRouter>
        <CommandPalette
          open={true}
          onClose={onClose}
          onOpenGameSheet={onOpenGameSheet}
          onOpenJoinRoom={onOpenJoinRoom}
        />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search games, pages, actions/i);
    fireEvent.change(input, { target: { value: "XYZ789" } });

    expect(screen.getByText(/Join Room #XYZ789/i)).toBeDefined();
  });

  it("calls onClose when Escape key is pressed", () => {
    render(
      <MemoryRouter>
        <CommandPalette
          open={true}
          onClose={onClose}
          onOpenGameSheet={onOpenGameSheet}
          onOpenJoinRoom={onOpenJoinRoom}
        />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search games, pages, actions/i);
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
