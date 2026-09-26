import React, { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LevelTier } from "@shared/progression/MiniclipProgression";

export interface MiniclipHoloTiltProps {
  children: React.ReactNode;
  tier: LevelTier;
  maxTiltDeg?: number;
  className?: string;
  enableAura?: boolean;
  showSpecularGleam?: boolean;
}

/**
 * 3D Holographic Parallax Tilt & Specular Sheen Wrapper.
 *
 * Implements arcade-grade physical card/badge interaction:
 *  - Responsive 3D perspective rotation tracking pointer movement
 *  - Dynamic specular glare overlay reflecting ambient light angles
 *  - Living Tier-specific backlighting auras (orbital energy rings, plasma core)
 *  - Smooth return-to-center spring damping on pointer release
 */
export const MiniclipHoloTilt: React.FC<MiniclipHoloTiltProps> = ({
  children,
  tier,
  maxTiltDeg = 15,
  className = "",
  enableAura = true,
  showSpecularGleam = true,
}) => {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const normX = Math.max(0, Math.min(1, clientX / rect.width));
      const normY = Math.max(0, Math.min(1, clientY / rect.height));

      // Calculate tilt degrees: invert Y for natural physical tilt
      const rotateX = (0.5 - normY) * (maxTiltDeg * 2);
      const rotateY = (normX - 0.5) * (maxTiltDeg * 2);

      setTilt({ x: rotateX, y: rotateY });
      setGlarePos({
        x: normX * 100,
        y: normY * 100,
        opacity: 0.65,
      });
    },
    [maxTiltDeg, reduceMotion]
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`relative inline-block perspective-[800px] select-none ${className}`}
      style={{ touchAction: "none" }}
    >
      {/* Living Tier Backlight Aura */}
      {enableAura && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Base Ambient Breathing Glow */}
          <motion.div
            animate={{
              scale: isHovered ? [1.1, 1.25, 1.1] : [1, 1.12, 1],
              opacity: isHovered ? [0.6, 0.85, 0.6] : [0.35, 0.55, 0.35],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-[120%] h-[120%] rounded-full blur-xl pointer-events-none"
            style={{ backgroundColor: tier.themeColor }}
          />

          {/* Tier Specific Auras */}
          {tier.name === "Gold" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute w-[140%] h-[140%] rounded-full opacity-30 border border-amber-400/40 border-dashed"
            />
          )}

          {tier.name === "Ruby" && (
            <motion.div
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[130%] h-[130%] rounded-full border-2 border-red-500/50 blur-xs"
            />
          )}

          {(tier.name === "Amethyst" || tier.name === "Emerald") && (
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute w-[145%] h-[145%] rounded-full border border-fuchsia-400/30 border-dotted"
            />
          )}

          {tier.name === "Celestial" && (
            <>
              {/* Dual Cosmic Orbital Rings */}
              <motion.div
                animate={{ rotateX: [60, 60], rotateZ: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute w-[160%] h-[160%] rounded-full border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.6)] pointer-events-none"
                style={{ transformStyle: "preserve-3d" }}
              />
              <motion.div
                animate={{ rotateY: [60, 60], rotateZ: [360, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
                className="absolute w-[150%] h-[150%] rounded-full border border-sky-300/40 pointer-events-none"
                style={{ transformStyle: "preserve-3d" }}
              />
            </>
          )}
        </div>
      )}

      {/* 3D Tilting Content Container */}
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          mass: 0.8,
        }}
        style={{
          transformStyle: "preserve-3d",
        }}
        className="relative z-10"
      >
        {children}

        {/* Dynamic Specular Holographic Sheen Overlay */}
        {showSpecularGleam && (
          <motion.div
            animate={{ opacity: glarePos.opacity }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 rounded-full pointer-events-none overflow-hidden z-30 mix-blend-overlay"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 30%, transparent 65%)`,
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default MiniclipHoloTilt;
