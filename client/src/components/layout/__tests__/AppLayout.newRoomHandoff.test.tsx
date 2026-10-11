import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../AppHeader", () => ({ default: () => null }));
vi.mock("../AppSidebar", () => ({ default: () => null }));
vi.mock("../../navigation/Breadcrumbs", () => ({ default: () => null }));
vi.mock("../../../hooks/useMandaliInbox", () => ({ useMandaliInbox: () => ({ items: [], update: vi.fn() }) }));
// The shell's other global sheets share one Suspense boundary with the create sheet; stub them so the
// real, heavy modules never load.
vi.mock("../../bhalyam/JoinRoomModal", () => ({ default: () => null }));
vi.mock("../../../pages/home/sheets/MenuSheet", () => ({ MenuSheet: () => null }));
vi.mock("../../../pages/home/sheets/ProfileSheet", () => ({ ProfileSheet: () => null }));
vi.mock("../../economy/WalletDrawer", () => ({ WalletDrawer: () => null }));
vi.mock("../../streak/DailyStreakModal", () => ({ DailyStreakModal: () => null }));
vi.mock("../../cosmetics/CosmeticsStoreModal", () => ({ CosmeticsStoreModal: () => null }));
vi.mock("../../../animations/app/FallingPetals", () => ({ default: () => null }));
vi.mock("../../bhalyam/GameRoomSheet", () => ({
  default: ({ game }: { game: string | null }) => (game ? <div data-testid="create-sheet">{game}</div> : null),
}));

import AppLayout from "../AppLayout";

function StateProbe() {
  const { state } = useLocation();
  return <output data-testid="nav-state">{JSON.stringify(state)}</output>;
}

const renderAt = (state: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/", state }]}>
      <AppLayout chrome={false}>
        <StateProbe />
      </AppLayout>
    </MemoryRouter>,
  );

/**
 * A finished table's "Create a new room" leaves the room and lands on the home page carrying
 * `state.newRoom`. The shell opens the create-room sheet for that game exactly once.
 */
describe("AppLayout: arriving from a finished table's 'Create a new room'", () => {
  afterEach(cleanup);

  it("opens the create-room sheet for that game", async () => {
    renderAt({ newRoom: "ludo" });

    expect(await screen.findByTestId("create-sheet")).toHaveTextContent("ludo");
  });

  it("clears the hand-off so a refresh or Back does not reopen it", async () => {
    renderAt({ newRoom: "ludo" });

    await waitFor(() => expect(screen.getByTestId("nav-state").textContent).toBe("null"));
  });

  it("opens nothing on an ordinary arrival", () => {
    renderAt(undefined);

    expect(screen.queryByTestId("create-sheet")).toBeNull();
  });

  it("ignores a hand-off that is not a game name", () => {
    renderAt({ newRoom: "" });

    expect(screen.queryByTestId("create-sheet")).toBeNull();
  });
});
