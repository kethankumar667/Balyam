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

  it("asks only for the game: no name and no seat count", () => {
    open(vi.fn());

    expect(screen.getByLabelText("Game")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Name/)).toBeNull();
    expect(screen.queryByLabelText(/Seats/)).toBeNull();
  });

  it("starts the chosen game and closes once it is under way", async () => {
    const onStart = vi.fn().mockResolvedValue({ success: true });
    const onClose = open(onStart);

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith("ludo");
  });

  it("stays open and says why when the server refuses, instead of doing nothing", async () => {
    const onStart = vi.fn().mockResolvedValue({ success: false, error: "Could not open the room." });
    const onClose = open(onStart);

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not open the room.");
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
