import React, { useEffect, useRef } from "react";
import type { GameState } from "../types";
import { getGhostPosition } from "../engine/ghostEngine";
import { RenderPipeline } from "../canvas/RenderPipeline";
import styles from "../styles/MatrixGrid.module.css";

interface MatrixGridProps {
  state: GameState;
}

/**
 * Hardware-Accelerated 60fps Canvas Grid for Brick Tetris & Pentix.
 * Delivers authentic beveled LCD aesthetics without the DOM layout overhead of 200 divs.
 */
export const MatrixGrid: React.FC<MatrixGridProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef<RenderPipeline | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      pipelineRef.current = new RenderPipeline(canvasRef.current);
    } catch {
      pipelineRef.current = null;
    }

    const handleResize = () => {
      pipelineRef.current?.syncDimensions();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!pipelineRef.current) return;

    let ghostPos: { x: number; y: number } | null = null;
    if (state.activePiece && state.settings.ghostPieceEnabled && state.status === "playing") {
      ghostPos = getGhostPosition(state.board, state.activePiece);
    }

    pipelineRef.current.syncDimensions();
    pipelineRef.current.render({
      board: state.board,
      activePiece: state.activePiece,
      ghostPiece: ghostPos,
      clearingLines: state.clearingLines,
      status: state.status,
    });
  }, [
    state.board,
    state.activePiece,
    state.settings.ghostPieceEnabled,
    state.status,
    state.clearingLines,
  ]);

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.scanlineOverlay} />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Tetris 10 by 20 matrix board"
        className="w-full h-full block"
        style={{ aspectRatio: "10 / 20" }}
      />
    </div>
  );
};
