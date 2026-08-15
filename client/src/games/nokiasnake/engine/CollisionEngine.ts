import type { Point } from "../types";

export class CollisionEngine {
  public static checkWallCollision(head: Point, cols: number, rows: number): boolean {
    return head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
  }

  public static checkSelfCollision(body: Point[]): boolean {
    if (body.length <= 1) return false;
    const head = body[0];
    for (let i = 1; i < body.length; i++) {
      if (head.x === body[i].x && head.y === body[i].y) {
        return true;
      }
    }
    return false;
  }

  public static checkFoodCollision(head: Point, food: Point | null): boolean {
    if (!food) return false;
    return head.x === food.x && head.y === food.y;
  }
}
