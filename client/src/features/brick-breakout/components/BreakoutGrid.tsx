import React, { useEffect, useRef } from "react";
import type { GameState } from "../types";
import { RenderPipeline } from "../canvas/RenderPipeline";
import styles from "../styles/BrickBreakout.module.css";

interface BreakoutGridProps {
  state: GameState;
}

/**
 * Hardware-Accelerated 60fps Canvas Grid for Brick Breakout.
 * Renders beveled bricks, dynamic paddle, and ball on GPU canvas at 60fps.
 */
export const BreakoutGrid: React.FC<BreakoutGridProps> = ({ state }) => {
  const { paddle, ball, bricks } = state;
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
    pipelineRef.current.syncDimensions();
    pipelineRef.current.render({
      paddle,
      ball,
      bricks,
    });
  }, [paddle, ball, bricks]);

  return (
    <div className={styles.lcdContainer} style={{ width: "100%", maxWidth: 190, aspectRatio: "10/19" }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Breakout LCD game board"
        className="w-full h-full block"
        style={{ aspectRatio: "10/19" }}
      />
    </div>
  );
};

export default BreakoutGrid;
