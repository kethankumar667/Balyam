import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BrickSpaceAlienErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("BrickSpaceAlien error boundary caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-[#0f172a] text-zinc-100 rounded-2xl border-2 border-red-500 font-mono text-center max-w-md mx-auto my-8">
          <span className="text-3xl mb-2">⚠️</span>
          <h3 className="text-base font-black text-red-400 mb-1">GAME INITIALIZATION ERROR</h3>
          <p className="text-xs text-zinc-400 mb-4">
            An unexpected error occurred while running the LCD matrix engine.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs"
          >
            TRY AGAIN
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BrickSpaceAlienErrorBoundary;
