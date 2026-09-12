import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { THEME_CATALOG, ALL_SKINS, type GameSkin } from "../skin";

export interface HandCricketThemeModalProps {
  open: boolean;
  activeSkin: GameSkin;
  onSelectSkin: (skin: GameSkin) => void;
  onClose: () => void;
}

export default function HandCricketThemeModal({
  open,
  activeSkin,
  onSelectSkin,
  onClose,
}: HandCricketThemeModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose Hand Cricket Visual Theme"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full max-w-2xl rounded-2xl p-4 sm:p-6 shadow-2xl z-10 overflow-hidden"
            style={{
              background: "linear-gradient(170deg, #0f172a 0%, #090d16 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.65), 0 0 32px rgba(245,196,81,0.12)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/20 text-xl text-amber-300 border border-amber-400/30">
                  🎨
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                    Hand Cricket Themes
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Choose your visual stadium & match atmosphere
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Grid of 6 Themes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[64vh] overflow-y-auto pr-1">
              {ALL_SKINS.map((skinId) => {
                const theme = THEME_CATALOG[skinId];
                const isSelected = activeSkin === skinId;
                return (
                  <button
                    key={skinId}
                    type="button"
                    onClick={() => {
                      onSelectSkin(skinId);
                      onClose();
                    }}
                    className="group relative flex flex-col justify-between rounded-xl p-3.5 text-left transition-all duration-200 active:scale-[0.98] overflow-hidden"
                    style={{
                      background: isSelected
                        ? "linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)"
                        : "rgba(255,255,255,0.03)",
                      border: isSelected
                        ? `2px solid ${theme.accent}`
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isSelected ? `0 0 24px ${theme.accent}33` : "none",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{theme.icon}</span>
                          <div>
                            <span className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                              {theme.name}
                            </span>
                            <span
                              className="ml-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                              style={{
                                background: `${theme.accent}25`,
                                color: theme.accent,
                                border: `1px solid ${theme.accent}55`,
                              }}
                            >
                              {theme.badge}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span
                            className="grid h-6 w-6 place-items-center rounded-full text-xs font-black shadow"
                            style={{ background: theme.accent, color: "#0B1120" }}
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <p className="text-[11.5px] leading-relaxed text-slate-300 font-normal">
                        {theme.description}
                      </p>
                    </div>

                    <div
                      className="mt-3.5 h-2 w-full rounded-full overflow-hidden opacity-85 group-hover:opacity-100 transition"
                      style={{ background: theme.previewBg }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-white/10 text-xs text-slate-400">
              <span>Applied instantly to your current match</span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-1.5 font-bold text-white bg-white/10 hover:bg-white/20 transition active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
