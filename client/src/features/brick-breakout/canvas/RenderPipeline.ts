import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";
import type { Brick, Paddle, Ball } from "../types";
import { getPaddleOccupiedX } from "../engine/movementEngine";

export interface BreakoutRenderParams {
  paddle: Paddle;
  ball: Ball;
  bricks: readonly Brick[] | Brick[];
}

/**
 * 60fps Hardware-Accelerated 2D Canvas Render Pipeline for Brick Breakout.
 * Eliminates 200 DOM element reflows and provides authentic beveled LCD aesthetics.
 */
export class RenderPipeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  public static readonly COLOR_BG = "#9bbc0f";
  public static readonly COLOR_EMPTY_BG = "rgba(139, 172, 15, 0.22)";
  public static readonly COLOR_EMPTY_DOT = "rgba(48, 98, 48, 0.12)";
  public static readonly COLOR_PIXEL_DARK = "#0f380f";
  public static readonly COLOR_PIXEL_CORE = "#306230";
  public static readonly COLOR_BEVEL_LIGHT = "rgba(155, 188, 15, 0.6)";
  public static readonly COLOR_BEVEL_DARK = "rgba(5, 22, 5, 0.75)";
  public static readonly COLOR_METALLIC = "#204620";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Unable to obtain 2D context for Brick Breakout canvas");
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.syncDimensions();
  }

  public syncDimensions(): void {
    if (typeof window !== "undefined") {
      this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    }
    const rect = this.canvas.getBoundingClientRect();
    const targetWidth = rect.width > 0 ? rect.width : 200;
    const targetHeight = rect.height > 0 ? rect.height : 400;

    const scaledW = Math.round(targetWidth * this.dpr);
    const scaledH = Math.round(targetHeight * this.dpr);

    if (this.canvas.width !== scaledW || this.canvas.height !== scaledH) {
      this.canvas.width = scaledW;
      this.canvas.height = scaledH;
    }

    this.ctx.resetTransform?.();
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(params: BreakoutRenderParams): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : this.canvas.width / this.dpr;
    const height = rect.height > 0 ? rect.height : this.canvas.height / this.dpr;

    // Reset & clear background
    this.ctx.fillStyle = RenderPipeline.COLOR_BG;
    this.ctx.fillRect(0, 0, width, height);

    const padding = 3;
    const gap = 2;
    const cols = BREAKOUT_CONSTANTS.GRID_WIDTH;
    const rows = BREAKOUT_CONSTANTS.GRID_HEIGHT;

    const cellWidth = (width - padding * 2 - (cols - 1) * gap) / cols;
    const cellHeight = (height - padding * 2 - (rows - 1) * gap) / rows;

    // 1. Draw base empty cells (LCD dot matrix)
    for (let r = 0; r < rows; r++) {
      const y = padding + r * (cellHeight + gap);
      for (let c = 0; c < cols; c++) {
        const x = padding + c * (cellWidth + gap);
        this.drawEmptyCell(x, y, cellWidth, cellHeight);
      }
    }

    // 2. Draw Bricks
    for (const b of params.bricks) {
      if (b.hitPoints > 0 && b.position.y >= 0 && b.position.y < rows && b.position.x >= 0 && b.position.x < cols) {
        const x = padding + b.position.x * (cellWidth + gap);
        const y = padding + b.position.y * (cellHeight + gap);

        if (b.type === "INDESTRUCTIBLE") {
          this.drawIndestructibleBrick(x, y, cellWidth, cellHeight);
        } else if (b.type === "STRONG") {
          if (b.hitPoints === 1) {
            this.drawDamagedBrick(x, y, cellWidth, cellHeight);
          } else {
            this.drawStrongBrick(x, y, cellWidth, cellHeight);
          }
        } else {
          this.drawNormalBrick(x, y, cellWidth, cellHeight);
        }
      }
    }

    // 3. Draw Paddle
    const paddleXs = getPaddleOccupiedX(params.paddle);
    for (const px of paddleXs) {
      if (px >= 0 && px < cols) {
        const x = padding + px * (cellWidth + gap);
        const y = padding + params.paddle.row * (cellHeight + gap);
        this.drawPaddleCell(x, y, cellWidth, cellHeight);
      }
    }

    // 4. Draw Ball
    const bx = params.ball.position.x;
    const by = params.ball.position.y;
    if (bx >= 0 && bx < cols && by >= 0 && by < rows) {
      const x = padding + bx * (cellWidth + gap);
      const y = padding + by * (cellHeight + gap);
      this.drawBallCell(x, y, cellWidth, cellHeight);
    }

    // 5. Draw Scanlines
    this.drawScanlines(width, height);
  }

  private drawNormalBrick(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Bevel highlights
    this.ctx.fillStyle = RenderPipeline.COLOR_BEVEL_LIGHT;
    this.ctx.fillRect(rx, ry, rw, 1.5);
    this.ctx.fillRect(rx, ry, 1.5, rh);

    this.ctx.fillStyle = RenderPipeline.COLOR_BEVEL_DARK;
    this.ctx.fillRect(rx, ry + rh - 1.5, rw, 1.5);
    this.ctx.fillRect(rx + rw - 1.5, ry, 1.5, rh);

    // Center indent
    const inset = Math.max(2, Math.round(rw * 0.25));
    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_CORE;
    this.ctx.fillRect(rx + inset, ry + inset, rw - inset * 2, rh - inset * 2);
  }

  private drawStrongBrick(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Double frame
    this.ctx.strokeStyle = RenderPipeline.COLOR_BEVEL_LIGHT;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);

    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_CORE;
    const pad = Math.max(3, Math.round(rw * 0.3));
    this.ctx.fillRect(rx + pad, ry + pad, rw - pad * 2, rh - pad * 2);
  }

  private drawDamagedBrick(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Cracked pattern (cross diagonal cut)
    this.ctx.strokeStyle = RenderPipeline.COLOR_BG;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(rx + 2, ry + 2);
    this.ctx.lineTo(rx + rw - 2, ry + rh - 2);
    this.ctx.stroke();
  }

  private drawIndestructibleBrick(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_METALLIC;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Cross-hatch diagonal lines
    this.ctx.strokeStyle = RenderPipeline.COLOR_BEVEL_LIGHT;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(rx, ry + rh / 2);
    this.ctx.lineTo(rx + rw / 2, ry);
    this.ctx.moveTo(rx + rw / 2, ry + rh);
    this.ctx.lineTo(rx + rw, ry + rh / 2);
    this.ctx.stroke();
  }

  private drawPaddleCell(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Top highlight bevel
    this.ctx.fillStyle = RenderPipeline.COLOR_BEVEL_LIGHT;
    this.ctx.fillRect(rx, ry, rw, 2);

    this.ctx.fillStyle = RenderPipeline.COLOR_BEVEL_DARK;
    this.ctx.fillRect(rx, ry + rh - 1.5, rw, 1.5);
  }

  private drawBallCell(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Bright ball center
    const pad = Math.max(1, Math.round(rw * 0.2));
    this.ctx.fillStyle = "#1e541e";
    this.ctx.fillRect(rx + pad, ry + pad, rw - pad * 2, rh - pad * 2);
  }

  private drawEmptyCell(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_EMPTY_BG;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Faint center LCD dot
    const dotW = Math.max(1, Math.round(rw * 0.18));
    this.ctx.fillStyle = RenderPipeline.COLOR_EMPTY_DOT;
    this.ctx.fillRect(
      rx + Math.round((rw - dotW) / 2),
      ry + Math.round((rh - dotW) / 2),
      dotW,
      dotW,
    );
  }

  private drawScanlines(width: number, height: number): void {
    this.ctx.fillStyle = "rgba(15, 56, 15, 0.04)";
    for (let y = 0; y < height; y += 4) {
      this.ctx.fillRect(0, y, width, 2);
    }
  }
}
