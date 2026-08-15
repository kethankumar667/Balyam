import { NOKIA_PIXEL_FONT } from "./SpriteSheet";

export class RenderPipeline {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private mainCtx: CanvasRenderingContext2D;

  public readonly virtualWidth = 128;
  public readonly virtualHeight = 96;

  public readonly BG_COLOR = "#87A96B";
  public readonly PIXEL_COLOR = "#0F2A1D";
  public readonly FAINT_COLOR = "#749757";

  constructor(mainCanvas: HTMLCanvasElement) {
    this.mainCtx = mainCanvas.getContext("2d", { alpha: false })!;
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = this.virtualWidth;
    this.offscreen.height = this.virtualHeight;
    this.offCtx = this.offscreen.getContext("2d", { willReadFrequently: true })!;

    this.offCtx.imageSmoothingEnabled = false;
    this.mainCtx.imageSmoothingEnabled = false;
  }

  public clear(): void {
    this.offCtx.fillStyle = this.BG_COLOR;
    this.offCtx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
  }

  public setPixel(x: number, y: number, color: string = this.PIXEL_COLOR): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.virtualWidth || iy < 0 || iy >= this.virtualHeight) return;
    this.offCtx.fillStyle = color;
    this.offCtx.fillRect(ix, iy, 1, 1);
  }

  public fillRect(x: number, y: number, w: number, h: number, color: string = this.PIXEL_COLOR): void {
    this.offCtx.fillStyle = color;
    this.offCtx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number, color: string = this.PIXEL_COLOR): void {
    // Bresenham's line algorithm for integer-crisp 1px pixel lines
    let ix0 = Math.floor(x0);
    let iy0 = Math.floor(y0);
    const ix1 = Math.floor(x1);
    const iy1 = Math.floor(y1);

    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(ix0, iy0, color);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  public drawSprite(sprite: number[][], startX: number, startY: number, color: string = this.PIXEL_COLOR): void {
    for (let r = 0; r < sprite.length; r++) {
      const row = sprite[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 1) {
          this.setPixel(startX + c, startY + r, color);
        }
      }
    }
  }

  public drawText(
    text: string,
    startX: number,
    startY: number,
    color: string = this.PIXEL_COLOR,
    spacing: number = 1
  ): void {
    const upper = text.toUpperCase();
    let cursorX = startX;

    for (let i = 0; i < upper.length; i++) {
      const char = upper[i];
      const glyph = NOKIA_PIXEL_FONT[char] || NOKIA_PIXEL_FONT[" "];

      for (let row = 0; row < glyph.length; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if ((bits >> (4 - col)) & 1) {
            this.setPixel(cursorX + col, startY + row, color);
          }
        }
      }
      cursorX += 5 + spacing;
    }
  }

  public blitToScreen(destWidth: number, destHeight: number): void {
    const scale = Math.max(1, Math.min(destWidth / this.virtualWidth, destHeight / this.virtualHeight));
    const targetW = Math.floor(this.virtualWidth * scale);
    const targetH = Math.floor(this.virtualHeight * scale);
    const offsetX = Math.floor((destWidth - targetW) / 2);
    const offsetY = Math.floor((destHeight - targetH) / 2);

    this.mainCtx.fillStyle = "#0A1F13";
    this.mainCtx.fillRect(0, 0, destWidth, destHeight);

    this.mainCtx.drawImage(
      this.offscreen,
      0, 0, this.virtualWidth, this.virtualHeight,
      offsetX, offsetY, targetW, targetH
    );
  }
}
