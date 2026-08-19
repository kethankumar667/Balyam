import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Ban, Users, X } from "lucide-react";

export interface AuthTrustSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Trust & Safety Bottom Sheet matching Screen 3 of the UX designs.
 */
export default function AuthTrustSheet({ open, onClose }: AuthTrustSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer / Bottom Sheet */}
          <motion.aside
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-[#FFFDF8] rounded-t-[32px]
                       border-t-2 border-x-2 border-[#E6D4B5] shadow-2xl z-50 p-6 sm:p-7
                       flex flex-col text-left max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Security & Privacy Promises"
          >
            {/* Drag Handle & Close */}
            <div className="flex items-center justify-between relative mb-4">
              <div className="w-12 h-1.5 rounded-full bg-[#D9C4A3] mx-auto absolute left-1/2 -translate-x-1/2 -top-2" />
              <div className="w-full text-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#9C7E63]">
                  Our Promise to You
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-[#FFF5E0] border border-[#E6D4B5] text-[#5C3717]
                           flex items-center justify-center hover:bg-[#FBE7BD] active:scale-95 transition-all cursor-pointer absolute right-0 top-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Pillars List */}
            <div className="space-y-4 my-2">
              {/* Pillar 1 */}
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-white border border-[#E6D4B5] shadow-2xs">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="bhalyam-display text-[16px] font-extrabold text-[#4A2508] leading-tight">
                    Secure &amp; Private
                  </h4>
                  <p className="text-[13px] text-[#7A5B3E] font-medium mt-0.5 leading-snug">
                    Your data stays yours. We never sell or share it with third parties.
                  </p>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-white border border-[#E6D4B5] shadow-2xs">
                <div className="w-11 h-11 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center flex-shrink-0">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="bhalyam-display text-[16px] font-extrabold text-[#4A2508] leading-tight">
                    No Spam
                  </h4>
                  <p className="text-[13px] text-[#7A5B3E] font-medium mt-0.5 leading-snug">
                    We respect your space. No marketing junk, popups, or annoying pings, ever.
                  </p>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-white border border-[#E6D4B5] shadow-2xs">
                <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="bhalyam-display text-[16px] font-extrabold text-[#4A2508] leading-tight">
                    Your Gang, Your Way
                  </h4>
                  <p className="text-[13px] text-[#7A5B3E] font-medium mt-0.5 leading-snug">
                    Built for real friendships, pure nostalgia, and genuine 90s fun.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Kids & Paper Plane Illustration */}
            <div className="mt-4 pt-3 border-t border-[#E6D4B5] flex flex-col items-center justify-center text-center">
              <div className="relative w-48 h-20 flex items-center justify-center">
                {/* Paper plane doodle top right */}
                <svg className="absolute -top-1 right-2 w-8 h-8 text-[#E85D04] -rotate-12 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>

                {/* 4 nostalgic cartoon kids sitting shoulder-to-shoulder */}
                <div className="flex items-end justify-center -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-[#FF8F00] border-2 border-white flex items-center justify-center text-lg shadow-sm">
                    👦
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#10B981] border-2 border-white flex items-center justify-center text-xl shadow-sm z-10">
                    👧
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#3B82F6] border-2 border-white flex items-center justify-center text-xl shadow-sm z-10">
                    👦
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#8B5CF6] border-2 border-white flex items-center justify-center text-lg shadow-sm">
                    🧒
                  </div>
                </div>
              </div>
              <p className="bhalyam-script text-[17px] font-bold text-[#E85D04] mt-1">
                Friendships that started in the 90s stay forever.
              </p>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-full bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04]
                         text-[#4A2508] font-extrabold text-[14px] shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            >
              Got it!
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
