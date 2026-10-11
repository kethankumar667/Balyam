import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StartGameSheet } from "../album/StartGameSheet";

const open = (onStart: Parameters<typeof StartGameSheet>[0]["onStart"], onClose = vi.fn()) => {
  render(<StartGameSheet open onClose={onClose} onStart={onStart} />);
  return onClose;
};

describe("StartGameSheet", () => {
  afterEach(cleanup);

  it("asks only for the game and the seats: no name field", () => {
    open(vi.fn());

    expect(screen.getByLabelText("Game")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Name/)).toBeNull();
  });

  it("starts the chosen game under an automatic title and closes once the server says yes", async () => {
    const onStart = vi.fn().mockResolvedValue({ success: true });
    const onClose = open(onStart);

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toBe("ludo");
    expect(onStart.mock.calls[0][1]).toMatch(/together/);
  });

  it("stays open and says why when the server refuses, instead of doing nothing", async () => {
    const onStart = vi.fn().mockResolvedValue({ success: false, error: "Must be an active member to create parties." });
    const onClose = open(onStart);

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Must be an active member to create parties.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says so when the request fails outright", async () => {
    open(vi.fn().mockRejectedValue(new Error("offline")));

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not start the game");
  });

  it("starts one game when tapped twice quickly", async () => {
    const onStart = vi.fn().mockResolvedValue({ success: true });
    open(onStart);
    const button = screen.getByRole("button", { name: "Start game" });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(onStart).toHaveBeenCalledTimes(1));
  });
});
