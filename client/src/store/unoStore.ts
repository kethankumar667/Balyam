import { create } from "zustand";
import type { UnoCard, UnoColor } from "@shared/types";

/**
 * Local UI state for UNO — not game state.
 * Game state comes from server via `game:state` event into roomStore.
 */
interface UnoUIState {
  selectedCardId: string | null;
  setSelectedCard: (cardId: string | null) => void;

  selectedWildColor: UnoColor | null;
  setWildColor: (color: UnoColor | null) => void;

  hoveredCardId: string | null;
  setHoveredCard: (cardId: string | null) => void;

  isPlayingCard: boolean;
  setIsPlayingCard: (playing: boolean) => void;

  lastPlayedCardId: string | null;
  setLastPlayedCard: (cardId: string | null) => void;

  reset: () => void;
}

export const useUnoStore = create<UnoUIState>((set) => ({
  selectedCardId: null,
  setSelectedCard: (cardId) => set({ selectedCardId: cardId }),

  selectedWildColor: null,
  setWildColor: (color) => set({ selectedWildColor: color }),

  hoveredCardId: null,
  setHoveredCard: (cardId) => set({ hoveredCardId: cardId }),

  isPlayingCard: false,
  setIsPlayingCard: (playing) => set({ isPlayingCard: playing }),

  lastPlayedCardId: null,
  setLastPlayedCard: (cardId) => set({ lastPlayedCardId: cardId }),

  reset: () =>
    set({
      selectedCardId: null,
      selectedWildColor: null,
      hoveredCardId: null,
      isPlayingCard: false,
      lastPlayedCardId: null,
    }),
}));
