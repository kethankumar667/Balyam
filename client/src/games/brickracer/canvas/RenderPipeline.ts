import { LCD_THEME, GRID_CONFIG } from "../utils/constants";
import type { Point } from "../types";

export class RenderPipeline {
  private ctx: CanvasRenderingContext2D;
  public readonly BG_COLOR = LCD_THEME.BG_COLOR;
  public readonly PIXEL_COLOR = LCD_THEME.PIXEL_COLOR;
  public readonly PIXEL_GHOST = LCD_THEME.PIXEL_GHOST;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to acquire 2D canvas context");
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
  }

  public clear(): void {
    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public drawMatrixGrid(): void {
    // Draw subtle inactive ghost pixels across the entire 10x20 matrix
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        this.drawBlock(c, r, this.PIXEL_GHOST);
      }
    }
  }

  public drawBlock(col: number, row: number, color: string = this.PIXEL_COLOR): void {
    if (col < 0 || col >= GRID_CONFIG.COLS || row < 0 || row >= GRID_CONFIG.ROWS) {
      return;
    }
    const x = GRID_CONFIG.PADDING + col * GRID_CONFIG.CELL_SIZE;
    const y = GRID_CONFIG.PADDING + row * GRID_CONFIG.CELL_SIZE;
    const size = GRID_CONFIG.CELL_SIZE;

    this.ctx.fillStyle = color;
    // Outer beveled rectangle
    this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Inner bevel indent highlight
    if (color === this.PIXEL_COLOR) {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      this.ctx.fillRect(x + 2, y + 2, size - 4, 1);
      this.ctx.fillRect(x + 2, y + 2, 1, size - 4);
    }
  }

  public drawCar(centerCol: number, topRow: number, color: string = this.PIXEL_COLOR): void {
    // Formula 1 7-block shape
    // Row 0: Nose (center)
    this.drawBlock(centerCol, topRow, color);
    // Row 1: Front Axle (left wheel, center, right wheel)
    this.drawBlock(centerCol - 1, topRow + 1, color);
    this.drawBlock(centerCol, topRow + 1, color);
    this.drawBlock(centerCol + 1, topRow + 1, color);
    // Row 2: Cockpit (center)
    this.drawBlock(centerCol, topRow + 2, color);
    // Row 3: Rear Axle (rear left, center, rear right)
    this.drawBlock(centerCol - 1, topRow + 3, color);
    this.drawBlock(centerCol, topRow + 3, color);
    this.drawBlock(centerCol + 1, topRow + 3, color);
  }

  public drawRoadStripes(offset: number): void {
    // Left border (Col 0) and Right border (Col 9)
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      if ((r + offset) % 3 !== 0) {
        this.drawBlock(0, r, this.PIXEL_COLOR);
        this.drawBlock(9, r, this.PIXEL_COLOR);
      }
    }
  }

  public drawCrashExplosion(centerCol: number, topRow: number): void {
    for (let dr = 0; dr < 4; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr + dc) % 2 === 0) {
          this.drawBlock(centerCol + dc, topRow + dr, this.PIXEL_COLOR);
        }
      }
    }
  }

  public fillRect(x: number, y: number, w: number, h: number, color: string = this.PIXEL_COLOR): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string = this.PIXEL_COLOR): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(Math.floor(x1) + 0.5, Math.floor(y1) + 0.5);
    this.ctx.lineTo(Math.floor(x2) + 0.5, Math.floor(y2) + 0.5);
    this.ctx.stroke();
  }

  public drawSprite(
    sprite: number[][],
    x: number,
    y: number,
    color: string = this.PIXEL_COLOR,
    scale: number = 1
  ): void {
    this.ctx.fillStyle = color;
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] === 1) {
          this.ctx.fillRect(
            Math.floor(x + c * scale),
            Math.floor(y + r * scale),
            scale,
            scale
          );
        }
      }
    }
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    color: string = this.PIXEL_COLOR,
    fontSize: number = 9
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(text, Math.floor(x), Math.floor(y));
  }
}
