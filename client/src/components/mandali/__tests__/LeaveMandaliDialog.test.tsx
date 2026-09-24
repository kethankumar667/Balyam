import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import LeaveMandaliDialog, { type HostCandidate } from "../LeaveMandaliDialog";

/**
 * Leaving a Mandali, from the member's side.
 *
 * Three situations, three screens: an ordinary member is simply asked to
 * confirm; the host must first choose who takes over; a host with nobody to
 * hand over to is pointed at deleting the group instead.
 */

type Result = { success: boolean; error?: string };

const heirs: HostCandidate[] = [
  { playerId: "p_sai", displayName: "Sai", role: "MEMBER" },
  { playerId: "p_asha", displayName: "Asha", role: "ADMIN" },
];

function renderDialog(over: {
  isOwner?: boolean;
  candidates?: HostCandidate[];
  onLeave?: (newHostId?: string) => Promise<Result>;
  onDeleteInstead?: (() => void) | null;
  open?: boolean;
} = {}) {
  const onClose = vi.fn();
  const onLeave = over.onLeave ?? vi.fn(async () => ({ success: true }));
  const onDeleteInstead = over.onDeleteInstead === null ? undefined : over.onDeleteInstead ?? vi.fn();
  const view = render(
    <LeaveMandaliDialog
      open={over.open ?? true}
      onClose={onClose}
      mandaliName="Ludo Lounge"
      isOwner={over.isOwner ?? false}
      candidates={over.candidates ?? heirs}
      onLeave={onLeave}
      onDeleteInstead={onDeleteInstead}
    />,
  );
  return { view, onClose, onLeave: onLeave as ReturnType<typeof vi.fn>, onDeleteInstead: onDeleteInstead as ReturnType<typeof vi.fn> | undefined };
}

const leaveButton = () => screen.getByRole("button", { name: /^leave$/i }) as HTMLButtonElement;
const handOverButton = () => screen.getByRole("button", { name: /make .*host & leave/i }) as HTMLButtonElement;

describe("LeaveMandaliDialog", () => {
  afterEach(cleanup);

  describe("an ordinary member", () => {
    it("is asked to confirm, naming the Mandali", () => {
      renderDialog();

      expect(screen.getByRole("heading", { name: /leave .*ludo lounge/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^stay$/i })).toBeTruthy();
      expect(leaveButton()).toBeTruthy();
    });

    it("is not asked to choose a host", () => {
      renderDialog();

      expect(screen.queryByRole("radio")).toBeNull();
    });

    it("leaves, sending no new host, and the dialog closes", async () => {
      const { onLeave, onClose } = renderDialog();

      fireEvent.click(leaveButton());

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(onLeave).toHaveBeenCalledWith(undefined);
    });

    it("staying closes it without leaving", () => {
      const { onLeave, onClose } = renderDialog();

      fireEvent.click(screen.getByRole("button", { name: /^stay$/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onLeave).not.toHaveBeenCalled();
    });

    it("says what leaving means for them", () => {
      renderDialog();

      expect(screen.getByText(/stop receiving/i)).toBeTruthy();
    });
  });

  describe("the host, with people to hand over to", () => {
    it("is told they must make someone else the host, and is shown who they can pick", () => {
      renderDialog({ isOwner: true });

      expect(screen.getByRole("heading", { name: /choose a new host/i })).toBeTruthy();
      expect(screen.getByText(/you are the host/i)).toBeTruthy();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
      expect(screen.getByText("Sai")).toBeTruthy();
      expect(screen.getByText("Asha")).toBeTruthy();
    });

    it("offers no plain Leave button — they cannot walk out without choosing", () => {
      renderDialog({ isOwner: true });

      expect(screen.queryByRole("button", { name: /^leave$/i })).toBeNull();
    });

    it("cannot proceed until someone is chosen", () => {
      renderDialog({ isOwner: true });

      expect(handOverButton().disabled).toBe(true);
      fireEvent.click(screen.getByRole("radio", { name: /asha/i }));
      expect(handOverButton().disabled).toBe(false);
    });

    it("hands over to exactly the person chosen, then closes", async () => {
      const { onLeave, onClose } = renderDialog({ isOwner: true });
      fireEvent.click(screen.getByRole("radio", { name: /sai/i }));

      fireEvent.click(handOverButton());

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(onLeave).toHaveBeenCalledWith("p_sai");
    });

    it("names the person in the confirm button, so there is no doubt who will be in charge", () => {
      renderDialog({ isOwner: true });

      fireEvent.click(screen.getByRole("radio", { name: /asha/i }));

      expect(handOverButton().textContent).toMatch(/asha/i);
    });

    it("forgets a choice when the chosen person is no longer in the group", () => {
      const { view } = renderDialog({ isOwner: true });
      fireEvent.click(screen.getByRole("radio", { name: /sai/i }));

      view.rerender(
        <LeaveMandaliDialog
          open onClose={vi.fn()} mandaliName="Ludo Lounge" isOwner
          candidates={[heirs[1]]} onLeave={vi.fn()}
        />,
      );

      expect(handOverButton().disabled).toBe(true);
    });

    it("starts with nobody chosen every time it is opened", () => {
      const { view } = renderDialog({ isOwner: true });
      fireEvent.click(screen.getByRole("radio", { name: /sai/i }));

      for (const open of [false, true]) {
        view.rerender(
          <LeaveMandaliDialog open={open} onClose={vi.fn()} mandaliName="Ludo Lounge" isOwner candidates={heirs} onLeave={vi.fn()} />,
        );
      }

      expect((screen.getByRole("radio", { name: /sai/i }) as HTMLInputElement).checked).toBe(false);
    });
  });

  describe("the host, alone in the group", () => {
    it("is told there is nobody to hand over to, and is not offered a way to leave", () => {
      renderDialog({ isOwner: true, candidates: [] });

      expect(screen.getByText(/only member/i)).toBeTruthy();
      expect(screen.queryByRole("radio")).toBeNull();
      expect(screen.queryByRole("button", { name: /leave/i })).toBeNull();
    });

    it("is pointed at deleting the Mandali instead", () => {
      const { onDeleteInstead } = renderDialog({ isOwner: true, candidates: [] });

      fireEvent.click(screen.getByRole("button", { name: /delete mandali/i }));

      expect(onDeleteInstead).toHaveBeenCalledTimes(1);
    });

    it("is not pointed at deleting when the page gave no way to", () => {
      renderDialog({ isOwner: true, candidates: [], onDeleteInstead: null });

      expect(screen.queryByRole("button", { name: /delete mandali/i })).toBeNull();
    });
  });

  describe("when it does not work", () => {
    it("stays open and says why, and lets them try again", async () => {
      const onLeave = vi.fn(async () => ({ success: false, error: "You are not an active member of this Mandali." }));
      const { onClose } = renderDialog({ onLeave });

      fireEvent.click(leaveButton());

      await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/not an active member/i));
      expect(onClose).not.toHaveBeenCalled();
      expect(leaveButton().disabled).toBe(false);
    });

    it("stays open with a plain message when the request itself blows up", async () => {
      const onLeave = vi.fn(async () => {
        throw new Error("offline");
      });
      const { onClose } = renderDialog({ onLeave });

      fireEvent.click(leaveButton());

      await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/could not leave/i));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps the host's choice after a failed hand-over", async () => {
      const onLeave = vi.fn(async () => ({ success: false, error: "new owner must be an active member" }));
      renderDialog({ isOwner: true, onLeave });
      fireEvent.click(screen.getByRole("radio", { name: /sai/i }));

      fireEvent.click(handOverButton());

      await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
      expect((screen.getByRole("radio", { name: /sai/i }) as HTMLInputElement).checked).toBe(true);
    });
  });

  describe("while it is working", () => {
    it("cannot be fired twice by an impatient double tap", async () => {
      let finish: (r: Result) => void = () => undefined;
      const onLeave = vi.fn(() => new Promise<Result>((resolve) => (finish = resolve)));
      renderDialog({ onLeave });

      act(() => {
        fireEvent.click(leaveButton());
        fireEvent.click(leaveButton());
      });
      finish({ success: true });

      await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
    });

    it("shows it is busy and blocks backing out mid-way", async () => {
      let finish: (r: Result) => void = () => undefined;
      const onLeave = vi.fn(() => new Promise<Result>((resolve) => (finish = resolve)));
      renderDialog({ onLeave });

      fireEvent.click(leaveButton());

      await waitFor(() => expect(leaveButton().getAttribute("aria-busy")).toBe("true"));
      expect((screen.getByRole("button", { name: /^stay$/i }) as HTMLButtonElement).disabled).toBe(true);
      finish({ success: true });
    });
  });
});
