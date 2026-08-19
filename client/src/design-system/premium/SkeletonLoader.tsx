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
            className={`${SURFACES.cardElevated} p-6 sm:p-8 animate-pulse space-y-4 ${className}`}
          >
            <div className="h-4 w-32 bg-stone-800 rounded-full" />
            <div className="h-8 w-64 bg-stone-750 rounded-xl" />
            <div className="h-4 w-full max-w-md bg-stone-800 rounded-full" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-28 bg-stone-800 rounded-xl" />
              <div className="h-10 w-36 bg-stone-750 rounded-xl" />
            </div>
          </div>
        );

      case "profile":
        return (
          <div
            key={index}
            className={`${SURFACES.cardElevated} p-6 sm:p-8 animate-pulse flex flex-col sm:flex-row items-center sm:items-start gap-6 ${className}`}
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-stone-800" />
            <div className="space-y-3 flex-1 w-full text-center sm:text-left">
              <div className="h-7 w-48 bg-stone-750 rounded-xl mx-auto sm:mx-0" />
              <div className="h-4 w-32 bg-stone-800 rounded-full mx-auto sm:mx-0" />
              <div className="h-3 w-full max-w-md bg-stone-800 rounded-full mx-auto sm:mx-0" />
            </div>
          </div>
        );

      case "table":
        return (
          <div key={index} className={`${SURFACES.cardDefault} p-4 animate-pulse space-y-3 ${className}`}>
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center justify-between py-2 border-b border-stone-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-800" />
                  <div className="w-8 h-8 rounded-xl bg-stone-800" />
                  <div className="h-4 w-28 bg-stone-750 rounded-md" />
                </div>
                <div className="h-4 w-16 bg-stone-800 rounded-md" />
              </div>
            ))}
          </div>
        );

      case "grid":
        return (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`${SURFACES.cardDefault} p-4 animate-pulse space-y-3`}
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-xl bg-stone-800" />
                  <div className="h-4 w-16 bg-stone-800 rounded-full" />
                </div>
                <div className="h-5 w-32 bg-stone-750 rounded-md" />
                <div className="h-3 w-full bg-stone-800 rounded-full" />
              </div>
            ))}
          </div>
        );

      case "card":
      default:
        return (
          <div
            key={index}
            className={`${SURFACES.cardDefault} p-5 animate-pulse space-y-3.5 ${className}`}
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-stone-800 rounded-full" />
              <div className="w-6 h-6 rounded-lg bg-stone-800" />
            </div>
            <div className="h-6 w-36 bg-stone-750 rounded-lg" />
            <div className="h-3 w-20 bg-stone-800 rounded-full" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => renderItem(i))}
    </div>
  );
};
