import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DeleteAccountModal from "../DeleteAccountModal";
import * as accountDeletion from "../../../lib/accountDeletion";

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

const mockDelete = vi.mocked(accountDeletion.executeAccountDeletion);

function renderModal(props: Partial<React.ComponentProps<typeof DeleteAccountModal>> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const view = render(
    <MemoryRouter>
      <DeleteAccountModal open onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return { ...view, onClose };
}

const input = () => screen.getByPlaceholderText("DELETE") as HTMLInputElement;
const deleteButton = () => screen.getByRole("button", { name: /delete my account/i }) as HTMLButtonElement;

describe("DeleteAccountModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("what it says", () => {
    it("renders nothing while closed", () => {
      renderModal({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("asks plainly, and says it cannot be undone", () => {
      renderModal();

      expect(screen.getByRole("dialog", { name: /delete your account\?/i })).toBeInTheDocument();
      expect(screen.getByText(/this can't be undone/i)).toBeInTheDocument();
    });

    it("lists what goes, in terms a player recognises", () => {
      renderModal();

      expect(screen.getByText("Your profile")).toBeInTheDocument();
      expect(screen.getByText(/name, email, birthday and avatar/i)).toBeInTheDocument();
      expect(screen.getByText("Your progress")).toBeInTheDocument();
      expect(screen.getByText(/level, xp, achievements and match history/i)).toBeInTheDocument();
      expect(screen.getByText("Your coins")).toBeInTheDocument();
      expect(screen.getByText(/can't be recovered, even if you sign up again/i)).toBeInTheDocument();
    });

    it("is honest that anonymous coin records are kept", () => {
      renderModal();

      expect(screen.getByText(/anonymous coin records are kept/i)).toBeInTheDocument();
      expect(screen.getByText(/no longer linked to you/i)).toBeInTheDocument();
    });
  });

  describe("confirming", () => {
    it("starts with the field focused and the delete button disabled", () => {
      renderModal();

      expect(document.activeElement).toBe(input());
      expect(deleteButton()).toBeDisabled();
    });

    it("enables the delete button only once DELETE is typed, ignoring case and spaces", () => {
      renderModal();

      fireEvent.change(input(), { target: { value: "DEL" } });
      expect(deleteButton()).toBeDisabled();

      fireEvent.change(input(), { target: { value: "delete " } });
      expect(deleteButton()).toBeEnabled();

      fireEvent.change(input(), { target: { value: "DELETE" } });
      expect(deleteButton()).toBeEnabled();
    });

    it("keeps the cursor in the field for every character typed", () => {
      renderModal();
      input().focus();

      for (const typed of ["D", "DE", "DEL", "DELE", "DELET", "DELETE"]) {
        fireEvent.change(input(), { target: { value: typed } });
        expect(document.activeElement).toBe(input());
      }
    });

    it("does nothing when submitted before DELETE is typed", () => {
      renderModal();

      fireEvent.submit(input().closest("form") as HTMLFormElement);

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("lets Enter confirm once DELETE is typed", async () => {
      mockDelete.mockResolvedValueOnce({ ok: true });
      renderModal();
      fireEvent.change(input(), { target: { value: "DELETE" } });

      fireEvent.submit(input().closest("form") as HTMLFormElement);

      await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    });
  });

  describe("deleting", () => {
    it("deletes, calls back, closes and returns to the home page on success", async () => {
      const onSuccess = vi.fn();
      mockDelete.mockResolvedValueOnce({ ok: true });
      const { onClose } = renderModal({ onSuccess });

      fireEvent.change(input(), { target: { value: "DELETE" } });
      fireEvent.click(deleteButton());

      expect(mockDelete).toHaveBeenCalled();
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      });
    });

    it("locks the dialog while it works, so it cannot be dismissed or submitted twice", async () => {
      let finish: (value: { ok: boolean }) => void = () => {};
      mockDelete.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
      renderModal();
      fireEvent.change(input(), { target: { value: "DELETE" } });

      fireEvent.click(deleteButton());

      expect(await screen.findByRole("button", { name: /deleting/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
      expect(input()).toBeDisabled();

      finish({ ok: false });
      await waitFor(() => expect(input()).toBeEnabled());
    });

    it("shows the reason in an alert and lets the person try again when it fails", async () => {
      mockDelete.mockResolvedValueOnce({ ok: false, error: "Network connection lost while deleting account." });
      renderModal();
      fireEvent.change(input(), { target: { value: "DELETE" } });

      fireEvent.click(deleteButton());

      expect(await screen.findByRole("alert")).toHaveTextContent("Network connection lost while deleting account.");
      expect(deleteButton()).toBeEnabled();
    });
  });

  describe("cancelling", () => {
    it("closes from Cancel without deleting", () => {
      const { onClose } = renderModal();

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("forgets what was typed, so a reopened dialog never starts armed", () => {
      const onClose = vi.fn();
      const view = renderModal({ onClose });
      fireEvent.change(input(), { target: { value: "DELETE" } });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      view.rerender(
        <MemoryRouter>
          <DeleteAccountModal open={false} onClose={onClose} />
        </MemoryRouter>,
      );
      view.rerender(
        <MemoryRouter>
          <DeleteAccountModal open onClose={onClose} />
        </MemoryRouter>,
      );

      expect(input().value).toBe("");
      expect(deleteButton()).toBeDisabled();
    });
  });
});
