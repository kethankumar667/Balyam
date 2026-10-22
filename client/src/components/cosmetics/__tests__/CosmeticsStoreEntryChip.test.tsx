import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CosmeticsStoreEntryChip } from "../CosmeticsStoreEntryChip";

function renderChip() {
  return render(
    <MemoryRouter initialEntries={["/games"]}>
      <Routes>
        <Route path="/games" element={<CosmeticsStoreEntryChip />} />
        <Route path="/shop" element={<div>the shop page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CosmeticsStoreEntryChip", () => {
  it("takes the player to the shop page rather than opening a dialog", () => {
    renderChip();

    fireEvent.click(screen.getByRole("button", { name: /Cosmetics Boutique/i }));

    expect(screen.getByText("the shop page")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
