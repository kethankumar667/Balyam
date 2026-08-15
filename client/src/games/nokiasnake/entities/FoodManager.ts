import type { Point } from "../types";

export class FoodManager {
  public normalFood: Point | null = null;
  public bonusFood: Point | null = null;
  public bonusTimer: number = 0;
  public readonly maxBonusTimer: number = 35; // 35 game ticks

  public spawnNormalFood(snakeBody: Point[], cols: number, rows: number): Point | null {
    const occupied = new Set(snakeBody.map((p) => `${p.x},${p.y}`));
    if (this.bonusFood) {
      occupied.add(`${this.bonusFood.x},${this.bonusFood.y}`);
    }

    const emptyCells: Point[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) {
      this.normalFood = null;
      return null;
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    this.normalFood = emptyCells[randomIndex];
    return this.normalFood;
  }

  public spawnBonusFood(snakeBody: Point[], cols: number, rows: number): Point | null {
    const occupied = new Set(snakeBody.map((p) => `${p.x},${p.y}`));
    if (this.normalFood) {
      occupied.add(`${this.normalFood.x},${this.normalFood.y}`);
    }

    const emptyCells: Point[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    this.bonusFood = emptyCells[randomIndex];
    this.bonusTimer = this.maxBonusTimer;
    return this.bonusFood;
  }

  public tickBonus(): void {
    if (this.bonusFood) {
      this.bonusTimer--;
      if (this.bonusTimer <= 0) {
        this.bonusFood = null;
      }
    }
  }

  public clear(): void {
    this.normalFood = null;
    this.bonusFood = null;
    this.bonusTimer = 0;
  }
}
