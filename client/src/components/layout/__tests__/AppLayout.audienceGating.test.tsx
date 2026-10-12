import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";

vi.mock("../AppHeader", () => ({ default: () => null }));
vi.mock("../AppSidebar", () => ({ default: () => null }));
vi.mock("../../navigation/Breadcrumbs", () => ({ default: () => null }));
vi.mock("../../../hooks/useMandaliInbox", () => ({ useMandaliInbox: () => ({ items: [], update: vi.fn() }) }));
vi.mock("../../bhalyam/JoinRoomModal", () => ({ default: () => null }));
vi.mock("../../bhalyam/GameRoomSheet", () => ({ default: () => null }));
vi.mock("../../../pages/home/sheets/MenuSheet", () => ({ MenuSheet: () => null }));
vi.mock("../../../pages/home/sheets/ProfileSheet", () => ({ ProfileSheet: () => null }));
vi.mock("../../economy/WalletDrawer", () => ({ WalletDrawer: () => null }));
vi.mock("../../streak/DailyStreakModal", () => ({ DailyStreakModal: () => null }));
vi.mock("../../cosmetics/CosmeticsStoreModal", () => ({ CosmeticsStoreModal: () => null }));
vi.mock("../../../animations/app/FallingPetals", () => ({ default: () => null }));
// Markers for the two audience-specific dialogs, so the test sees which one the shell mounts.
vi.mock("../../profile/ProfileCompletionPrompt", () => ({ default: () => <div data-testid="profile-prompt" /> }));
vi.mock("../../auth/SignInInvitation", () => ({ default: () => <div data-testid="sign-in-invitation" /> }));

import AppLayout from "../AppLayout";

function renderShell({ isMember, chrome = true }: { isMember: boolean; chrome?: boolean }) {
  useAuthStore.setState({ isMember, userId: isMember ? "u1" : null });
  return render(
    <MemoryRouter>
      <AppLayout chrome={chrome}>
        <p>page</p>
      </AppLayout>
    </MemoryRouter>,
  );
}

/**
 * Each of these dialogs is for one audience only, and each pulls in its own code. The shell
 * mounts only the one that can be shown, so a guest never downloads the profile prompt (with
 * its calendar) and a member never downloads the sign-in invitation.
 */
describe("AppLayout: which audience-specific dialog it mounts", () => {
  afterEach(cleanup);

  it("gives a signed-in member the profile prompt and no sign-in invitation", async () => {
    renderShell({ isMember: true });

    expect(await screen.findByTestId("profile-prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("sign-in-invitation")).not.toBeInTheDocument();
  });

  it("gives a guest the sign-in invitation and no profile prompt", async () => {
    renderShell({ isMember: false });

    expect(await screen.findByTestId("sign-in-invitation")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-prompt")).not.toBeInTheDocument();
  });

  it.each([
    ["a member", true],
    ["a guest", false],
  ])("mounts neither over a live board for %s", async (_who, isMember) => {
    renderShell({ isMember, chrome: false });

    await screen.findByText("page");
    expect(screen.queryByTestId("profile-prompt")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sign-in-invitation")).not.toBeInTheDocument();
  });
});
