import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor, renderHook } from "@testing-library/react";
import type { BlockedPlayer } from "@shared/social/Block";
import type { Friend } from "@shared/social/Friend";
import { REPORT_REASONS, REPORT_REASON_LABELS } from "@shared/social/Report";
import ConfirmDialog from "../ConfirmDialog";
import ReportPlayerDialog from "../ReportPlayerDialog";
import BlockedPlayersPanel from "../BlockedPlayersPanel";
import FriendsList from "../FriendsList";
import { useLoadable } from "../useLoadable";

const DIYA: Friend = { playerId: "p1", friendPlayerId: "p2", displayName: "Diya", createdAt: 1 };

function dialog(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  return (
    <ConfirmDialog
      idPrefix="t"
      title="Do the thing"
      description="Are you sure?"
      confirmLabel="Do it"
      busyLabel="Doing…"
      fallbackError="It failed."
      onConfirm={vi.fn().mockResolvedValue(undefined)}
      onClose={vi.fn()}
      {...overrides}
    />
  );
}

describe("ConfirmDialog", () => {
  it("closes only after a successful confirm", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(dialog({ onClose, onConfirm }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open and shows the reason when the action fails", async () => {
    const onClose = vi.fn();
    render(dialog({ onClose, onConfirm: vi.fn().mockRejectedValue(new Error("Server said no")) }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("Server said no");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to its own words when the rejection carries no message", async () => {
    render(dialog({ onConfirm: vi.fn().mockRejectedValue("nope") }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("It failed.");
  });

  it("keeps focus on the confirm button while working, even when the parent hands it a new onClose", async () => {
    let finish: () => void = () => {};
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const { rerender } = render(dialog({ onConfirm: () => pending }));
    const confirm = screen.getByRole("button", { name: "Do it" });
    confirm.focus();

    act(() => {
      fireEvent.click(confirm);
    });
    expect(screen.getByRole("button", { name: "Doing…" })).toBe(confirm);
    // A parent that builds `onClose` inline gives a NEW function on every render.
    rerender(dialog({ onConfirm: () => pending, onClose: () => undefined }));

    expect(document.activeElement).toBe(confirm);
    await act(async () => finish());
  });

  it("ignores a second click and a dismiss while it is working", async () => {
    let finish: () => void = () => {};
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const onConfirm = vi.fn(() => pending);
    const onClose = vi.fn();
    render(dialog({ onConfirm, onClose }));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Doing…" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => finish());
  });

  it("does not run the action while confirm is disabled", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(dialog({ onConfirm, confirmDisabled: true }));

    const confirm = screen.getByRole("button", { name: "Do it" }) as HTMLButtonElement;
    fireEvent.click(confirm);

    expect(confirm.disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ReportPlayerDialog", () => {
  it("offers exactly the fixed list of reasons and nothing to type into", () => {
    render(<ReportPlayerDialog playerName="Diya" onReport={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getAllByRole("radio")).toHaveLength(REPORT_REASONS.length);
    for (const reason of REPORT_REASONS) {
      expect(screen.getByLabelText(REPORT_REASON_LABELS[reason])).toBeDefined();
    }
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("cannot be sent until a reason is chosen, then sends that reason", async () => {
    const onReport = vi.fn().mockResolvedValue(undefined);
    render(<ReportPlayerDialog playerName="Diya" onReport={onReport} onClose={vi.fn()} />);
    const send = screen.getByRole("button", { name: "Send report" }) as HTMLButtonElement;

    expect(send.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(REPORT_REASON_LABELS.CHEATING));
    expect(send.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(send);
    });

    expect(onReport).toHaveBeenCalledWith("CHEATING");
  });

  it("says only what is true about who is told", () => {
    render(<ReportPlayerDialog playerName="Diya" onReport={vi.fn()} onClose={vi.fn()} />);

    const text = document.body.textContent ?? "";
    expect(text).toMatch(/saved for the BHALYAM team/i);
    expect(text).toMatch(/not told who sent it/i);
    expect(text).not.toMatch(/reviewed|investigat|within \d+ (hours|days)/i);
  });
});

describe("BlockedPlayersPanel", () => {
  const SAI: BlockedPlayer = { playerId: "player_sai", displayName: "Sai Kumar", blockedAt: 1_700_000_000_000 };

  it("says plainly that nobody is blocked", () => {
    render(<BlockedPlayersPanel blocked={[]} onUnblock={vi.fn()} />);

    expect(screen.getByRole("status").textContent).toMatch(/haven.t blocked anyone/i);
  });

  it("lists each player and explains that unblocking does not restore the friendship", () => {
    render(<BlockedPlayersPanel blocked={[SAI]} onUnblock={vi.fn()} />);

    expect(screen.getByText("Sai Kumar")).toBeDefined();
    expect(screen.getByText(/does not make you friends again/i)).toBeDefined();
  });

  it("unblocks by id", async () => {
    const onUnblock = vi.fn().mockResolvedValue(undefined);
    render(<BlockedPlayersPanel blocked={[SAI]} onUnblock={onUnblock} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unblock Sai Kumar" }));
    });

    expect(onUnblock).toHaveBeenCalledWith("player_sai");
  });

  it("shows why and keeps the row when unblocking fails", async () => {
    render(<BlockedPlayersPanel blocked={[SAI]} onUnblock={vi.fn().mockRejectedValue(new Error("Try later"))} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unblock Sai Kumar" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("Try later");
    expect(screen.getByText("Sai Kumar")).toBeDefined();
  });
});

describe("FriendsList — block and report", () => {
  it("offers Block and Report only when something handles them", () => {
    const { rerender } = render(<FriendsList friends={[DIYA]} presences={{}} onRemoveFriend={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Block Diya" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Report Diya" })).toBeNull();

    rerender(
      <FriendsList
        friends={[DIYA]}
        presences={{}}
        onRemoveFriend={vi.fn()}
        onBlockFriend={vi.fn()}
        onReportFriend={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Block Diya" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Report Diya" })).toBeDefined();
  });

  it("blocks only after a confirm that spells out the consequences", async () => {
    const onBlockFriend = vi.fn().mockResolvedValue(undefined);
    render(<FriendsList friends={[DIYA]} presences={{}} onRemoveFriend={vi.fn()} onBlockFriend={onBlockFriend} />);

    fireEvent.click(screen.getByRole("button", { name: "Block Diya" }));
    expect(onBlockFriend).not.toHaveBeenCalled();
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/removed from your friends/i);
    expect(text).toMatch(/pending requests between you will end/i);
    expect(text).toMatch(/they are not told/i);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Block" }));
    });

    expect(onBlockFriend).toHaveBeenCalledWith(DIYA);
  });

  it("does not block when the dialog is cancelled", () => {
    const onBlockFriend = vi.fn();
    render(<FriendsList friends={[DIYA]} presences={{}} onRemoveFriend={vi.fn()} onBlockFriend={onBlockFriend} />);

    fireEvent.click(screen.getByRole("button", { name: "Block Diya" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onBlockFriend).not.toHaveBeenCalled();
    expect(screen.queryByText("Block player")).toBeNull();
  });
});

describe("useLoadable", () => {
  const options = (over: Partial<Parameters<typeof useLoadable>[2]> = {}) => ({
    key: "me" as string | null,
    loadFailed: "Couldn't load.",
    refreshFailed: "Couldn't refresh.",
    onRefreshError: vi.fn(),
    ...over,
  });

  it("fetches nothing until it knows whose data this is", () => {
    const fetcher = vi.fn().mockResolvedValue(["a"]);
    const { result } = renderHook(() => useLoadable<string[]>([], fetcher, options({ key: null })));

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.state).toBe("loading");
  });

  it("loads, passing the key to the fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue(["a"]);
    const { result } = renderHook(() => useLoadable<string[]>([], fetcher, options()));

    await waitFor(() => expect(result.current.state).toBe("ready"));

    expect(fetcher).toHaveBeenCalledWith("me");
    expect(result.current.data).toEqual(["a"]);
  });

  it("reloads for a different key", async () => {
    const fetcher = vi.fn().mockImplementation(async (id: string) => [id]);
    const { result, rerender } = renderHook(({ key }) => useLoadable<string[]>([], fetcher, options({ key })), {
      initialProps: { key: "me" as string | null },
    });
    await waitFor(() => expect(result.current.data).toEqual(["me"]));

    rerender({ key: "someone_else" });

    await waitFor(() => expect(result.current.data).toEqual(["someone_else"]));
  });

  it("does not refetch just because the fetcher is a new function each render", async () => {
    const calls = vi.fn().mockResolvedValue(["a"]);
    const { result, rerender } = renderHook(() => useLoadable<string[]>([], (id) => calls(id), options()));
    await waitFor(() => expect(result.current.state).toBe("ready"));

    rerender();
    rerender();

    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("a failed first load becomes an error state with the message, and Retry recovers", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(["ok"]);
    const { result } = renderHook(() => useLoadable<string[]>([], fetcher, options()));

    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.error).toBe("boom");

    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.state).toBe("ready");
    expect(result.current.data).toEqual(["ok"]);
  });

  it("a failed silent refresh keeps what is on screen and reports through the callback", async () => {
    const onRefreshError = vi.fn();
    const fetcher = vi.fn().mockResolvedValueOnce(["kept"]).mockRejectedValue(new Error("flaky"));
    const { result } = renderHook(() => useLoadable<string[]>([], fetcher, options({ onRefreshError })));
    await waitFor(() => expect(result.current.state).toBe("ready"));

    await act(async () => {
      await result.current.reload(true);
    });

    expect(result.current.state).toBe("ready");
    expect(result.current.data).toEqual(["kept"]);
    expect(onRefreshError).toHaveBeenCalledWith("flaky");
  });
});
