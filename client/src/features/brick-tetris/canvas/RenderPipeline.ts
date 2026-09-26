import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";
import type { ActivePiece, CellValue, ReadonlyBoardMatrix } from "../types";

export interface TetrisRenderParams {
  board: ReadonlyBoardMatrix | CellValue[][];
  activePiece: ActivePiece | null;
  ghostPiece: { x: number; y: number } | null;
  clearingLines: readonly number[] | number[];
  status: string;
}

/**
 * 60fps Hardware-Accelerated 2D Canvas Render Pipeline for Brick Tetris & Pentix.
 * Replaces high-cost DOM div grids with GPU-accelerated LCD beveled pixel art.
 */
export class RenderPipeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  // Authentic LCD Palette
  public static readonly COLOR_BG = "#8bac0f";
  public static readonly COLOR_BG_SHADOW = "rgba(15, 56, 15, 0.25)";
  public static readonly COLOR_EMPTY_DOT = "rgba(48, 98, 48, 0.16)";
  public static readonly COLOR_EMPTY_BG = "rgba(120, 155, 15, 0.22)";
  public static readonly COLOR_PIXEL_DARK = "#0f380f";
  public static readonly COLOR_PIXEL_CORE = "#1a461a";
  public static readonly COLOR_BEVEL_LIGHT = "rgba(155, 188, 15, 0.55)";
  public static readonly COLOR_BEVEL_DARK = "rgba(5, 24, 5, 0.75)";
  public static readonly COLOR_GHOST_BORDER = "rgba(15, 56, 15, 0.7)";
  public static readonly COLOR_GHOST_FILL = "rgba(15, 56, 15, 0.25)";
  public static readonly COLOR_CLEAR_FLASH = "#c6e81e";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Unable to obtain 2D context for Brick Tetris canvas");
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

  public render(params: TetrisRenderParams): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : this.canvas.width / this.dpr;
    const height = rect.height > 0 ? rect.height : this.canvas.height / this.dpr;

    // Reset & clear background
    this.ctx.fillStyle = RenderPipeline.COLOR_BG;
    this.ctx.fillRect(0, 0, width, height);

    const padding = 3;
    const gap = 2;
    const boardAreaWidth = width - padding * 2;
    const boardAreaHeight = height - padding * 2;

    const cellWidth = (boardAreaWidth - (BOARD_WIDTH - 1) * gap) / BOARD_WIDTH;
    const cellHeight = (boardAreaHeight - (BOARD_HEIGHT - 1) * gap) / BOARD_HEIGHT;

    // 1. Build composite grid
    const composite: Array<Array<{ val: number; ghost: boolean; clear: boolean }>> = Array.from(
      { length: BOARD_HEIGHT },
      (_, r) =>
        Array.from({ length: BOARD_WIDTH }, (_, c) => ({
          val: params.board[r]?.[c] ?? 0,
          ghost: false,
          clear: params.clearingLines.includes(r),
        })),
    );

    // Overlay ghost piece
    if (params.ghostPiece && params.activePiece && params.status === "playing") {
      const size = params.activePiece.matrix.length;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (params.activePiece.matrix[r][c] === 1) {
            const gy = params.ghostPiece.y + r;
            const gx = params.ghostPiece.x + c;
            if (gy >= 0 && gy < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) {
              if (composite[gy][gx].val === 0) {
                composite[gy][gx].ghost = true;
              }
            }
          }
        }
      }
    }

    // Overlay active piece
    if (
      params.activePiece &&
      (params.status === "playing" || params.status === "line-clearing")
    ) {
      const size = params.activePiece.matrix.length;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (params.activePiece.matrix[r][c] === 1) {
            const py = params.activePiece.position.y + r;
            const px = params.activePiece.position.x + c;
            if (py >= 0 && py < BOARD_HEIGHT && px >= 0 && px < BOARD_WIDTH) {
              composite[py][px].val = 1;
              composite[py][px].ghost = false;
            }
          }
        }
      }
    }

    // 2. Draw each LCD pixel block
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      const y = padding + r * (cellHeight + gap);
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const x = padding + c * (cellWidth + gap);
        const cell = composite[r][c];

        if (cell.clear) {
          this.drawClearingCell(x, y, cellWidth, cellHeight);
        } else if (cell.val === 1) {
          this.drawActiveBlock(x, y, cellWidth, cellHeight);
        } else if (cell.ghost) {
          this.drawGhostBlock(x, y, cellWidth, cellHeight);
        } else {
          this.drawEmptyCell(x, y, cellWidth, cellHeight);
        }
      }
    }

    // 3. Subtle retro scanline pass
    this.drawScanlines(width, height);
  }

  private drawActiveBlock(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    // Dark solid block
    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Top & Left highlight bevel
    this.ctx.fillStyle = RenderPipeline.COLOR_BEVEL_LIGHT;
    this.ctx.fillRect(rx, ry, rw, 1.5);
    this.ctx.fillRect(rx, ry, 1.5, rh);

    // Bottom & Right dark shadow bevel
    this.ctx.fillStyle = RenderPipeline.COLOR_BEVEL_DARK;
    this.ctx.fillRect(rx, ry + rh - 1.5, rw, 1.5);
    this.ctx.fillRect(rx + rw - 1.5, ry, 1.5, rh);

    // Inset center LCD pixel dot
    const insetMargin = Math.max(2, Math.round(rw * 0.28));
    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_CORE;
    this.ctx.fillRect(
      rx + insetMargin,
      ry + insetMargin,
      rw - insetMargin * 2,
      rh - insetMargin * 2,
    );
  }

  private drawGhostBlock(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    // Semi-transparent ghost base
    this.ctx.fillStyle = RenderPipeline.COLOR_GHOST_FILL;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Dashed / outline border
    this.ctx.strokeStyle = RenderPipeline.COLOR_GHOST_BORDER;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    // Subtle center marker
    const dotW = Math.max(2, Math.round(rw * 0.2));
    this.ctx.fillStyle = RenderPipeline.COLOR_PIXEL_DARK;
    this.ctx.fillRect(
      rx + Math.round((rw - dotW) / 2),
      ry + Math.round((rh - dotW) / 2),
      dotW,
      dotW,
    );
  }

  private drawEmptyCell(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_EMPTY_BG;
    this.ctx.fillRect(rx, ry, rw, rh);

    // Faint inactive center LCD dot
    const dotW = Math.max(1, Math.round(rw * 0.18));
    this.ctx.fillStyle = RenderPipeline.COLOR_EMPTY_DOT;
    this.ctx.fillRect(
      rx + Math.round((rw - dotW) / 2),
      ry + Math.round((rh - dotW) / 2),
      dotW,
      dotW,
    );
  }

  private drawClearingCell(x: number, y: number, w: number, h: number): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);

    this.ctx.fillStyle = RenderPipeline.COLOR_CLEAR_FLASH;
    this.ctx.fillRect(rx, ry, rw, rh);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);
  }

  private drawScanlines(width: number, height: number): void {
    this.ctx.fillStyle = "rgba(15, 56, 15, 0.04)";
    for (let y = 0; y < height; y += 4) {
      this.ctx.fillRect(0, y, width, 2);
    }
  }
}
