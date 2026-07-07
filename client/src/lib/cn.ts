import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings with conditional logic. `clsx` resolves the
 * conditionals/arrays/objects, `twMerge` de-duplicates conflicting utilities so
 * later classes win (e.g. `cn("px-2", cond && "px-4")` → `px-4`). Standard
 * shadcn-style helper — used by the `components/paper/` primitives.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
