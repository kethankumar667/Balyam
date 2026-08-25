import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
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
        <div className="min-h-[75vh] w-full flex items-center justify-center p-4 selection:bg-amber-200">
          <div
            className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-amber-50/95 dark:bg-zinc-800/95
                       border-2 border-amber-300/80 dark:border-zinc-600 shadow-2xl text-center flex flex-col items-center"
            role="alert"
            aria-live="polite"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-200 dark:bg-zinc-700 flex items-center justify-center shadow-inner">
              <AlertCircle className="w-7 h-7 text-amber-800 dark:text-amber-300" aria-hidden />
            </div>
            <h2 className="text-xl font-black text-[#5C3D1E] dark:text-amber-300">
              {this.props.gameName ? `${this.props.gameName} encountered an issue` : "Game board hiccup"}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8A6D4B] dark:text-zinc-300 leading-relaxed max-w-sm mx-auto">
              The game board stopped rendering, but you are still safely seated in the room and voice chat remains active.
            </p>

            <div className="mt-6 flex justify-center w-full">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 rounded-full font-extrabold text-sm
                           bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark text-bhalyam-wood-dark
                           hover:brightness-105 shadow-md active:scale-95 transition cursor-pointer text-center"
              >
                Reload Game Board
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GameErrorBoundary;
