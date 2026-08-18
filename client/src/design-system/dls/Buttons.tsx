import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tournament" | "reward" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-3 py-1.5 text-xs rounded-xl min-h-[36px]";
      case "lg":
        return "px-6 py-3.5 text-sm rounded-2xl min-h-[48px]";
      case "md":
      default:
        return "px-4.5 py-2.5 text-xs rounded-xl min-h-[42px]";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "tournament":
        return "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black shadow-lg shadow-amber-500/25 border border-amber-300/40";
      case "reward":
        return "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black shadow-lg shadow-emerald-500/20";
      case "danger":
        return "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold shadow-lg shadow-rose-600/20";
      case "secondary":
        return "bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white font-bold border border-stone-750 hover:border-stone-600 shadow-md";
      case "ghost":
        return "bg-transparent hover:bg-stone-900/60 text-stone-400 hover:text-stone-200 font-semibold";
      case "primary":
      default:
        return "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-500/15";
    }
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-mono uppercase tracking-wider transition-all duration-200 active:scale-97 select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${getSizeStyles()} ${getVariantStyles()} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export const PrimaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="secondary" {...props} />
);

export const TournamentCTAButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="tournament" {...props} />
);

export const RewardButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="reward" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button variant="danger" {...props} />
);
