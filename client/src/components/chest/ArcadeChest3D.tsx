import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Star, Crown } from "lucide-react";
import type { ChestTier, ChestOpeningStage, ChestTierConfig } from "./types";
import { bhalyamSpring } from "../../lib/motion";

export const CHEST_TIER_CONFIGS: Record<ChestTier, ChestTierConfig> = {
  bronze: {
    tier: "bronze",
    displayName: "Bronze Supply Chest",
    accentColor: "#f97316", // Amber / Bronze
    secondaryColor: "#7c2d12",
    glowColor: "rgba(249, 115, 22, 0.55)",
    haloGradients:
      "conic-gradient(from 0deg, transparent 0deg, rgba(249,115,22,0.3) 30deg, transparent 60deg, rgba(251,146,60,0.35) 90deg, transparent 120deg, rgba(249,115,22,0.3) 150deg, transparent 180deg, rgba(249,115,22,0.3) 210deg, transparent 240deg, rgba(251,146,60,0.35) 270deg, transparent 300deg, rgba(249,115,22,0.3) 330deg, transparent 360deg)",
    imageSrc: "/bronze chest.png",
  },
  silver: {
    tier: "silver",
    displayName: "Silver Royal Chest",
    accentColor: "#38bdf8", // Sky blue / Silver steel
    secondaryColor: "#0369a1",
    glowColor: "rgba(56, 189, 248, 0.55)",
    haloGradients:
      "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.3) 30deg, transparent 60deg, rgba(147,197,253,0.35) 90deg, transparent 120deg, rgba(56,189,248,0.3) 150deg, transparent 180deg, rgba(56,189,248,0.3) 210deg, transparent 240deg, rgba(147,197,253,0.35) 270deg, transparent 300deg, rgba(56,189,248,0.3) 330deg, transparent 360deg)",
    imageSrc: "/silver chest.png",
  },
  gold: {
    tier: "gold",
    displayName: "Gilded Treasury Chest",
    accentColor: "#eab308", // Vivid gold
    secondaryColor: "#854d0e",
    glowColor: "rgba(234, 179, 8, 0.65)",
    haloGradients:
      "conic-gradient(from 0deg, transparent 0deg, rgba(234,179,8,0.35) 30deg, transparent 60deg, rgba(253,224,71,0.45) 90deg, transparent 120deg, rgba(234,179,8,0.35) 150deg, transparent 180deg, rgba(234,179,8,0.35) 210deg, transparent 240deg, rgba(253,224,71,0.45) 270deg, transparent 300deg, rgba(234,179,8,0.35) 330deg, transparent 360deg)",
    imageSrc: "/Gold chest.png",
  },
  diamond: {
    tier: "diamond",
    displayName: "Legendary Crown Vault",
    accentColor: "#a855f7", // Violet & Cyan mythical
    secondaryColor: "#06b6d4",
    glowColor: "rgba(168, 85, 247, 0.75)",
    haloGradients:
      "conic-gradient(from 0deg, transparent 0deg, rgba(6,182,212,0.4) 30deg, transparent 60deg, rgba(168,85,247,0.45) 90deg, transparent 120deg, rgba(234,179,8,0.4) 150deg, transparent 180deg, rgba(6,182,212,0.4) 210deg, transparent 240deg, rgba(168,85,247,0.45) 270deg, transparent 300deg, rgba(234,179,8,0.4) 330deg, transparent 360deg)",
    imageSrc: "/legendary chest.png",
  },
  legendary: {
    tier: "legendary",
    displayName: "Legendary Crown Vault",
    accentColor: "#a855f7",
    secondaryColor: "#06b6d4",
    glowColor: "rgba(168, 85, 247, 0.75)",
    haloGradients:
      "conic-gradient(from 0deg, transparent 0deg, rgba(6,182,212,0.4) 30deg, transparent 60deg, rgba(168,85,247,0.45) 90deg, transparent 120deg, rgba(234,179,8,0.4) 150deg, transparent 180deg, rgba(6,182,212,0.4) 210deg, transparent 240deg, rgba(168,85,247,0.45) 270deg, transparent 300deg, rgba(234,179,8,0.4) 330deg, transparent 360deg)",
    imageSrc: "/legendary chest.png",
  },
};

interface ArcadeChest3DProps {
  tier: ChestTier;
  stage: ChestOpeningStage;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export const ArcadeChest3D: React.FC<ArcadeChest3DProps> = ({
  tier,
  stage,
  size = 200,
  onClick,
  className = "",
}) => {
  const config = CHEST_TIER_CONFIGS[tier] ?? CHEST_TIER_CONFIGS.gold;
  const isIdle = stage === "idle";
  const isRumble = stage === "rumble";
  const isOpen = stage === "burst" || stage === "revealing" || stage === "pedestal";
  const isDiamond = tier === "diamond" || tier === "legendary";

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        perspective: "1000px",
      }}
    >
      {/* 1. Ambient Pulsing Radial Aura */}
      <motion.div
        animate={
          isRumble
            ? { scale: [1, 1.45, 1.15], opacity: [0.6, 0.95, 0.7] }
            : isOpen
            ? { scale: 1.6, opacity: 0.85 }
            : { scale: [1, 1.15, 1], opacity: [0.45, 0.7, 0.45] }
        }
        transition={{
          duration: isRumble ? 0.3 : isOpen ? 0.6 : 3,
          repeat: isRumble || isOpen ? 0 : Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-[-24px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: config.glowColor }}
      />

      {/* 2. Rotating Celestial God Rays Sunburst */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: isOpen ? 12 : 24,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-[-70px] pointer-events-none rounded-full"
        style={{
          background: config.haloGradients,
          opacity: isIdle ? 0.65 : 0.9,
        }}
      />

      {/* 3. Volumetric Vertical Light Eruption Beam (Shooting upwards upon open) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scaleX: 0.2 }}
            animate={{
              opacity: [0.9, 1, 0.75],
              height: size * 2.2,
              scaleX: [0.8, 1.3, 1],
            }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute -top-[160px] pointer-events-none z-0 rounded-t-full"
            style={{
              width: size * 0.9,
              background: `linear-gradient(to top, ${config.accentColor} 0%, rgba(255,255,255,0.9) 35%, transparent 100%)`,
              filter: "blur(6px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* 4. Shockwave Ping Ring on Burst */}
      <AnimatePresence>
        {(stage === "burst" || stage === "revealing") && (
          <motion.div
            initial={{ scale: 0.4, opacity: 1, borderWidth: 6 }}
            animate={{ scale: 2.5, opacity: 0, borderWidth: 1 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="absolute inset-0 rounded-full pointer-events-none z-10"
            style={{
              borderColor: config.accentColor,
              boxShadow: `0 0 24px ${config.accentColor}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* 5. Floating Star / Crown Orbiters */}
      {isDiamond && (
        <motion.div
          animate={
            isOpen
              ? { y: -80, opacity: 0, scale: 1.4 }
              : { y: [-6, -14, -6], rotate: [-4, 4, -4] }
          }
          transition={{ duration: 2.6, repeat: isOpen ? 0 : Infinity, ease: "easeInOut" }}
          className="absolute -top-7 z-30 pointer-events-none"
        >
          <Crown className="w-10 h-10 text-amber-300 fill-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.95)]" />
        </motion.div>
      )}

      {/* Star Sparks (Replaces forbidden Sparkles with Star icons) */}
      <motion.div
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-2 -right-3 z-30 pointer-events-none"
        style={{ color: config.accentColor }}
      >
        <Star className="w-5 h-5 fill-current drop-shadow-[0_0_8px_currentColor]" />
      </motion.div>

      <motion.div
        animate={{ scale: [1, 0.7, 1], opacity: [0.8, 0.4, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="absolute -bottom-2 -left-3 z-30 pointer-events-none"
        style={{ color: config.accentColor }}
      >
        <Star className="w-4 h-4 fill-current drop-shadow-[0_0_8px_currentColor]" />
      </motion.div>

      {/* 6. The Interactive 3D Chest Body */}
      <motion.div
        onClick={onClick}
        whileHover={isIdle ? { scale: 1.05, y: -4 } : {}}
        whileTap={isIdle ? { scale: 0.95 } : {}}
        animate={
          isRumble
            ? {
                x: [-8, 8, -6, 6, -3, 3, 0],
                rotate: [-4, 4, -3, 3, -1, 1, 0],
                scale: [0.93, 0.96, 0.92, 0.98, 0.94],
              }
            : isOpen
            ? {
                scale: [0.95, 1.25, 1.08],
                y: [0, -16, -6],
              }
            : {
                y: [-5, 5, -5],
              }
        }
        transition={
          isRumble
            ? { duration: 0.45, ease: "easeInOut" }
            : isOpen
            ? { duration: 0.65, ease: [0.175, 0.885, 0.32, 1.275] }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
        }}
        className={`relative z-20 flex items-center justify-center overflow-visible ${
          isIdle ? "cursor-pointer" : "pointer-events-none"
        }`}
      >
        {/* Chest 3D Layered Artwork */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Main 3D Chest Sprite with Dynamic Filter */}
          <img
            src={config.imageSrc}
            alt={config.displayName}
            draggable={false}
            loading="eager"
            className="w-full h-full object-contain filter transition-all select-none"
            style={{
              transform: isOpen
                ? "scale(1.35) rotateX(8deg)"
                : "scale(1.38)",
              filter: isRumble
                ? `brightness(1.3) drop-shadow(0 0 20px ${config.accentColor}) drop-shadow(0 16px 30px rgba(0,0,0,0.8))`
                : isOpen
                ? `brightness(1.4) drop-shadow(0 0 35px ${config.accentColor}) drop-shadow(0 20px 40px rgba(0,0,0,0.9))`
                : `drop-shadow(0 14px 28px rgba(0,0,0,0.75)) drop-shadow(0 0 16px ${config.glowColor})`,
            }}
          />

          {/* Realistic 3D Hinge Lid Opening Illusion (When Open) */}
          {isOpen && (
            <motion.div
              initial={{ rotateX: 0, opacity: 0, scale: 0.8 }}
              animate={{ rotateX: -115, opacity: 1, scale: 1.15 }}
              transition={bhalyamSpring}
              style={{
                transformOrigin: "top center",
                transformStyle: "preserve-3d",
              }}
              className="absolute -top-3 w-4/5 h-1/3 rounded-t-2xl bg-gradient-to-t from-transparent via-white/30 to-amber-200/50 blur-[1px] pointer-events-none z-30"
            />
          )}

          {/* Lock Emblem in the center (Rattles & Shatters on unlock) */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                animate={
                  isRumble
                    ? {
                        scale: [1, 1.4, 1.1],
                        rotate: [-15, 15, -10, 10, 0],
                        filter: "brightness(1.8)",
                      }
                    : { scale: 1 }
                }
                exit={{
                  scale: 2.2,
                  opacity: 0,
                  filter: "brightness(3)",
                  transition: { duration: 0.25 },
                }}
                className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full shadow-2xl backdrop-blur-xs flex items-center justify-center border-2"
                style={{
                  backgroundColor: "rgba(15, 15, 15, 0.85)",
                  borderColor: config.accentColor,
                  boxShadow: `0 0 18px ${config.accentColor}`,
                }}
              >
                {isRumble ? (
                  <Unlock
                    className="w-6 h-6 stroke-[2.5]"
                    style={{ color: config.accentColor }}
                  />
                ) : (
                  <Lock
                    className="w-6 h-6 stroke-[2.5]"
                    style={{ color: config.accentColor }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glowing Crack Seams when rumbling */}
          {isRumble && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.8] }}
              transition={{ duration: 0.2, repeat: Infinity }}
              className="absolute inset-x-8 top-[48%] h-2 rounded-full bg-white blur-[2px] pointer-events-none z-20"
              style={{
                boxShadow: `0 0 20px 6px ${config.accentColor}`,
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ArcadeChest3D;
