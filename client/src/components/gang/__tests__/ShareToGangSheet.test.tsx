import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ShareToGangSheet from "../ShareToGangSheet";
import { useGangStore } from "../../../store/gangStore";

const gang = (id: string, name: string) => ({ id, name, handle: id, memberCount: 8 });

const setStore = (gangs: ReturnType<typeof gang>[], share = vi.fn(async () => ({ success: true }))) => {
  const fetchMyGangs = vi.fn(async () => undefined);
  useGangStore.setState({ myGangs: gangs, fetchMyGangs, shareRoomToGang: share } as never);
  return { share, fetchMyGangs };
};

const renderSheet = () =>
  render(
    <MemoryRouter>
      <ShareToGangSheet open onClose={vi.fn()} roomCode="ABC234" gameName="Ludo" />
    </MemoryRouter>
  );

describe("ShareToGangSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("with one Gang there is nothing to choose — sharing is a single tap", async () => {
    const { share } = setStore([gang("m1", "Ludo Lounge")]);
    renderSheet();

    const button = await screen.findByRole("button", { name: "Share room" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => expect(share).toHaveBeenCalledWith("m1", "ABC234"));
  });

  it("with several Gangs nothing is chosen for you — you pick the group you want to play with", async () => {
    const { share } = setStore([gang("m1", "Ludo Lounge"), gang("m2", "Office Gang")]);
    renderSheet();

    const button = (await screen.findByRole("button", { name: "Share room" })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/Office Gang/));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);

    await waitFor(() => expect(share).toHaveBeenCalledWith("m2", "ABC234"));
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("marks the group as shared and lets you send the same room to another group", async () => {
    const { share } = setStore([gang("m1", "Ludo Lounge"), gang("m2", "Office Gang")]);
    renderSheet();

    fireEvent.click(await screen.findByLabelText(/Ludo Lounge/));
    fireEvent.click(screen.getByRole("button", { name: "Share room" }));
    await screen.findByText(/Posted in Ludo Lounge/);

    expect((screen.getByRole("button", { name: "Shared" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Office Gang/));
    fireEvent.click(screen.getByRole("button", { name: "Share room" }));

    await waitFor(() => expect(share).toHaveBeenCalledWith("m2", "ABC234"));
  });

  it("shows the server's reason when sharing is refused, and stays usable", async () => {
    setStore([gang("m1", "Ludo Lounge")], vi.fn(async () => ({ success: false, error: "Slow down — try again in a few minutes." })) as never);
    renderSheet();

    const button = await screen.findByRole("button", { name: "Share room" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);

    expect((await screen.findByRole("alert")).textContent).toContain("Slow down");
    expect((screen.getByRole("button", { name: "Share room" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("with no Gang says so and points to where to find one", async () => {
    setStore([]);
    renderSheet();

    expect(await screen.findByText("You are not in a Gang yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Find a Gang" }).getAttribute("href")).toBe("/gang");
    expect(screen.queryByRole("button", { name: "Share room" })).toBeNull();
  });

  it("re-fetches your Gangs each time it opens, so a group you just joined is listed", async () => {
    const { fetchMyGangs } = setStore([gang("m1", "Ludo Lounge")]);
    renderSheet();

    await screen.findByText("Ludo Lounge");

    expect(fetchMyGangs).toHaveBeenCalledTimes(1);
  });
});
