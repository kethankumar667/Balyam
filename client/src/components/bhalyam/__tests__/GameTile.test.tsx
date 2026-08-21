import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameTile from "../GameTile";
import { getGameById, type GameCatalogueItem } from "../../../catalog/gameCatalog";

describe("Milestone 03: Reusable GameTile Component Suite", () => {
  const ludoGame = getGameById("ludo")!;
  const handCricketGame = getGameById("handcricket")!;

  const disabledGame: GameCatalogueItem = {
    ...ludoGame,
    id: "ludo",
    name: "Gilli Danda",
    availability: "coming_soon",
  };

  /* ──────────────────────── 1. Standard Variant ──────────────────────── */
  describe("1. Standard Variant (Default)", () => {
    it("renders game name, Telugu subtitle, tagline, player count, and duration", () => {
      render(<GameTile game={ludoGame} />);

      expect(screen.getByText("Ludo")).toBeDefined();
      expect(screen.getByText("లూడో")).toBeDefined();
      expect(screen.getByText("Roll, capture & race home")).toBeDefined();
      expect(screen.getByText("2–8")).toBeDefined();
      expect(screen.getByText("15–45")).toBeDefined();
      expect(screen.getByText("board")).toBeDefined();
    });

    it("renders bot support chip when supportsBots is true", () => {
      render(<GameTile game={ludoGame} />);
      expect(screen.getByText("Bots")).toBeDefined();
    });

    it("renders Popular, Recent, and NEW state badges", () => {
      const { rerender } = render(<GameTile game={ludoGame} isPopular={true} />);
      expect(screen.getByText("Popular")).toBeDefined();

      rerender(<GameTile game={ludoGame} isRecentlyPlayed={true} />);
      expect(screen.getByText("Recent")).toBeDefined();

      rerender(<GameTile game={ludoGame} isNew={true} />);
      expect(screen.getByText("NEW")).toBeDefined();
    });
  });

  /* ──────────────────────── 2. Interactive Callbacks & Keyboard ──────────────────────── */
  describe("2. Selection & Keyboard Accessibility", () => {
    it("invokes onSelect when clicked", () => {
      const onSelect = vi.fn();
      render(<GameTile game={ludoGame} onSelect={onSelect} />);

      const tile = screen.getByRole("button", { name: /Ludo/i });
      fireEvent.click(tile);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(ludoGame);
    });

    it("invokes onSelect on Keyboard Enter and Space", () => {
      const onSelect = vi.fn();
      render(<GameTile game={ludoGame} onSelect={onSelect} />);

      const tile = screen.getByRole("button", { name: /Ludo/i });
      fireEvent.keyDown(tile, { key: "Enter" });
      expect(onSelect).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(tile, { key: " " });
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("triggers favorite callback without triggering tile selection", () => {
      const onSelect = vi.fn();
      const onToggleFavorite = vi.fn();

      render(
        <GameTile
          game={ludoGame}
          isFavorite={false}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      );

      const favButton = screen.getByLabelText(/Add Ludo to favorites/i);
      fireEvent.click(favButton);

      expect(onToggleFavorite).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  /* ──────────────────────── 3. Compact Variant ──────────────────────── */
  describe("3. Compact Variant (Rails & Rails)", () => {
    it("renders high-density compact layout with game details", () => {
      const onSelect = vi.fn();
      render(<GameTile game={handCricketGame} variant="compact" onSelect={onSelect} />);

      expect(screen.getByText("Hand Cricket")).toBeDefined();
      expect(screen.getByText("2")).toBeDefined();

      const tile = screen.getByRole("button", { name: /Hand Cricket/i });
      fireEvent.click(tile);
      expect(onSelect).toHaveBeenCalledWith(handCricketGame);
    });
  });

  /* ──────────────────────── 4. Featured Variant ──────────────────────── */
  describe("4. Featured Variant (Nostalgia Worlds)", () => {
    it("renders featured layout with nostalgia quote and hero details", () => {
      const onSelect = vi.fn();
      render(<GameTile game={ludoGame} variant="featured" onSelect={onSelect} />);

      expect(screen.getByText("Featured Memory")).toBeDefined();
      expect(screen.getByText(/Roll a six or sit on the porch!/i)).toBeDefined();
      expect(screen.getByText("2–8 Players")).toBeDefined();

      const tile = screen.getByRole("button", { name: /Ludo, Featured game/i });
      fireEvent.click(tile);
      expect(onSelect).toHaveBeenCalledWith(ludoGame);
    });
  });

  /* ──────────────────────── 5. Coming Soon & Disabled State ──────────────────────── */
  describe("5. Disabled & Coming Soon State", () => {
    it("renders Coming Soon overlay and prevents selection", () => {
      const onSelect = vi.fn();
      render(<GameTile game={disabledGame} onSelect={onSelect} />);

      expect(screen.getByText("Coming Soon")).toBeDefined();

      const tile = screen.getByRole("button", { name: /Gilli Danda/i });
      fireEvent.click(tile);
      expect(onSelect).not.toHaveBeenCalled();

      fireEvent.keyDown(tile, { key: "Enter" });
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
