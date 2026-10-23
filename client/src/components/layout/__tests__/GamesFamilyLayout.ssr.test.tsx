import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("../AppLayout", () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock("../../bhalyam/GameRoomSheet", () => ({
  default: ({ game, onClose }: { game: string; onClose: () => void }) => (
    <div role="dialog" aria-label={game}><button onClick={onClose}>Close</button></div>
  ),
}));

import GamesFamilyLayout, { type GamesFamilyOutletContext } from "../GamesFamilyLayout";

function Catalog() {
  const { openGameSheet } = useOutletContext<GamesFamilyOutletContext>();
  return <button onClick={() => openGameSheet("ludo")}>Select Ludo</button>;
}

function FamilyRoutes() {
  return <Routes><Route element={<GamesFamilyLayout />}>
    <Route path="/games" element={<Catalog />} />
  </Route></Routes>;
}

afterEach(cleanup);

describe("games family create sheet", () => {
  it("prerenders the catalog without loading a closed sheet", () => {
    const html = renderToString(<StaticRouter location="/games"><FamilyRoutes /></StaticRouter>);
    expect(html).toContain("Select Ludo");
    expect(html).not.toContain("<!--$");
  });

  it("opens, closes and reopens the selected game's sheet", async () => {
    render(<MemoryRouter initialEntries={["/games"]}><FamilyRoutes /></MemoryRouter>);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Select Ludo"));
    expect(await screen.findByRole("dialog", { name: "ludo" })).toBeDefined();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Select Ludo"));
    expect(await screen.findByRole("dialog", { name: "ludo" })).toBeDefined();
  });
});
