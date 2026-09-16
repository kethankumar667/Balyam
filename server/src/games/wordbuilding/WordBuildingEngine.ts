import type {
  CoachHint,
  Player,
  WordBuildingMoveRecord,
  WordBuildingOptions,
  WordBuildingPendingClaim,
  WordBuildingPublicState,
  WordBuildingScoredWord,
} from "@shared/types.js";
import { DEFAULT_WORDBUILDING_OPTIONS } from "@shared/types.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import { isDictionaryWord } from "./dictionary.js";

/**
 * Local helper — reads `this.s.options.dictionaryMode` and dispatches
 * to the loader. Engine code stays terse and the mode threading sits
 * in one place.
 */

/**
 * Word Building — English Workbook Edition (Phase 1+2).
 *
 * Turn-based shared-board vocab game. On each move the active player picks
 * an empty cell and writes a single uppercase letter. The engine then scans
 * the affected row and column and credits any newly-completed dictionary
 * words to the player. Each word can only score once per match.
 */

const RECENT_MOVES_CAP = 32;

interface InternalState {
  phase: "playing" | "finished";
  options: WordBuildingOptions;
  board: string[][];
  playerOrder: string[];
  turnIndex: number;
  scores: Record<string, number>;
  scoredWords: WordBuildingScoredWord[];
  /** Set of every word already scored — prevents double credit. Lowercased. */
  scoredWordSet: Set<string>;
  recentMoves: WordBuildingMoveRecord[];
  turnDeadline: number | null;
  winnerId: string | null;
  filledCells: number;
  totalCells: number;
  /** claimToScoreMode only — non-null while a word claim awaits submission or votes. */
  pendingClaim: WordBuildingPendingClaim | null;
}

export class WordBuildingEngine implements GameEngine {
  readonly kind = "wordbuilding" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 6;

  private s!: InternalState;
  private pendingOptions: WordBuildingOptions = { ...DEFAULT_WORDBUILDING_OPTIONS };

  setOptions(options: WordBuildingOptions): void {
    this.pendingOptions = { ...DEFAULT_WORDBUILDING_OPTIONS, ...options };
  }

  setTurnDeadline(deadline: number): void {
    this.s.turnDeadline = deadline;
  }

  clearTurnDeadline(): void {
    this.s.turnDeadline = null;
  }

  getTurnTimerSeconds(): number {
    return this.s?.options.turnTimerSeconds ?? this.pendingOptions.turnTimerSeconds;
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Word Building requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    const opts = { ...this.pendingOptions };
    const size = opts.boardSize;
    const board: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
    const ids = players.map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const id of ids) scores[id] = 0;

    this.s = {
      phase: "playing",
      options: opts,
      board,
      playerOrder: ids,
      turnIndex: 0,
      scores,
      scoredWords: [],
      scoredWordSet: new Set<string>(),
      recentMoves: [],
      turnDeadline: null,
      winnerId: null,
      filledCells: 0,
      totalCells: size * size,
      pendingClaim: null,
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.s.phase !== "playing") {
      return { ok: false, error: "Game is over" };
    }
    if (!this.s.options.claimToScoreMode) {
      return this.applyPlaceLegacy(move);
    }
    switch (move.type) {
      case "place":
        return this.applyPlaceClaim(move);
      case "claimWord":
        return this.handleClaimWord(move);
      case "skipClaim":
        return this.handleSkipClaim(move);
      case "voteClaim":
        return this.handleVoteClaim(move);
      default:
        return { ok: false, error: `Unknown move type: ${move.type}` };
    }
  }

  /**
   * Today's behavior, untouched: place a letter, silently auto-score any
   * dictionary word it completes, always advance the turn. Kept exactly
   * as-is (only extracted out of `applyMove`) so `claimToScoreMode: false`
   * — the default — carries zero regression risk from this feature.
   */
  private applyPlaceLegacy(move: MoveContext): MoveResult {
    if (move.type !== "place") {
      return { ok: false, error: `Unknown move type: ${move.type}` };
    }
    const currentPid = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== currentPid) {
      return { ok: false, error: "Not your turn" };
    }
    const data = move.data as { r?: number; c?: number; letter?: string } | undefined;
    const r = data?.r;
    const c = data?.c;
    const rawLetter = data?.letter;
    const size = this.s.options.boardSize;
    if (
      typeof r !== "number" || typeof c !== "number" ||
      r < 0 || c < 0 || r >= size || c >= size
    ) {
      return { ok: false, error: "Cell out of range" };
    }
    if (this.s.board[r][c] !== "") {
      return { ok: false, error: "Cell already filled" };
    }
    const letter = (rawLetter ?? "").toUpperCase().slice(0, 1);
    if (!letter || !/^[A-Z]$/.test(letter)) {
      return { ok: false, error: "Letter must be A–Z" };
    }

    // Commit the placement, then scan for newly-formed words.
    this.s.board[r][c] = letter;
    this.s.filledCells += 1;
    const scored = this.detectNewWords(r, c, move.playerId);
    for (const w of scored) this.s.scores[move.playerId] += w.points;

    const record: WordBuildingMoveRecord = {
      playerId: move.playerId,
      r, c, letter,
      scored,
      ts: Date.now(),
    };
    this.s.recentMoves.push(record);
    if (this.s.recentMoves.length > RECENT_MOVES_CAP) {
      this.s.recentMoves.splice(0, this.s.recentMoves.length - RECENT_MOVES_CAP);
    }
    this.s.scoredWords.push(...scored);

    // End-of-game check: every cell filled.
    if (this.s.filledCells >= this.s.totalCells) {
      this.finalizeGame();
      return { ok: true, isOver: true, winnerId: this.s.winnerId };
    }

    this.advanceTurn();
    return { ok: true };
  }

  /**
   * claimToScoreMode: place a letter with NO dictionary auto-scan. If the
   * placement completes a straight run >= minWordLength through the
   * anchor cell, a claim opens and the turn holds until it resolves;
   * otherwise the turn advances immediately, same as a placement that
   * doesn't complete anything today.
   */
  private applyPlaceClaim(move: MoveContext): MoveResult {
    if (this.s.pendingClaim) {
      return { ok: false, error: "Resolve the pending word claim first" };
    }
    const currentPid = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== currentPid) {
      return { ok: false, error: "Not your turn" };
    }
    const data = move.data as { r?: number; c?: number; letter?: string } | undefined;
    const r = data?.r;
    const c = data?.c;
    const rawLetter = data?.letter;
    const size = this.s.options.boardSize;
    if (
      typeof r !== "number" || typeof c !== "number" ||
      r < 0 || c < 0 || r >= size || c >= size
    ) {
      return { ok: false, error: "Cell out of range" };
    }
    if (this.s.board[r][c] !== "") {
      return { ok: false, error: "Cell already filled" };
    }
    const letter = (rawLetter ?? "").toUpperCase().slice(0, 1);
    if (!letter || !/^[A-Z]$/.test(letter)) {
      return { ok: false, error: "Letter must be A–Z" };
    }

    this.s.board[r][c] = letter;
    this.s.filledCells += 1;
    const record: WordBuildingMoveRecord = {
      playerId: move.playerId,
      r, c, letter,
      scored: [],
      ts: Date.now(),
    };
    this.s.recentMoves.push(record);
    if (this.s.recentMoves.length > RECENT_MOVES_CAP) {
      this.s.recentMoves.splice(0, this.s.recentMoves.length - RECENT_MOVES_CAP);
    }

    if (this.hasQualifyingRun(r, c)) {
      this.s.pendingClaim = {
        id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        claimantId: move.playerId,
        anchor: { r, c },
        status: "collecting",
        word: null,
        cells: null,
        orientation: null,
        points: 0,
        voters: [],
        votes: {},
        ts: Date.now(),
      };
      return { ok: true };
    }
    return this.concludeTurn();
  }

  /** claimToScoreMode: the claimant identifies their word as a straight-line cell path through the anchor. */
  private handleClaimWord(move: MoveContext): MoveResult {
    const pc = this.s.pendingClaim;
    if (!pc || pc.status !== "collecting") {
      return { ok: false, error: "No pending claim to submit" };
    }
    if (move.playerId !== pc.claimantId) {
      return { ok: false, error: "Not your claim" };
    }
    const data = move.data as { cells?: Array<{ r?: number; c?: number }> } | undefined;
    const rawCells = data?.cells;
    const minLen = this.s.options.minWordLength;
    if (!Array.isArray(rawCells) || rawCells.length < minLen) {
      return { ok: false, error: `Word must be at least ${minLen} letters` };
    }
    const size = this.s.options.boardSize;
    const cells: Array<{ r: number; c: number }> = [];
    for (const cell of rawCells) {
      const r = cell?.r;
      const c = cell?.c;
      if (
        typeof r !== "number" || typeof c !== "number" ||
        r < 0 || c < 0 || r >= size || c >= size
      ) {
        return { ok: false, error: "Cells must be on the board" };
      }
      if (this.s.board[r][c] === "") {
        return { ok: false, error: "Cells must all be filled" };
      }
      cells.push({ r, c });
    }

    const dr = cells[1].r - cells[0].r;
    const dc = cells[1].c - cells[0].c;
    const orientation = this.axisFromDelta(dr, dc);
    if (!orientation) {
      return { ok: false, error: "Selection must be a single straight line" };
    }
    for (let i = 1; i < cells.length; i++) {
      if (cells[i].r !== cells[0].r + dr * i || cells[i].c !== cells[0].c + dc * i) {
        return { ok: false, error: "Selection must be a single straight line" };
      }
    }
    const includesAnchor = cells.some((cell) => cell.r === pc.anchor.r && cell.c === pc.anchor.c);
    if (!includesAnchor) {
      return { ok: false, error: "Word must include the letter you just placed" };
    }
    const word = cells.map((cell) => this.s.board[cell.r][cell.c]).join("");
    if (this.s.scoredWordSet.has(word.toLowerCase())) {
      return { ok: false, error: "That word was already scored this match" };
    }

    pc.word = word;
    pc.cells = cells;
    pc.orientation = orientation;
    pc.points = cells.length;
    pc.status = "voting";
    pc.voters = this.s.playerOrder.filter((id) => id !== pc.claimantId);
    pc.votes = {};
    return { ok: true };
  }

  /** claimToScoreMode: the claimant declines to claim a word for this placement. */
  private handleSkipClaim(move: MoveContext): MoveResult {
    const pc = this.s.pendingClaim;
    if (!pc || pc.status !== "collecting") {
      return { ok: false, error: "No pending claim to skip" };
    }
    if (move.playerId !== pc.claimantId) {
      return { ok: false, error: "Not your claim" };
    }
    this.s.pendingClaim = null;
    return this.concludeTurn();
  }

  /**
   * claimToScoreMode: an opponent's vote on the current pending claim.
   * A single "accept" resolves the claim ACCEPTED immediately — the direct
   * reading of "anyone of opponents needs to accept... otherwise it's not
   * valid." A "reject" only resolves the claim (REJECTED) once every
   * voter has explicitly rejected; a timeout can only push toward
   * acceptance (see resolvePendingClaimOnTimeout), so it never
   * contributes to this all-reject tally.
   */
  private handleVoteClaim(move: MoveContext): MoveResult {
    const pc = this.s.pendingClaim;
    if (!pc || pc.status !== "voting") {
      return { ok: false, error: "No pending claim to vote on" };
    }
    if (!pc.voters.includes(move.playerId)) {
      return { ok: false, error: "You're not eligible to vote on this claim" };
    }
    if (move.playerId in pc.votes) {
      return { ok: false, error: "You already voted on this claim" };
    }
    const data = move.data as { decision?: string } | undefined;
    const decision = data?.decision;
    if (decision !== "accept" && decision !== "reject") {
      return { ok: false, error: "Vote must be accept or reject" };
    }
    pc.votes[move.playerId] = decision;
    if (decision === "accept") {
      return this.resolveClaim(true);
    }
    if (pc.voters.every((id) => pc.votes[id] === "reject")) {
      return this.resolveClaim(false);
    }
    return { ok: true };
  }

  /** Credits the claim's word (if accepted) and closes it, then ends the turn or the match. */
  private resolveClaim(accepted: boolean): MoveResult {
    const pc = this.s.pendingClaim;
    if (pc && accepted && pc.word && pc.cells && pc.orientation) {
      const wordKey = pc.word.toLowerCase();
      if (!this.s.scoredWordSet.has(wordKey)) {
        this.s.scoredWordSet.add(wordKey);
        const scoredWord: WordBuildingScoredWord = {
          id: pc.id,
          word: pc.word,
          cells: pc.cells,
          scorerId: pc.claimantId,
          points: pc.points,
          ts: Date.now(),
          orientation: pc.orientation,
        };
        this.s.scoredWords.push(scoredWord);
        this.s.scores[pc.claimantId] += pc.points;
      }
    }
    this.s.pendingClaim = null;
    return this.concludeTurn();
  }

  /** Finalizes the match if the board is now full, else advances the turn. Deferring the fill check to here (rather than at placement time) lets a claim on the last cell still get its vote before the match ends. */
  private concludeTurn(): MoveResult {
    if (this.s.filledCells >= this.s.totalCells) {
      this.finalizeGame();
      return { ok: true, isOver: true, winnerId: this.s.winnerId };
    }
    this.advanceTurn();
    return { ok: true };
  }

  /** True if any of the 4 axes through (r,c) has a run of filled cells long enough to possibly contain a claimable word — no dictionary check, just length. */
  private hasQualifyingRun(r: number, c: number): boolean {
    const minLen = this.s.options.minWordLength;
    const axes: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of axes) {
      if (this.expandRun(r, c, dr, dc).length >= minLen) return true;
    }
    return false;
  }

  /**
   * Maps a cell-to-cell delta to one of the 4 word axes, treating a
   * direction and its exact opposite as the same axis (e.g. left-to-right
   * and right-to-left are both "row"). Returns null for anything that
   * isn't a single unit step along one of the 4 axes (a bend, a diagonal
   * knight-move, a zero-length step, etc.).
   */
  private axisFromDelta(dr: number, dc: number): WordBuildingScoredWord["orientation"] | null {
    if (dr === 0 && Math.abs(dc) === 1) return "row";
    if (Math.abs(dr) === 1 && dc === 0) return "col";
    if (dr === dc && Math.abs(dr) === 1) return "diag-down";
    if (dr === -dc && Math.abs(dr) === 1) return "diag-up";
    return null;
  }

  /**
   * Bot-only: the strongest dictionary-verified word available through
   * (r,c), reusing the exact same expand+best-substring machinery
   * `detectNewWords`/`dryRunPlacementScore` already use. A bot never
   * claims a word it can't itself verify.
   */
  private bestDictionaryClaimForAnchor(
    r: number,
    c: number,
  ): { cells: Array<{ r: number; c: number }> } | null {
    const axes: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let best: { letters: string; cells: Array<{ r: number; c: number }> } | null = null;
    for (const [dr, dc] of axes) {
      const run = this.expandRun(r, c, dr, dc);
      if (run.length < this.s.options.minWordLength) continue;
      const match = this.bestDictionaryWordCovering(run, r, c);
      if (!match) continue;
      if (best == null || match.letters.length > best.letters.length) best = match;
    }
    return best ? { cells: best.cells } : null;
  }

  /**
   * Scan every axis that runs through the just-placed letter for a
   * newly-formed dictionary word. We check 4 axes:
   *
   *   row        — horizontal  (dr=0,  dc=1)
   *   col        — vertical    (dr=1,  dc=0)
   *   diag-down  — top-left ↘  (dr=1,  dc=1)
   *   diag-up    — bottom-left ↗ (dr=1, dc=-1)
   *
   * For each axis we collect the unbroken run of letters that contains
   * the placed cell, then look up the LONGEST substring that:
   *   • is ≥ minWordLength,
   *   • contains the placed cell,
   *   • matches the dictionary in EITHER reading direction (so the same
   *     5 letters score whether the word is "STREAM" left-to-right or
   *     "MAERTS" → reversed → "STREAM" right-to-left).
   * Each direction-pair counts once per match (we dedupe by lowercased
   * letters in `scoredWordSet`), so a palindrome like "RACECAR" still
   * scores cleanly without double-credit.
   *
   * Longest-substring matters: a placement that completes both 3- and
   * 5-letter words in the same run credits only the 5-letter one,
   * since the 3-letter sits inside it and would double-count.
   */
  private detectNewWords(r: number, c: number, scorerId: string): WordBuildingScoredWord[] {
    const minLen = this.s.options.minWordLength;

    const axes: Array<{
      dr: number;
      dc: number;
      orientation: WordBuildingScoredWord["orientation"];
      tag: string;
    }> = [
      { dr: 0, dc: 1,  orientation: "row",       tag: "r" },
      { dr: 1, dc: 0,  orientation: "col",       tag: "c" },
      { dr: 1, dc: 1,  orientation: "diag-down", tag: "dd" },
      { dr: 1, dc: -1, orientation: "diag-up",   tag: "du" },
    ];

    // ONE word per move — find the best candidate across all 4 axes and
    // credit only that. Length is the tiebreaker (longer beats shorter);
    // axis priority (row > col > diag-down > diag-up) breaks ties on
    // length deterministically. Previously we credited every axis hit
    // which let a single placement book 3-4 words at once.
    let best:
      | {
          letters: string;
          cells: Array<{ r: number; c: number }>;
          orientation: WordBuildingScoredWord["orientation"];
          axisTag: string;
        }
      | null = null;
    for (const axis of axes) {
      const run = this.expandRun(r, c, axis.dr, axis.dc);
      if (run.length < minLen) continue;
      const match = this.bestDictionaryWordCovering(run, r, c);
      if (!match) continue;
      if (best == null || match.letters.length > best.letters.length) {
        best = { ...match, orientation: axis.orientation, axisTag: axis.tag };
      }
    }
    if (!best) return [];
    const wordKey = best.letters.toLowerCase();
    if (this.s.scoredWordSet.has(wordKey)) return [];
    this.s.scoredWordSet.add(wordKey);
    return [{
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${best.axisTag}`,
      word: best.letters,
      cells: best.cells,
      scorerId,
      points: best.letters.length,
      ts: Date.now(),
      orientation: best.orientation,
    }];
  }

  /**
   * Expand from (r,c) in both directions along (dr,dc) and (-dr,-dc)
   * until the run hits a board edge or an empty cell. Returns the
   * inclusive list of cells covering the unbroken sequence of letters.
   */
  private expandRun(
    r: number,
    c: number,
    dr: number,
    dc: number,
  ): Array<{ r: number; c: number; letter: string }> {
    const size = this.s.options.boardSize;
    const out: Array<{ r: number; c: number; letter: string }> = [];
    // Walk backward to the start of the run.
    let sr = r, sc = c;
    while (true) {
      const nr = sr - dr, nc = sc - dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) break;
      if (this.s.board[nr][nc] === "") break;
      sr = nr; sc = nc;
    }
    // Walk forward, collecting until the run ends.
    let cr = sr, cc = sc;
    while (cr >= 0 && cc >= 0 && cr < size && cc < size && this.s.board[cr][cc] !== "") {
      out.push({ r: cr, c: cc, letter: this.s.board[cr][cc] });
      cr += dr; cc += dc;
    }
    return out;
  }

  /**
   * Within a run of letters, find the LONGEST substring that:
   *   (a) is at least minWordLength,
   *   (b) contains the placed cell at (placedR, placedC),
   *   (c) is a real dictionary word in EITHER reading direction
   *       (forward letters OR reversed),
   *   (d) hasn't already been scored.
   *
   * Returns the substring as it should be CREDITED — i.e. the letters
   * in dictionary-reading order and the cells in the same order.
   * Symmetric across all 4 axes (row, col, diag-down, diag-up) so the
   * caller doesn't need to know which one it's checking.
   */
  private bestDictionaryWordCovering(
    run: Array<{ r: number; c: number; letter: string }>,
    placedR: number,
    placedC: number,
  ): { letters: string; cells: Array<{ r: number; c: number }> } | null {
    const minLen = this.s.options.minWordLength;
    // Try longest first so a 5-letter word beats a 3-letter substring.
    for (let len = run.length; len >= minLen; len--) {
      for (let start = 0; start + len <= run.length; start++) {
        const end = start + len;
        const sliceCells = run.slice(start, end);
        const includesPlaced = sliceCells.some(
          (cell) => cell.r === placedR && cell.c === placedC,
        );
        if (!includesPlaced) continue;
        const forward = sliceCells.map((cell) => cell.letter).join("");
        const reverse = sliceCells.map((cell) => cell.letter).reverse().join("");

        // Try forward first — preserves the natural reading order when
        // both directions happen to be valid English (rare but possible).
        if (
          !this.s.scoredWordSet.has(forward.toLowerCase()) &&
          isDictionaryWord(forward, this.s.options.dictionaryMode)
        ) {
          return {
            letters: forward,
            cells: sliceCells.map((cell) => ({ r: cell.r, c: cell.c })),
          };
        }
        // Then reverse — credits "STRESSED" if the player wrote
        // "DESSERTS" running right-to-left etc.
        if (
          forward !== reverse && // skip palindromes (already matched as forward if valid)
          !this.s.scoredWordSet.has(reverse.toLowerCase()) &&
          isDictionaryWord(reverse, this.s.options.dictionaryMode)
        ) {
          const reversedCells = sliceCells.slice().reverse();
          return {
            letters: reverse,
            cells: reversedCells.map((cell) => ({ r: cell.r, c: cell.c })),
          };
        }
      }
    }
    return null;
  }

  private advanceTurn(): void {
    const total = this.s.playerOrder.length;
    this.s.turnIndex = (this.s.turnIndex + 1) % total;
  }

  private finalizeGame(): void {
    this.s.phase = "finished";
    // Winner = highest score. Ties pick the player whose final scoring
    // move landed first — deterministic, no fuss.
    let bestId: string | null = null;
    let bestScore = -1;
    for (const pid of this.s.playerOrder) {
      const sc = this.s.scores[pid] ?? 0;
      if (sc > bestScore) {
        bestScore = sc;
        bestId = pid;
      }
    }
    this.s.winnerId = bestId;
    this.s.turnDeadline = null;
  }

  getPublicState(): WordBuildingPublicState {
    return {
      kind: "wordbuilding",
      phase: this.s.phase,
      options: this.s.options,
      board: this.s.board.map((row) => row.slice()),
      playerOrder: this.s.playerOrder,
      turnPlayerId: this.s.playerOrder[this.s.turnIndex],
      scores: { ...this.s.scores },
      scoredWords: this.s.scoredWords.slice(),
      recentMoves: this.s.recentMoves.slice(),
      turnDeadline: this.s.turnDeadline,
      winnerId: this.s.winnerId,
      filledCells: this.s.filledCells,
      totalCells: this.s.totalCells,
      pendingClaim: this.s.pendingClaim
        ? {
            ...this.s.pendingClaim,
            anchor: { ...this.s.pendingClaim.anchor },
            cells: this.s.pendingClaim.cells ? this.s.pendingClaim.cells.map((cell) => ({ ...cell })) : null,
            voters: [...this.s.pendingClaim.voters],
            votes: { ...this.s.pendingClaim.votes },
          }
        : null,
    };
  }

  getStateFor(_playerId: string): WordBuildingPublicState {
    // Word Building has no private state — everyone sees the same board.
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.s.phase === "finished";
  }

  pendingActors(): string[] {
    if (this.s.phase !== "playing") return [];
    if (!this.s.options.claimToScoreMode) return [this.s.playerOrder[this.s.turnIndex]];
    const pc = this.s.pendingClaim;
    if (pc?.status === "collecting") return [pc.claimantId];
    if (pc?.status === "voting") return pc.voters.filter((id) => !(id in pc.votes));
    return [this.s.playerOrder[this.s.turnIndex]];
  }

  /**
   * Where the shared per-turn timer should point right now. Legacy mode:
   * unchanged, the current turn player. claimToScoreMode: the claimant
   * while a claim awaits submission (a timeout forces a skip); null while
   * votes are outstanding, since there's no single actor to force — see
   * `resolvePendingClaimOnTimeout` for that systemic resolution instead.
   */
  getTimeoutActor(): string | null {
    if (this.s.phase !== "playing") return null;
    if (!this.s.options.claimToScoreMode) return this.s.playerOrder[this.s.turnIndex];
    const pc = this.s.pendingClaim;
    if (pc?.status === "collecting") return pc.claimantId;
    if (pc?.status === "voting") return null;
    return this.s.playerOrder[this.s.turnIndex];
  }

  /** Silence = accept (decision #3): called when the turn timer expires while a claim is awaiting votes. No-op otherwise. */
  resolvePendingClaimOnTimeout(): void {
    const pc = this.s.pendingClaim;
    if (!pc || pc.status !== "voting") return;
    this.resolveClaim(true);
  }

  /**
   * Auto-move for bots and for turn-timer expiry.
   *
   * Greedy "try to score" strategy:
   *   1. Find every empty cell adjacent to (or near) an existing letter
   *      — those are where new words can plausibly form. A move that
   *      isolates a letter in empty space can never score anything in
   *      the same turn.
   *   2. For each such cell, try all 26 letters. Score = points of any
   *      newly-formed dictionary word along its row OR column (whichever
   *      is bigger). Use the same expand+best-substring logic the player
   *      pipeline uses, but in a dry-run that doesn't mutate state.
   *   3. Pick the highest-scoring candidate. Break ties by preferring
   *      lower-vowel letters slightly (avoids the trivial Q/X/Z dump),
   *      with random tiebreak after that.
   *   4. If nothing scores, fall back to a slightly-better-than-random
   *      heuristic: drop a common-letter (E/A/R/I/O/T/N/S/L) near an
   *      existing letter so the OPPONENT might extend it next turn —
   *      better than scattering Z into a corner.
   *
   * O(emptyCells × 26 × runScan). For 10×10 ≈ 100 × 26 × ~3 dict
   * lookups = ~7800 lookups per turn. Set lookup is O(1) so this
   * resolves in single-digit ms even with a fully populated board.
   */
  applyAutoMove(playerId: string): MoveResult {
    if (this.s.phase !== "playing") return { ok: false, error: "Game over" };

    // This method serves double duty (a bot's real move, and a forced move
    // when a human's timer expires) exactly like the placement logic below
    // already does — so both a bot claimant/voter and a human whose claim
    // window ran out resolve through the same dictionary-gated logic. The
    // dictionary is the bot's judge (design decision #1); reusing it here
    // for a timed-out human is the same "silence leans generous" spirit as
    // decision #3, not a special case.
    if (this.s.options.claimToScoreMode) {
      const pc = this.s.pendingClaim;
      if (pc?.status === "collecting" && pc.claimantId === playerId) {
        const claim = this.bestDictionaryClaimForAnchor(pc.anchor.r, pc.anchor.c);
        if (claim) {
          return this.applyMove({ playerId, type: "claimWord", data: { cells: claim.cells } });
        }
        return this.applyMove({ playerId, type: "skipClaim" });
      }
      if (pc?.status === "voting" && pc.voters.includes(playerId) && !(playerId in pc.votes)) {
        const decision: "accept" | "reject" =
          pc.word && isDictionaryWord(pc.word, this.s.options.dictionaryMode) ? "accept" : "reject";
        return this.applyMove({ playerId, type: "voteClaim", data: { decision } });
      }
    }

    const size = this.s.options.boardSize;
    const empties: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.s.board[r][c] === "") empties.push({ r, c });
      }
    }
    if (empties.length === 0) {
      this.finalizeGame();
      return { ok: true, isOver: true };
    }
    const pick = this.pickBotMove(empties);
    return this.applyMove({
      playerId,
      type: "place",
      data: { ...pick.cell, letter: pick.letter },
    });
  }

  /**
   * Heart of the bot. Returns the best (cell, letter) candidate plus
   * the score it would book.
   */
  /**
   * AI Coach. Reuses the bot's placement search rather than a second scorer:
   * one source of "what is a good move here" means the hint and the bot can
   * never disagree about the same board.
   *
   * The bot's search is deterministic wherever it matters — it only rolls
   * dice on the seed/fallback branches, where every option is equivalent by
   * construction, so a hint is stable for a given board within a turn.
   */
  getHint(playerId: string): CoachHint | null {
    if (this.s.phase !== "playing") return null;
    const size = this.s.options.boardSize;
    const empties: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.s.board[r][c] === "") empties.push({ r, c });
      }
    }
    if (empties.length === 0) return null;

    const isMyTurn = this.s.playerOrder[this.s.turnIndex] === playerId;
    const pick = this.pickBotMove(empties);
    const cellId = `${pick.cell.r},${pick.cell.c}`;

    if (!isMyTurn) {
      return {
        kind: "wait",
        headline: `Watch ${cellId.replace(",", "/")} — ${pick.letter} scores there`,
        detail:
          pick.score > 0
            ? `If nobody takes it, placing ${pick.letter} there is worth ${pick.score} points on your turn.`
            : "No scoring square is open yet. Look for rows or columns with two letters already down.",
        highlight: [cellId],
      };
    }

    return {
      kind: "place",
      headline:
        pick.score > 0
          ? `Place ${pick.letter} for ${pick.score} points`
          : `Place ${pick.letter} to open a word`,
      detail:
        pick.score > 0
          ? `${pick.letter} completes a dictionary word along that row or column. Longer words score more, so extend rather than start fresh when you can.`
          : `Nothing scores this turn. ${pick.letter} sits next to existing letters, which gives you something to extend next turn instead of stranding a letter in open space.`,
      highlight: [cellId],
    };
  }

  private pickBotMove(
    empties: Array<{ r: number; c: number }>,
  ): { cell: { r: number; c: number }; letter: string; score: number } {
    const size = this.s.options.boardSize;
    const adjacent = empties.filter((cell) => this.hasNeighborLetter(cell.r, cell.c));
    // Empty board (or no adjacency yet) → seed with a common letter
    // somewhere near the centre. Avoids the bot opening with X in a
    // corner.
    if (adjacent.length === 0) {
      const seedLetters = "EARIOTNSL".split("");
      const mid = Math.floor(size / 2);
      const candidates = empties
        .map((c) => ({
          cell: c,
          dist: Math.abs(c.r - mid) + Math.abs(c.c - mid),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        cell: choice.cell,
        letter: seedLetters[Math.floor(Math.random() * seedLetters.length)],
        score: 0,
      };
    }

    // Score every candidate (cell, letter) by the points it would book.
    let best: { cell: { r: number; c: number }; letter: string; score: number } | null = null;
    for (const cell of adjacent) {
      for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code);
        const score = this.dryRunPlacementScore(cell.r, cell.c, letter);
        if (!best || score > best.score) {
          best = { cell, letter, score };
        }
      }
    }
    if (best && best.score > 0) return best;

    // Nothing scores — fall back to a common-letter placement adjacent
    // to an existing letter (sets up the opponent — or our own next
    // turn — to extend into a word).
    const common = "EARIOTNSL".split("");
    const fallbackCell = adjacent[Math.floor(Math.random() * adjacent.length)];
    return {
      cell: fallbackCell,
      letter: common[Math.floor(Math.random() * common.length)],
      score: 0,
    };
  }

  /**
   * True if any of the 4 orthogonal neighbours of (r,c) currently holds
   * a letter. Diagonal neighbours don't count — words only run along
   * rows and columns.
   */
  private hasNeighborLetter(r: number, c: number): boolean {
    const size = this.s.options.boardSize;
    const around = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of around) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      if (this.s.board[nr][nc] !== "") return true;
    }
    return false;
  }

  /**
   * Compute the score a hypothetical (r,c,letter) placement would book,
   * WITHOUT mutating engine state. Mirrors detectNewWords's 4-axis +
   * bidirectional scan on a virtual board where (r,c) holds `letter`.
   */
  private dryRunPlacementScore(r: number, c: number, letter: string): number {
    const size = this.s.options.boardSize;
    const minLen = this.s.options.minWordLength;
    // Walk along (dr,dc) and -(dr,dc) on a virtual board where
    // (r,c) = letter. Returns the unbroken run of letters covering it.
    const expand = (dr: number, dc: number): Array<{ r: number; c: number; letter: string }> => {
      const out: Array<{ r: number; c: number; letter: string }> = [];
      let sr = r, sc = c;
      while (true) {
        const nr = sr - dr, nc = sc - dc;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) break;
        if (this.s.board[nr][nc] === "") break;
        sr = nr; sc = nc;
      }
      let cr = sr, cc = sc;
      while (cr >= 0 && cc >= 0 && cr < size && cc < size) {
        const ch = cr === r && cc === c ? letter : this.s.board[cr][cc];
        if (ch === "") break;
        out.push({ r: cr, c: cc, letter: ch });
        cr += dr; cc += dc;
      }
      return out;
    };

    // For each axis: try longest substring containing (r,c) in either
    // reading direction. Return its length (=points) or 0.
    const findBest = (run: Array<{ r: number; c: number; letter: string }>): number => {
      if (run.length < minLen) return 0;
      for (let len = run.length; len >= minLen; len--) {
        for (let start = 0; start + len <= run.length; start++) {
          const slice = run.slice(start, start + len);
          const includes = slice.some((cell) => cell.r === r && cell.c === c);
          if (!includes) continue;
          const forward = slice.map((cell) => cell.letter).join("");
          const reverse = slice.map((cell) => cell.letter).reverse().join("");
          if (
            !this.s.scoredWordSet.has(forward.toLowerCase()) &&
            isDictionaryWord(forward, this.s.options.dictionaryMode)
          ) {
            return forward.length;
          }
          if (
            forward !== reverse &&
            !this.s.scoredWordSet.has(reverse.toLowerCase()) &&
            isDictionaryWord(reverse, this.s.options.dictionaryMode)
          ) {
            return reverse.length;
          }
        }
      }
      return 0;
    };

    // Only the best (longest) word across all 4 axes counts — matches
    // the one-word-per-move rule the engine actually books.
    const axes: Array<[number, number]> = [
      [0, 1], [1, 0], [1, 1], [1, -1],
    ];
    let best = 0;
    for (const [dr, dc] of axes) best = Math.max(best, findBest(expand(dr, dc)));
    return best;
  }

  removePlayer(playerId: string): void {
    if (!this.s.playerOrder.includes(playerId)) return;
    // Mid-game removal: drop from the rotation. If we're down to one
    // player, they win by default.
    const wasCurrent = this.s.playerOrder[this.s.turnIndex] === playerId;
    this.s.playerOrder = this.s.playerOrder.filter((id) => id !== playerId);
    if (this.s.playerOrder.length < 2 && this.s.phase === "playing") {
      this.s.winnerId = this.s.playerOrder[0] ?? null;
      this.s.phase = "finished";
      this.s.turnDeadline = null;
      this.s.pendingClaim = null;
      return;
    }
    // Re-anchor the turn index if the removed player was at or before it.
    if (wasCurrent) {
      if (this.s.turnIndex >= this.s.playerOrder.length) this.s.turnIndex = 0;
    } else if (this.s.turnIndex >= this.s.playerOrder.length) {
      this.s.turnIndex = 0;
    }

    // Claim cleanup runs AFTER the reindex above, so playerOrder/turnIndex
    // are already correct for anything this triggers (resolveClaim's
    // concludeTurn -> advanceTurn reads both).
    if (this.s.options.claimToScoreMode && this.s.pendingClaim) {
      const pc = this.s.pendingClaim;
      if (pc.claimantId === playerId) {
        // No one left to own this claim — drop it, no score. The turn has
        // already moved on via the reindex above (the claimant was
        // `wasCurrent`, so whoever now sits at `turnIndex` is next).
        this.s.pendingClaim = null;
      } else if (pc.status === "voting" && pc.voters.includes(playerId)) {
        pc.voters = pc.voters.filter((id) => id !== playerId);
        if (pc.voters.length === 0) {
          // No one left to vote — treat like a timeout (silence = accept).
          this.resolveClaim(true);
        } else if (pc.voters.every((id) => pc.votes[id] === "reject")) {
          this.resolveClaim(false);
        }
      }
    }
  }
}
