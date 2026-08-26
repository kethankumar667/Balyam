import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { EconomyActionButton } from "./EconomyActionButton";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Isolated Error Boundary for BHALYAM Economy UI.
 * Prevents economy runtime exceptions from crashing the parent page/game loop,
 * offering a clean fallback card with accessible retry action.
 */
export class EconomyErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ECONOMY_UI_ERROR]", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-red-500/30 bg-red-500/10 text-center font-sans space-y-3"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-ink-hi dark:text-text-hi">
            {this.props.fallbackTitle || "Economy View Temporarily Unavailable"}
          </h3>
          <p className="text-xs text-ink-lo dark:text-text-lo max-w-sm">
            {this.state.error?.message || "An unexpected error occurred while loading this economy component."}
          </p>
          <EconomyActionButton
            variant="secondary"
            size="sm"
            onClick={this.handleReset}
            className="mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            <span>Try Again</span>
          </EconomyActionButton>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EconomyErrorBoundary;
