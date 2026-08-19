import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";
import { MOTION_TOKENS } from "./motionTokens";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "interactive";
  glowColor?: string;
  className?: string;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  variant = "default",
  glowColor,
  className = "",
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "elevated":
        return `${GLASSMORPHISM.elevatedCard} shadow-2xl`;
      case "interactive":
        return `${GLASSMORPHISM.card} ${MOTION_TOKENS.cardHover} ${MOTION_TOKENS.interactiveGlow} cursor-pointer`;
      case "default":
      default:
        return `${GLASSMORPHISM.card} shadow-xl`;
    }
  };

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 relative overflow-hidden ${getVariantStyles()} ${className}`}
      {...props}
    >
      {glowColor && (
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: glowColor }}
        />
      )}
      {children}
    </div>
  );
};
