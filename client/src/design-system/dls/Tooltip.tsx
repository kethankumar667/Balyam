import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipPortal = TooltipPrimitive.Portal;

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  shortcut?: string;
  showArrow?: boolean;
}

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(
  (
    {
      className = "",
      sideOffset = 6,
      shortcut,
      showArrow = true,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={`bhalyam-tooltip relative z-50 overflow-hidden rounded-lg px-3 py-1.5 text-[11.5px] font-extrabold leading-tight select-none
            bg-[var(--chrome-panel)] text-[var(--chrome-ink)] border border-[#E4B128]/45 dark:border-[#FBBF24]/35
            shadow-[0_14px_32px_-10px_rgba(228,177,40,0.5),0_4px_16px_-4px_rgba(0,0,0,0.4)]
            backdrop-blur-md transition-all
            animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
            data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
            flex items-center gap-1.5 ${className}`}
          {...props}
        >
          {/* Gold hairline across the top — the same accent language as the
              toast's left rail, so the two redesigned surfaces read as one
              family rather than two separate one-off treatments. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, #F4C430 0%, #E4B128 50%, #B38918 100%)" }}
          />
          <span>{children}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-b from-[#F4C430] to-[#B38918] text-[#3D2005] shadow-sm">
              {shortcut}
            </kbd>
          )}
          {showArrow && (
            <TooltipPrimitive.Arrow
              className="fill-[var(--chrome-panel)]"
              width={10}
              height={5}
            />
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  shortcut?: string;
  showArrow?: boolean;
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
}

/**
 * High-level accessible Tooltip component.
 *
 * Usage:
 * ```tsx
 * <Tooltip content="Switch to dark mode" shortcut="⌘D">
 *   <button>Toggle Theme</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  delayDuration = 200,
  shortcut,
  showArrow = true,
  disabled = false,
  className = "",
  asChild = true,
}: TooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root delayDuration={delayDuration}>
        <TooltipPrimitive.Trigger asChild={asChild}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          shortcut={shortcut}
          showArrow={showArrow}
          className={className}
        >
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
