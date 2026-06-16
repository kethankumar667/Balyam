import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type { Player, RpsChoice, RpsRoundResult, RpsState } from "@shared/types.js";

const VALID_CHOICES: RpsChoice[] = ["rock", "paper", "scissors"];
const TARGET = 10;

function decideRound(choices: Record<string, RpsChoice>): string | null {
  const entries = Object.entries(choices);
  if (entries.length !== 2) return null;
  const [a, b] = entries;
  if (a[1] === b[1]) return null;
  const beats: Record<RpsChoice, RpsChoice> = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };
  return beats[a[1]] === b[1] ? a[0] : b[0];
}

export class RpsEngine implements GameEngine {
  readonly kind = "rps" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private state!: RpsState;
  private currentChoices: Record<string, RpsChoice> = {};
  private playerIds: string[] = [];

  init(players: Player[]): void {
    if (players.length !== 2) {
      throw new Error("RPS requires exactly 2 players");
    }
    this.playerIds = players.map((p) => p.id);
    this.state = this.freshState(1);
    this.currentChoices = {};
  }

  private freshState(matchNumber: number): RpsState {
    const scores: Record<string, number> = {};
    const pending: Record<string, boolean> = {};
    const streak: Record<string, number> = {};
    const bestStreak: Record<string, number> = {};
    for (const id of this.playerIds) {
      scores[id] = 0;
      pending[id] = true;
      streak[id] = 0;
      bestStreak[id] = 0;
    }
    return {
      kind: "rps",
      round: 1,
      target: TARGET,
      scores,
      pendingChoices: pending,
      history: [],
      winnerId: null,
      isOver: false,
      matchNumber,
      streak,
      bestStreak,
      lastRevealTs: null,
      ties: 0,
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (move.type === "rematch") {
      return this.handleRematch(move);
    }
    if (this.state.isOver) {
      return { ok: false, error: "Match over — request a rematch to keep playing" };
    }
    if (move.type !== "choose") {
      return { ok: false, error: `Unknown move type: ${move.type}` };
    }
    if (!this.playerIds.includes(move.playerId)) {
      return { ok: false, error: "Not a player in this game" };
    }
    const choice = (move.data as { choice?: RpsChoice } | undefined)?.choice;
    if (!choice || !VALID_CHOICES.includes(choice)) {
      return { ok: false, error: "Invalid choice" };
    }
    if (this.currentChoices[move.playerId]) {
      return { ok: false, error: "You already chose this round" };
    }
    this.currentChoices[move.playerId] = choice;
    this.state.pendingChoices[move.playerId] = false;

    if (Object.keys(this.currentChoices).length === this.playerIds.length) {
      this.resolveRound();
    }
    return { ok: true, isOver: this.state.isOver, winnerId: this.state.winnerId };
  }

  private handleRematch(move: MoveContext): MoveResult {
    if (!this.state.isOver) {
      return { ok: false, error: "Match is still in progress" };
    }
    if (!this.playerIds.includes(move.playerId)) {
      return { ok: false, error: "Not a player in this game" };
    }
    this.state = this.freshState(this.state.matchNumber + 1);
    this.currentChoices = {};
    return { ok: true };
  }

  private resolveRound(): void {
    const winnerId = decideRound(this.currentChoices);
    const result: RpsRoundResult = {
      round: this.state.round,
      choices: { ...this.currentChoices },
      winnerId,
    };
    this.state.history.push(result);
    this.state.lastRevealTs = Date.now();

    if (winnerId) {
      this.state.scores[winnerId] = (this.state.scores[winnerId] ?? 0) + 1;
      // Update streaks
      for (const id of this.playerIds) {
        if (id === winnerId) {
          const next = (this.state.streak[id] ?? 0) + 1;
          this.state.streak[id] = next;
          if (next > (this.state.bestStreak[id] ?? 0)) {
            this.state.bestStreak[id] = next;
          }
        } else {
          this.state.streak[id] = 0;
        }
      }
    } else {
      // Tie — both streaks broken
      this.state.ties += 1;
      for (const id of this.playerIds) this.state.streak[id] = 0;
    }

    // Check match winner
    for (const id of this.playerIds) {
      if ((this.state.scores[id] ?? 0) >= this.state.target) {
        this.state.winnerId = id;
        this.state.isOver = true;
        return;
      }
    }

    this.state.round += 1;
    this.currentChoices = {};
    for (const id of this.playerIds) {
      this.state.pendingChoices[id] = true;
    }
  }

  getStateFor(playerId: string): unknown {
    // Hide opponent's choice until both have chosen.
    const masked = { ...this.currentChoices };
    if (Object.keys(this.currentChoices).length < this.playerIds.length) {
      for (const id of Object.keys(masked)) {
        if (id !== playerId) delete masked[id];
      }
    }
    return { ...this.state, currentChoices: masked };
  }

  getPublicState(): unknown {
    return this.state;
  }

  isOver(): boolean {
    return this.state.isOver;
  }

  removePlayer(playerId: string): void {
    if (!this.playerIds.includes(playerId)) return;
    const opponent = this.playerIds.find((id) => id !== playerId);
    this.state.isOver = true;
    this.state.winnerId = opponent ?? null;
  }

  /* ── Bot support ── */

  pendingActors(): string[] {
    if (this.state.isOver) return [];
    return this.playerIds.filter((id) => this.state.pendingChoices[id]);
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.state.isOver) return { ok: false, error: "Match over" };
    if (!this.playerIds.includes(playerId)) return { ok: false, error: "Not a player" };
    if (!this.state.pendingChoices[playerId]) {
      return { ok: false, error: "Already chose this round" };
    }
    const pick = VALID_CHOICES[Math.floor(Math.random() * VALID_CHOICES.length)];
    return this.applyMove({ playerId, type: "choose", data: { choice: pick } });
  }
}
