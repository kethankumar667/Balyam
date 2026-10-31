import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../AppHeader", () => ({ default: () => null }));
vi.mock("../AppSidebar", () => ({ default: () => null }));
vi.mock("../../navigation/Breadcrumbs", () => ({ default: () => null }));
vi.mock("../../../lib/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("../../../hooks/useMandaliInbox", () => ({ useMandaliInbox: () => ({ items: [], update: vi.fn() }) }));
vi.mock("../../bhalyam/JoinRoomModal", () => ({ default: () => null }));
vi.mock("../../bhalyam/GameRoomSheet", () => ({ default: () => null }));
vi.mock("../../../pages/home/sheets/MenuSheet", () => ({ MenuSheet: () => null }));
vi.mock("../../../pages/home/sheets/ProfileSheet", () => ({ ProfileSheet: () => null }));
vi.mock("../../economy/WalletDrawer", () => ({ WalletDrawer: () => null }));
vi.mock("../../streak/DailyStreakModal", () => ({ DailyStreakModal: () => null }));
vi.mock("../../../animations/app/FallingPetals", () => ({ default: () => null }));

import AppLayout from "../AppLayout";

const renderLayout = (props: { chrome?: boolean; tabBar?: boolean }) =>
  render(
    <MemoryRouter>
      <AppLayout {...props}>Page</AppLayout>
    </MemoryRouter>,
  );

/**
 * The phone's bottom tab bar belongs to the shell. A screen that draws its own bottom tabs (an open
 * Mandali) switches it off so two bars are never stacked.
 */
describe("AppLayout: the bottom tab bar", () => {
  afterEach(cleanup);

  it("is drawn by default", () => {
    renderLayout({});

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("is left out when a screen has its own bottom tabs", () => {
    renderLayout({ tabBar: false });

    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
  });

  it("is left out with the rest of the chrome during a live game", () => {
    renderLayout({ chrome: false });

    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
  });
});
