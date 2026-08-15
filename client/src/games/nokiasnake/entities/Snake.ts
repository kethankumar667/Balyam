import type { Direction, Point } from "../types";

export const DIRECTION_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export class Snake {
  public body: Point[] = [];
  public currentDirection: Direction = "RIGHT";
  public nextDirection: Direction = "RIGHT";
  public growthPending: number = 0;

  constructor(initialLength: number = 4) {
    this.reset(initialLength);
  }

  public reset(initialLength: number = 4): void {
    this.body = [];
    const startX = 8;
    const startY = 10;
    for (let i = 0; i < initialLength; i++) {
      this.body.push({ x: startX - i, y: startY });
    }
    this.currentDirection = "RIGHT";
    this.nextDirection = "RIGHT";
    this.growthPending = 0;
  }

  public setDirection(newDir: Direction): boolean {
    const cur = DIRECTION_VECTORS[this.currentDirection];
    const nxt = DIRECTION_VECTORS[newDir];

    // Anti-reversal vector check: cannot reverse 180 degrees in a single step
    if (cur.x + nxt.x === 0 && cur.y + nxt.y === 0) {
      return false;
    }
    this.nextDirection = newDir;
    return true;
  }

  public advance(wrapAround: boolean, cols: number, rows: number): Point {
    this.currentDirection = this.nextDirection;
    const vector = DIRECTION_VECTORS[this.currentDirection];
    const head = this.body[0];

    let newX = head.x + vector.x;
    let newY = head.y + vector.y;

    if (wrapAround) {
      newX = (newX + cols) % cols;
      newY = (newY + rows) % rows;
    }

    const newHead: Point = { x: newX, y: newY };
    this.body.unshift(newHead);

    if (this.growthPending > 0) {
      this.growthPending--;
    } else {
      this.body.pop();
    }

    return newHead;
  }

  public grow(amount: number = 1): void {
    this.growthPending += amount;
  }

  public get head(): Point {
    return this.body[0];
  }

  public get length(): number {
    return this.body.length;
  }
}
