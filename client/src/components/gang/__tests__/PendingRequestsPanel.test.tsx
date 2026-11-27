import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GangJoinRequestRecord } from "@shared/gang/types.js";
import PendingRequestsPanel, { requesterLabel } from "../PendingRequestsPanel";

const UUID = "a82d6ab1-d078-4ac7-9aca-f08fb9a0c111";

const request = (over: Partial<GangJoinRequestRecord> = {}): GangJoinRequestRecord => ({
  id: "jr_1",
  gangId: "g1",
  requesterIdentityId: UUID,
  requesterDisplayName: "Asha K",
  requesterAvatar: "avatar_3",
  status: "PENDING",
  createdAt: Date.UTC(2026, 9, 13),
  ...over,
});

afterEach(cleanup);

describe("who an admin is asked to let in", () => {
  it("is the applicant's name, never their raw id", () => {
    render(
      <PendingRequestsPanel open onClose={() => {}} requests={[request()]} onDecide={async () => ({ success: true })} />,
    );

    expect(screen.getByText("Asha K")).toBeInTheDocument();
    expect(screen.queryByText(UUID)).not.toBeInTheDocument();
  });

  it("reads Member plus a short id for a request made before names were stored", () => {
    render(
      <PendingRequestsPanel
        open onClose={() => {}} onDecide={async () => ({ success: true })}
        requests={[request({ requesterDisplayName: null, requesterAvatar: null })]}
      />,
    );

    expect(screen.getByText("Member · a82d6ab1")).toBeInTheDocument();
    expect(screen.queryByText(UUID)).not.toBeInTheDocument();
  });

  it("treats a blank name like a missing one", () => {
    expect(requesterLabel({ requesterDisplayName: "   ", requesterIdentityId: UUID })).toBe("Member · a82d6ab1");
    expect(requesterLabel({ requesterDisplayName: undefined, requesterIdentityId: UUID })).toBe("Member · a82d6ab1");
    expect(requesterLabel({ requesterDisplayName: "  Asha K ", requesterIdentityId: UUID })).toBe("Asha K");
  });

  it("still approves and declines the request it is showing", async () => {
    const onDecide = vi.fn(async () => ({ success: true }));
    render(<PendingRequestsPanel open onClose={() => {}} requests={[request()]} onDecide={onDecide} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(onDecide).toHaveBeenCalledWith("jr_1", true));

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(onDecide).toHaveBeenCalledWith("jr_1", false));
  });
});
