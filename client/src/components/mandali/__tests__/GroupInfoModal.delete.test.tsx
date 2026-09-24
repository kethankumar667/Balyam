import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import GroupInfoModal from "../GroupInfoModal";

/**
 * The owner deleting their Mandali from the group info sheet.
 *
 * Deleting is permanent, so the sheet makes it hard to do by accident (two
 * steps, and the handle must be typed), easy to back out of, and impossible to
 * fire twice. Only the owner is ever offered it.
 */

const mandali = {
  id: "man1", name: "Ludo Lounge", handle: "ludo-lounge", description: "d", rules: "",
  editPermission: "ADMIN", sendPermission: "ALL", joinApproval: false,
} as never;

type Result = { success: boolean; error?: string };

function renderSheet(over: {
  isOwner?: boolean;
  canEditInfo?: boolean;
  onDelete?: ((handle: string) => Promise<Result>) | null;
  open?: boolean;
} = {}) {
  const onClose = vi.fn();
  const onSave = vi.fn(async () => ({ success: true }));
  const onDelete = over.onDelete === null ? undefined : over.onDelete ?? vi.fn(async () => ({ success: true }));
  const view = render(
    <GroupInfoModal
      open={over.open ?? true}
      onClose={onClose}
      mandali={mandali}
      canEditInfo={over.canEditInfo ?? true}
      isOwner={over.isOwner ?? true}
      onSave={onSave}
      onDelete={onDelete}
    />,
  );
  return { view, onClose, onDelete: onDelete as ReturnType<typeof vi.fn> | undefined };
}

const openConfirmation = () => fireEvent.click(screen.getByRole("button", { name: /^delete mandali/i }));
const confirmationInput = () => screen.getByLabelText(/type .*ludo-lounge.* to confirm/i) as HTMLInputElement;
const type = (value: string) => fireEvent.change(confirmationInput(), { target: { value } });
const deleteForever = () => screen.getByRole("button", { name: /delete forever/i }) as HTMLButtonElement;

describe("GroupInfoModal — deleting the Mandali", () => {
  afterEach(cleanup);

  describe("who is offered it", () => {
    it("the owner sees a Delete Mandali control", () => {
      renderSheet({ isOwner: true });

      expect(screen.getByRole("button", { name: /^delete mandali/i })).toBeTruthy();
    });

    it("an admin who can edit the info does not", () => {
      renderSheet({ isOwner: false, canEditInfo: true });

      expect(screen.queryByRole("button", { name: /delete mandali/i })).toBeNull();
    });

    it("an ordinary member does not", () => {
      renderSheet({ isOwner: false, canEditInfo: false });

      expect(screen.queryByText(/delete mandali/i)).toBeNull();
    });

    it("nobody does when the page gave no way to delete", () => {
      renderSheet({ isOwner: true, onDelete: null });

      expect(screen.queryByText(/delete mandali/i)).toBeNull();
    });
  });

  describe("making it hard to do by accident", () => {
    it("the first click only asks; it deletes nothing", () => {
      const { onDelete } = renderSheet();

      openConfirmation();

      expect(onDelete).not.toHaveBeenCalled();
      expect(deleteForever()).toBeTruthy();
    });

    it("says plainly what will be lost, and what will not", () => {
      renderSheet();

      openConfirmation();

      const warning = screen.getByRole("alert");
      expect(warning.textContent).toMatch(/permanent/i);
      expect(warning.textContent).toMatch(/every message/i);
      expect(warning.textContent).toMatch(/removed from the Mandali/i);
      expect(warning.textContent).toMatch(/coins.*not.*(returned|reversed|affected)/i);
    });

    it("keeps the final button disabled until the handle has been typed", () => {
      renderSheet();
      openConfirmation();

      expect(deleteForever().disabled).toBe(true);
      type("ludo");
      expect(deleteForever().disabled).toBe(true);
      type("ludo-lounge-2");
      expect(deleteForever().disabled).toBe(true);
      type("ludo-lounge");
      expect(deleteForever().disabled).toBe(false);
    });

    it("accepts the handle typed the way people type it — spaced, capitalised, with an @", () => {
      renderSheet();
      openConfirmation();

      type("  @Ludo-Lounge ");

      expect(deleteForever().disabled).toBe(false);
    });

    it("never calls delete while the handle is wrong, even if the button is forced", () => {
      const { onDelete } = renderSheet();
      openConfirmation();
      type("wrong");

      fireEvent.click(deleteForever());
      fireEvent.submit(confirmationInput().closest("form")!);

      expect(onDelete).not.toHaveBeenCalled();
    });

    it("lets the owner back out, clearing what was typed", () => {
      const { onDelete } = renderSheet();
      openConfirmation();
      type("ludo-lounge");

      fireEvent.click(screen.getByRole("button", { name: /keep mandali/i }));

      expect(screen.queryByLabelText(/to confirm/i)).toBeNull();
      expect(onDelete).not.toHaveBeenCalled();
      openConfirmation();
      expect(confirmationInput().value).toBe("");
    });

    it("starts collapsed and empty every time the sheet is opened", () => {
      const { view } = renderSheet();
      openConfirmation();
      type("ludo-lounge");

      view.rerender(
        <GroupInfoModal open={false} onClose={vi.fn()} mandali={mandali} canEditInfo isOwner onSave={vi.fn()} onDelete={vi.fn()} />,
      );
      view.rerender(
        <GroupInfoModal open onClose={vi.fn()} mandali={mandali} canEditInfo isOwner onSave={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.queryByLabelText(/to confirm/i)).toBeNull();
    });

    it("does not lose a half-typed confirmation when live updates refresh the Mandali", () => {
      const { view } = renderSheet();
      openConfirmation();
      type("ludo-lo");

      const refreshed = { ...(mandali as object), name: "Ludo Lounge (renamed)" } as never;
      view.rerender(
        <GroupInfoModal open onClose={vi.fn()} mandali={refreshed} canEditInfo isOwner onSave={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(confirmationInput().value).toBe("ludo-lo");
    });
  });

  describe("deleting", () => {
    it("sends exactly what was typed, then closes the sheet", async () => {
      const { onDelete, onClose } = renderSheet();
      openConfirmation();
      type("ludo-lounge");

      fireEvent.click(deleteForever());

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(onDelete).toHaveBeenCalledWith("ludo-lounge");
    });

    it("also submits from the keyboard (Enter in the field)", async () => {
      const { onDelete, onClose } = renderSheet();
      openConfirmation();
      type("ludo-lounge");

      fireEvent.submit(confirmationInput().closest("form")!);

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("cannot be fired twice by an impatient double click", async () => {
      let finish: (r: Result) => void = () => undefined;
      const onDelete = vi.fn(() => new Promise<Result>((resolve) => (finish = resolve)));
      renderSheet({ onDelete });
      openConfirmation();
      type("ludo-lounge");

      // Both land in the same tick, before React has re-rendered the button as disabled.
      const form = confirmationInput().closest("form")!;
      act(() => {
        fireEvent.submit(form);
        fireEvent.submit(form);
      });
      finish({ success: true });

      await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    });

    it("shows it is working, and blocks backing out mid-delete", async () => {
      let finish: (r: Result) => void = () => undefined;
      const onDelete = vi.fn(() => new Promise<Result>((resolve) => (finish = resolve)));
      renderSheet({ onDelete });
      openConfirmation();
      type("ludo-lounge");

      fireEvent.click(deleteForever());

      await waitFor(() => expect(deleteForever().disabled).toBe(true));
      expect(deleteForever().getAttribute("aria-busy")).toBe("true");
      expect((screen.getByRole("button", { name: /keep mandali/i }) as HTMLButtonElement).disabled).toBe(true);
      finish({ success: true });
    });

    it("stays open and says why when the server refuses, and lets the owner try again", async () => {
      const onDelete = vi.fn(async () => ({ success: false, error: "Only the owner can delete this Mandali." }));
      const { onClose } = renderSheet({ onDelete });
      openConfirmation();
      type("ludo-lounge");

      fireEvent.click(deleteForever());

      await waitFor(() => expect(screen.getAllByRole("alert").some((a) => /only the owner/i.test(a.textContent ?? ""))).toBe(true));
      expect(onClose).not.toHaveBeenCalled();
      expect(deleteForever().disabled).toBe(false);
      expect(confirmationInput().value).toBe("ludo-lounge");
    });

    it("stays open with a plain message when the request itself blows up", async () => {
      const onDelete = vi.fn(async () => {
        throw new Error("offline");
      });
      const { onClose } = renderSheet({ onDelete });
      openConfirmation();
      type("ludo-lounge");

      fireEvent.click(deleteForever());

      await waitFor(() => expect(screen.getAllByRole("alert").some((a) => /could not delete/i.test(a.textContent ?? ""))).toBe(true));
      expect(onClose).not.toHaveBeenCalled();
      expect(deleteForever().disabled).toBe(false);
    });
  });
});
