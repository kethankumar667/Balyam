import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type { Player, UnoState } from "@shared/types.js";

const STARTING_HAND = 7;
const DECK_SIZE = 108;
const UNO_FACES = [
  "R5",
  "G2",
  "B9",
  "Y7",
  "R+2",
  "GSkip",
  "BRev",
  "Wild",
  "Wild+4",
] as const;

function randomFace(): string {
  return UNO_FACES[Math.floor(Math.random() * UNO_FACES.length)] ?? "Wild";
}

export class UnoEngine implements GameEngine {
  readonly kind = "uno" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private state!: UnoState;
  private playerIds: string[] = [];

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`UNO requires ${this.minPlayers}-${this.maxPlayers} players`);
    }

    this.playerIds = players.map((p) => p.id);
    const handSizes: Record<string, number> = {};
    for (const id of this.playerIds) handSizes[id] = STARTING_HAND;

    const usedCards = players.length * STARTING_HAND + 1;
    this.state = {
      kind: "uno",
      phase: "playing",
      playerOrder: [...this.playerIds],
      turnPlayerId: this.playerIds[0]!,
      direction: 1,
      topCard: randomFace(),
      handSizes,
      drawPileCount: Math.max(0, DECK_SIZE - usedCards),
      winnerId: null,
      lastAction: "UNO match started",
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.state.phase !== "playing") {
      return { ok: false, error: "UNO match already finished" };
    }
    if (move.playerId !== this.state.turnPlayerId) {
      return { ok: false, error: "Not your turn" };
    }

    if (move.type === "draw") {
      if (this.state.drawPileCount > 0) {
        this.state.drawPileCount -= 1;
        this.state.handSizes[move.playerId] = (this.state.handSizes[move.playerId] ?? 0) + 1;
      }
      this.state.lastAction = `${move.playerId} drew a card`;
      this.advanceTurn();
      return { ok: true };
    }

    if (move.type === "playDemo") {
      const current = this.state.handSizes[move.playerId] ?? 0;
      if (current <= 0) return { ok: false, error: "No cards left" };

      this.state.handSizes[move.playerId] = current - 1;
      this.state.topCard = randomFace();
      this.state.lastAction = `${move.playerId} played ${this.state.topCard}`;

      if (this.state.handSizes[move.playerId] === 0) {
        this.state.phase = "finished";
        this.state.winnerId = move.playerId;
        return { ok: true, isOver: true, winnerId: move.playerId };
      }

      this.advanceTurn();
      return { ok: true };
    }

    return { ok: false, error: `Unknown UNO move: ${move.type}` };
  }

  getStateFor(): unknown {
    return this.state;
  }

  getPublicState(): unknown {
    return this.state;
  }

  isOver(): boolean {
    return this.state.phase === "finished";
  }

  removePlayer(playerId: string): void {
    if (!this.playerIds.includes(playerId)) return;

    this.playerIds = this.playerIds.filter((id) => id !== playerId);
    this.state.playerOrder = this.state.playerOrder.filter((id) => id !== playerId);
    delete this.state.handSizes[playerId];

    if (this.state.phase === "finished") return;

    if (this.state.playerOrder.length <= 1) {
      this.state.phase = "finished";
      this.state.winnerId = this.state.playerOrder[0] ?? null;
      return;
    }

    if (this.state.turnPlayerId === playerId) {
      this.state.turnPlayerId = this.state.playerOrder[0]!;
    }
  }

  pendingActors(): string[] {
    return this.state.phase === "playing" ? [this.state.turnPlayerId] : [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.state.phase !== "playing") return { ok: false, error: "Match over" };
    if (playerId !== this.state.turnPlayerId) return { ok: false, error: "Not your turn" };

    const hand = this.state.handSizes[playerId] ?? 0;
    if (hand > 0 && Math.random() > 0.35) {
      return this.applyMove({ playerId, type: "playDemo" });
    }
    return this.applyMove({ playerId, type: "draw" });
  }

  private advanceTurn(): void {
    const order = this.state.playerOrder;
    if (order.length === 0) return;

    const currentIdx = order.indexOf(this.state.turnPlayerId);
    const safeIdx = currentIdx === -1 ? 0 : currentIdx;
    const nextIdx = (safeIdx + this.state.direction + order.length) % order.length;
    this.state.turnPlayerId = order[nextIdx]!;
  }
}
