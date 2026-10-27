import React from "react";
import { SURFACES } from "../dls";

interface SkeletonLoaderProps {
  type?: "card" | "hero" | "table" | "profile" | "grid";
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = "card",
  count = 1,
  className = "",
}) => {
  const renderItem = (index: number) => {
    switch (type) {
      case "hero":
        return (
          <div
            key={index}
            className={`${SURFACES.cardElevated} min-w-0 p-6 sm:p-8 animate-pulse motion-reduce:animate-none space-y-4 ${className}`}
          >
            <div className="h-4 w-32 max-w-full bg-[var(--chrome-control)] rounded-full" />
            <div className="h-8 w-full max-w-64 bg-[var(--chrome-control-hi)] rounded-xl" />
            <div className="h-4 w-full max-w-md bg-[var(--chrome-control)] rounded-full" />
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="h-11 w-28 max-w-full bg-[var(--chrome-control)] rounded-xl" />
              <div className="h-11 w-36 max-w-full bg-[var(--chrome-control-hi)] rounded-xl" />
            </div>
          </div>
        );

      case "profile":
        return (
          <div
            key={index}
            className={`${SURFACES.cardElevated} min-w-0 p-6 sm:p-8 animate-pulse motion-reduce:animate-none flex flex-col sm:flex-row items-center sm:items-start gap-6 ${className}`}
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-3xl bg-[var(--chrome-control)]" />
            <div className="space-y-3 flex-1 min-w-0 w-full text-center sm:text-left">
              <div className="h-7 w-48 max-w-full bg-[var(--chrome-control-hi)] rounded-xl mx-auto sm:mx-0" />
              <div className="h-4 w-32 max-w-full bg-[var(--chrome-control)] rounded-full mx-auto sm:mx-0" />
              <div className="h-3 w-full max-w-md bg-[var(--chrome-control)] rounded-full mx-auto sm:mx-0" />
            </div>
          </div>
        );

      case "table":
        return (
          <div key={index} className={`${SURFACES.cardDefault} min-w-0 p-4 animate-pulse motion-reduce:animate-none space-y-3 ${className}`}>
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--chrome-hairline)]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-6 h-6 shrink-0 rounded-full bg-[var(--chrome-control)]" />
                  <div className="w-8 h-8 shrink-0 rounded-xl bg-[var(--chrome-control)]" />
                  <div className="h-4 w-28 min-w-0 bg-[var(--chrome-control-hi)] rounded-md" />
                </div>
                <div className="h-4 w-16 shrink-0 bg-[var(--chrome-control)] rounded-md" />
              </div>
            ))}
          </div>
        );

      case "grid":
        return (
          <div key={index} className={`grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`${SURFACES.cardDefault} min-w-0 p-4 animate-pulse motion-reduce:animate-none space-y-3`}
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-xl bg-[var(--chrome-control)]" />
                  <div className="h-4 w-16 bg-[var(--chrome-control)] rounded-full" />
                </div>
                <div className="h-5 w-32 max-w-full bg-[var(--chrome-control-hi)] rounded-md" />
                <div className="h-3 w-full bg-[var(--chrome-control)] rounded-full" />
              </div>
            ))}
          </div>
        );

      case "card":
      default:
        return (
          <div
            key={index}
            className={`${SURFACES.cardDefault} min-w-0 p-5 animate-pulse motion-reduce:animate-none space-y-3.5 ${className}`}
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 max-w-full bg-[var(--chrome-control)] rounded-full" />
              <div className="w-6 h-6 rounded-lg bg-[var(--chrome-control)]" />
            </div>
            <div className="h-6 w-36 max-w-full bg-[var(--chrome-control-hi)] rounded-lg" />
            <div className="h-3 w-20 max-w-full bg-[var(--chrome-control)] rounded-full" />
          </div>
        );
    }
  };

  return (
    <div role="status" aria-label="Loading content" aria-busy="true" className="min-w-0">
      <div aria-hidden="true" className="space-y-4">
        {Array.from({ length: count }).map((_, i) => renderItem(i))}
      </div>
    </div>
  );
};
