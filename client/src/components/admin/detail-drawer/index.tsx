import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const WIDTH_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

export default function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = "md",
  className = "",
}: DetailDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen ${WIDTH_CLASSES[width]} bg-[var(--chrome-panel)] border-l border-[var(--chrome-border)] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right ${className}`}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[var(--chrome-border)] flex items-start justify-between gap-4 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-black text-[var(--chrome-ink)] tracking-tight truncate">
                  {title}
                </h2>
                {badge && <div className="flex-shrink-0">{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-xs text-[var(--chrome-ink-soft)] mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] rounded-xl transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
            {children}
          </div>

          {/* Footer Actions */}
          {footer && (
            <div className="p-4 sm:p-5 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-control)] flex items-center justify-end gap-3 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
