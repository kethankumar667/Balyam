import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../AppHeader", () => ({ default: ({ onToggleMobileMenu }: { onToggleMobileMenu: () => void }) => <button onClick={onToggleMobileMenu}>Open navigation</button> }));
vi.mock("../AppSidebar", () => ({ default: ({ onCloseMobile }: { onCloseMobile?: () => void }) => onCloseMobile ? <div><button onClick={onCloseMobile}>Close navigation</button><a href="/games">Browse games</a></div> : null }));
vi.mock("../../navigation/Breadcrumbs", () => ({ default: () => null }));
vi.mock("../../../lib/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("../../../hooks/useMandaliInbox", () => ({ useMandaliInbox: () => ({ items: [], update: vi.fn() }) }));
// The shell's other global sheets share one Suspense boundary with the create sheet; stub them so the
// real, heavy modules never load.
vi.mock("../../bhalyam/JoinRoomModal", () => ({ default: () => null }));
vi.mock("../../../pages/home/sheets/MenuSheet", () => ({ MenuSheet: () => null }));
vi.mock("../../../pages/home/sheets/ProfileSheet", () => ({ ProfileSheet: () => null }));
vi.mock("../../economy/WalletDrawer", () => ({ WalletDrawer: () => null }));
vi.mock("../../streak/DailyStreakModal", () => ({ DailyStreakModal: () => null }));
vi.mock("../../../animations/app/FallingPetals", () => ({ default: () => null }));
vi.mock("../../bhalyam/GameRoomSheet", () => ({
  default: ({ game, shareToMandaliId }: { game: string | null; shareToMandaliId?: string | null }) =>
    game ? (
      <div data-testid="create-sheet" data-share={shareToMandaliId ?? ""}>
        {game}
      </div>
    ) : null,
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

  describe("AppLayout mobile navigation", () => {
    afterEach(cleanup);

    it("labels the drawer, traps focus and restores the trigger after Escape", async () => {
      render(<MemoryRouter><AppLayout>Page</AppLayout></MemoryRouter>);
      const trigger = screen.getByRole("button", { name: "Open navigation" });
      trigger.focus();
      fireEvent.click(trigger);
      const dialog = await screen.findByRole("dialog", { name: "Main navigation" });
      const close = screen.getByRole("button", { name: "Close navigation" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(close).toHaveFocus();
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(screen.getByRole("link", { name: "Browse games" })).toHaveFocus();
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(trigger).toHaveFocus();
    });
  });

  it("carries the Mandali to post the new room into, when it came from a group's Start game", async () => {
    renderAt({ newRoom: "ludo", shareToMandali: "mandali_1" });

    expect(await screen.findByTestId("create-sheet")).toHaveAttribute("data-share", "mandali_1");
  });

  it("posts nowhere when the hand-off names no group", async () => {
    renderAt({ newRoom: "ludo" });

    expect(await screen.findByTestId("create-sheet")).toHaveAttribute("data-share", "");
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
