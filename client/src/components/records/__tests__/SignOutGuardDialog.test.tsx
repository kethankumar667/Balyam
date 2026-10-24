import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { RecordsAtRisk } from "../../../lib/signOutGuard";

const mockImport = vi.fn();
vi.mock("../../../features/myrecords/deviceRecords", () => ({
  importDeviceBests: (...args: unknown[]) => mockImport(...args),
}));
vi.mock("../../../lib/playerIdentity", () => ({
  apiJson: vi.fn(), apiFetch: vi.fn(), getPlayerCredential: vi.fn(), peekPlayerCredential: vi.fn(),
}));

const { default: SignOutGuardDialog } = await import("../SignOutGuardDialog");
const { useSignOutGuardStore } = await import("../../../store/signOutGuardStore");
const { useScorecardStore } = await import("../../../store/scorecardStore");

const risk: RecordsAtRisk = {
  playerId: "alice",
  pending: 2,
  deviceBests: [{ game: "nokiacricket", modeId: "classic_10", score: 140 }],
};
const flush = vi.fn();

async function openWith(value: RecordsAtRisk) {
  let answer!: Promise<string>;
  act(() => { answer = useSignOutGuardStore.getState().ask(value); });
  return answer;
}

beforeEach(() => {
  mockImport.mockReset();
  flush.mockReset().mockResolvedValue({ sent: 2, remaining: 0 });
  useScorecardStore.setState({ flushPendingScores: flush });
  useSignOutGuardStore.setState({ risk: null });
});
afterEach(cleanup);

describe("SignOutGuardDialog", () => {
  it("shows nothing until a sign-out is at risk", () => {
    render(<SignOutGuardDialog />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says what would be lost, in the player's own terms", async () => {
    render(<SignOutGuardDialog />);
    void openWith(risk);

    expect(await screen.findByRole("dialog", { name: /only on this device/i })).toBeInTheDocument();
    expect(screen.getByText(/2 scores waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/Retro Cricket/)).toBeInTheDocument();
    expect(screen.getByText(/140/)).toBeInTheDocument();
  });

  it("lets the player back out", async () => {
    render(<SignOutGuardDialog />);
    const answer = openWith(risk);

    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    await expect(answer).resolves.toBe("cancel");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("signs out without sending anything when the player chooses to let them go", async () => {
    render(<SignOutGuardDialog />);
    const answer = openWith(risk);

    fireEvent.click(await screen.findByRole("button", { name: /sign out and delete/i }));

    await expect(answer).resolves.toBe("signout");
    expect(flush).not.toHaveBeenCalled();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("sends the waiting scores and the device bests, and only then lets the sign-out go ahead", async () => {
    mockImport.mockResolvedValue({ accepted: 1, skipped: 0 });
    render(<SignOutGuardDialog />);
    const answer = openWith(risk);

    fireEvent.click(await screen.findByRole("button", { name: /save to my account/i }));

    await expect(answer).resolves.toBe("signout");
    expect(flush).toHaveBeenCalledWith("alice");
    expect(mockImport).toHaveBeenCalledWith("alice", risk.deviceBests);
  });

  it("does not sign out, and says why, when the scores still cannot be sent", async () => {
    flush.mockResolvedValue({ sent: 0, remaining: 2 });
    render(<SignOutGuardDialog />);
    const answer = vi.fn();
    void openWith(risk).then(answer);

    fireEvent.click(await screen.findByRole("button", { name: /save to my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be sent/i);
    expect(mockImport).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not sign out, and says why, when adding the device bests fails", async () => {
    mockImport.mockRejectedValue(new Error("We could not reach the server."));
    render(<SignOutGuardDialog />);
    const answer = vi.fn();
    void openWith({ ...risk, pending: 0 }).then(answer);

    fireEvent.click(await screen.findByRole("button", { name: /save to my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
    await waitFor(() => expect(screen.getByRole("button", { name: /save to my account/i })).toBeEnabled());
    expect(answer).not.toHaveBeenCalled();
  });
});
