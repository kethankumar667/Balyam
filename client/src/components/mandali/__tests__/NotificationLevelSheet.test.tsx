import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import NotificationLevelSheet from "../NotificationLevelSheet";

const renderSheet = (over: { level?: "ALL" | "INVITES_ONLY" | "MUTED"; onChange?: (l: never) => Promise<boolean> } = {}) => {
  const onClose = vi.fn();
  const onChange = over.onChange ?? vi.fn(async () => true);
  render(
    <NotificationLevelSheet
      open
      onClose={onClose}
      mandaliName="Ludo Lounge"
      level={over.level ?? "ALL"}
      onChange={onChange as never}
    />
  );
  return { onClose, onChange: onChange as ReturnType<typeof vi.fn> };
};

describe("NotificationLevelSheet", () => {
  afterEach(cleanup);

  it("offers the three levels and marks the current one", () => {
    renderSheet({ level: "INVITES_ONLY" });

    expect(screen.getByLabelText(/All messages/)).toBeTruthy();
    expect((screen.getByLabelText(/Invites only/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Muted/) as HTMLInputElement).checked).toBe(false);
  });

  it("saves a new level and closes", async () => {
    const { onChange, onClose } = renderSheet();

    fireEvent.click(screen.getByLabelText(/Muted/));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith("MUTED");
  });

  it("does nothing when the current level is chosen again", () => {
    const { onChange, onClose } = renderSheet({ level: "ALL" });

    fireEvent.click(screen.getByLabelText(/All messages/));

    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open and says so when the server refuses", async () => {
    const { onClose } = renderSheet({ onChange: vi.fn(async () => false) });

    fireEvent.click(screen.getByLabelText(/Muted/));

    expect((await screen.findByRole("alert")).textContent).toContain("Could not save");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("names the Mandali it is about", () => {
    renderSheet();

    expect(screen.getByText(/How loud Ludo Lounge may be for you/)).toBeTruthy();
  });
});
