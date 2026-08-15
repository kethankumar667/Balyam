import React, { Component, ErrorInfo, ReactNode } from "react";
import { telemetry } from "../lib/observability";

interface Props {
  children: ReactNode;
  gameName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    telemetry.error("game_board_crashed", error, {
      game: this.props.gameName,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="w-full max-w-lg mx-auto my-6 p-6 rounded-2xl bg-amber-50/90 dark:bg-zinc-800/90
                     border-2 border-amber-300 dark:border-zinc-600 shadow-lg text-center"
          role="alert"
          aria-live="polite"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-200 dark:bg-zinc-700 flex items-center justify-center text-2xl">
            🎲
          </div>
          <h2 className="text-lg font-black text-[#5C3D1E] dark:text-amber-300">
            {this.props.gameName ? `${this.props.gameName} encountered an issue` : "Game board hiccup"}
          </h2>
          <p className="mt-1.5 text-xs text-[#8A6D4B] dark:text-zinc-300 leading-relaxed">
            The game board stopped rendering, but you are still safely seated in the room and voice chat remains active.
          </p>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="min-h-[44px] px-6 rounded-full font-extrabold text-sm
                         bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark text-bhalyam-wood-dark
                         hover:brightness-105 shadow-md active:scale-95 transition cursor-pointer"
            >
              Reload Game Board
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GameErrorBoundary;
