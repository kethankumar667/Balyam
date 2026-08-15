import React, { Component, ErrorInfo, ReactNode } from "react";
import { telemetry } from "../lib/observability";
import BhalyamLogo from "./bhalyam/BhalyamLogo";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    telemetry.error("react_component_crashed", error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bhalyam-paper flex items-center justify-center p-4 selection:bg-amber-200">
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 border-2 border-[#EAD8B7] dark:border-zinc-700
                       rounded-2xl p-6 sm:p-8 text-center shadow-xl flex flex-col items-center"
            role="alert"
            aria-live="assertive"
          >
            <div className="mb-4">
              <BhalyamLogo size={64} decorative />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#5C3D1E] dark:text-amber-300">
              A piece slipped off the board!
            </h1>

            <p className="mt-2 text-sm text-[#8A6D4B] dark:text-zinc-300 leading-relaxed">
              Something unexpected happened while rendering this page. Don&apos;t worry — your profile
              and room codes are safe.
            </p>

            {this.state.error && import.meta.env.DEV && (
              <pre className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs text-left overflow-x-auto rounded-lg max-h-32 w-full font-mono">
                {this.state.error.message}
              </pre>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 min-h-[44px] px-4 rounded-xl font-bold text-sm
                           bg-amber-100 hover:bg-amber-200 text-[#5C3D1E] dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200
                           border border-amber-300 dark:border-zinc-600 active:scale-[0.98] transition cursor-pointer"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 min-h-[44px] px-4 rounded-xl font-bold text-sm
                           bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark text-bhalyam-wood-dark
                           hover:brightness-105 shadow-md active:scale-[0.98] transition cursor-pointer"
              >
                Return to Lounge
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
