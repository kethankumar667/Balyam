import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DeleteAccountModal from "../DeleteAccountModal";
import * as accountDeletion from "../../../lib/accountDeletion";

// Mock accountDeletion module
vi.mock("../../../lib/accountDeletion", () => ({
  executeAccountDeletion: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("DeleteAccountModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render contents when open is false", () => {
    render(
      <MemoryRouter>
        <DeleteAccountModal open={false} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByText("Delete BHALYAM Account")).toBeNull();
  });

  it("renders consequences, confirmation prompt, and disabled action button when open", () => {
    render(
      <MemoryRouter>
        <DeleteAccountModal open={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("Delete BHALYAM Account")).toBeDefined();
    expect(screen.getByText("Permanent & Irreversible")).toBeDefined();
    expect(screen.getByText(/Your username, email address, bio/i)).toBeDefined();
    expect(screen.getByText(/All unredeemed vouchers & permanent coin balance/i)).toBeDefined();
    expect(screen.getByText(/Match histories, tournament trophies/i)).toBeDefined();

    const deleteBtn = screen.getByRole("button", { name: /Delete My Account/i });
    expect(deleteBtn).toBeDefined();
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables the delete button only when DELETE is typed", () => {
    render(
      <MemoryRouter>
        <DeleteAccountModal open={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("DELETE");
    const deleteBtn = screen.getByRole("button", { name: /Delete My Account/i });

    // Partial text
    fireEvent.change(input, { target: { value: "DEL" } });
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);

    // Case-insensitive / trimmed match
    fireEvent.change(input, { target: { value: "delete " } });
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(false);

    // Exact match
    fireEvent.change(input, { target: { value: "DELETE" } });
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("executes account deletion, invokes callbacks, and navigates to home on success", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    vi.mocked(accountDeletion.executeAccountDeletion).mockResolvedValueOnce({ ok: true });

    render(
      <MemoryRouter>
        <DeleteAccountModal open={true} onClose={onClose} onSuccess={onSuccess} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const deleteBtn = screen.getByRole("button", { name: /Delete My Account/i });
    fireEvent.click(deleteBtn);

    expect(accountDeletion.executeAccountDeletion).toHaveBeenCalled();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("displays an error alert message when deletion fails", async () => {
    vi.mocked(accountDeletion.executeAccountDeletion).mockResolvedValueOnce({
      ok: false,
      error: "Network connection lost while deleting account.",
    });

    render(
      <MemoryRouter>
        <DeleteAccountModal open={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const deleteBtn = screen.getByRole("button", { name: /Delete My Account/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Network connection lost while deleting account.")).toBeDefined();
    });
  });
});
