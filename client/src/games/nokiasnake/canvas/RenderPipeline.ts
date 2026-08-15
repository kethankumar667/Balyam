import { LCD_THEME, GRID_CONFIG } from "../utils/constants";

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

  public fillRect(x: number, y: number, w: number, h: number, color: string = this.PIXEL_COLOR): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  public strokeRect(x: number, y: number, w: number, h: number, color: string = this.PIXEL_COLOR, lineWidth: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w), Math.floor(h));
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string = this.PIXEL_COLOR): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(Math.floor(x1) + 0.5, Math.floor(y1) + 0.5);
    this.ctx.lineTo(Math.floor(x2) + 0.5, Math.floor(y2) + 0.5);
    this.ctx.stroke();
  }

  public drawCell(gridX: number, gridY: number, color: string = this.PIXEL_COLOR): void {
    const px = GRID_CONFIG.OFFSET_X + gridX * GRID_CONFIG.CELL_SIZE;
    const py = GRID_CONFIG.OFFSET_Y + gridY * GRID_CONFIG.CELL_SIZE;
    this.fillRect(px + 1, py + 1, GRID_CONFIG.CELL_SIZE - 2, GRID_CONFIG.CELL_SIZE - 2, color);
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
