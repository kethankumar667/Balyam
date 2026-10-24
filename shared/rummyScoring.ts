export interface RummyRoundScore {
  playerOrder: readonly string[];
  scores?: Record<string, number>;
  winnerId?: string | null;
  invalidDeclareBy?: string | null;
}

/** The signed points shown on the round's score sheet, not cumulative pool penalties or coins. */
export function rummyRoundPoints(state: RummyRoundScore, playerId: string): number {
  if (state.invalidDeclareBy) {
    if (playerId === state.invalidDeclareBy) return -80;
    const opponents = state.playerOrder.filter((id) => id !== state.invalidDeclareBy);
    return opponents.length > 0 ? Math.round(80 / opponents.length) : 0;
  }
  const loss = (id: string) => Math.max(0, state.scores?.[id] ?? 0);
  return playerId === state.winnerId
    ? state.playerOrder.reduce((total, id) => id === playerId ? total : total + loss(id), 0)
    : -loss(playerId);
}
