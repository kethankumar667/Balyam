import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2, DoorOpen, Bot, Sparkles, User, Bookmark, Trophy, Smartphone } from "lucide-react";
import AuthLangToggle from "./AuthLangToggle";

export interface AuthShellProps {
  children: React.ReactNode;
  heroType?: "login" | "signup";
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  currentStep?: number;
  onBackStep?: () => void;
}

export default function AuthShell({
  children,
  heroType = "login",
  title,
  subtitle,
  footer,
  backTo = "/",
  backLabel = "Back to games",
  currentStep,
  onBackStep,
}: AuthShellProps) {
  const isLogin = heroType === "login";

  return (
    <div className="auth-page-shell h-screen max-h-[100dvh] w-full font-sans text-[#5C3717] flex flex-col justify-between overflow-hidden relative bg-[#FAE6CA]">
      {/* Background Image Layer: Full on mobile (< lg), exactly 54% of screen on desktop (lg:w-[54%]), positioned left-aligned */}
      <div
        className={`absolute inset-y-0 left-0 w-full lg:w-[54%] bg-cover bg-[position:15%_center] lg:bg-[position:15%_center] bg-no-repeat pointer-events-none z-0 lg:border-r lg:border-[#E6D4B5]/50 ${
          isLogin
            ? "bg-[url('/LoginBG.png')]"
            : "bg-[url('/SignupBG.png')]"
        }`}
      />

      {/* Decorative SVG Doodles Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-25">
        {/* Paper Airplane top left */}
        <svg className="absolute top-12 left-[18%] w-9 h-9 text-[#E85D04] -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        {/* Tic-tac-toe */}
        <svg className="absolute top-6 left-[45%] w-8 h-8 text-[#7A5B3E] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 9h16M4 15h16M9 4v16M15 4v16" />
        </svg>
        {/* Star Sparkle */}
        <svg className="absolute top-28 left-[6%] w-6 h-6 text-[#F4C430] rotate-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
        </svg>
      </div>

      {/* Top Header Bar */}
      <header className="max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-2 sm:py-3 flex items-center justify-between flex-shrink-0 z-30 relative">
        <div className="flex items-center gap-3">
          {onBackStep ? (
            <button
              type="button"
              onClick={onBackStep}
              aria-label="Back to previous step"
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/90 border border-[#E6D4B5] text-[#5C3717] hover:bg-white active:scale-95 transition shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}

          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/FooterBhalyamlogo.png"
              alt="BHALYAM - Play Together. Remember Forever."
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Right Controls: Language Dropdown + Back button */}
        <div className="flex items-center gap-2">
          <AuthLangToggle />

          <Link
            to={backTo}
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold text-[#5C3717] hover:text-[#E85D04] transition-colors bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-[#E6D4B5] shadow-2xs hover:bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </header>

      {/* Main Content (54% / 46% split on desktop, zero page scroll on standard screens) */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-1 sm:py-2 flex-1 flex items-center justify-center min-h-0 overflow-y-auto lg:overflow-y-auto z-10">
        <div className="w-full my-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          
          {/* Left Column: 54% clean illustration area */}
          <div className="hidden lg:block lg:w-[54%] flex-shrink-0 h-full pointer-events-none" />

          {/* Right Onboarding Panel: 46% dedicated area */}
          <div className="w-full lg:w-[46%] max-w-[540px] mx-auto flex flex-col justify-center text-left space-y-2 px-1 sm:px-3">
            {title ? (
              <div className="space-y-0.5">
                <h1 className="text-[22px] sm:text-[26px] font-black text-[#111827] tracking-tight flex items-center gap-2">
                  <span>{title}</span>
                  <span className="text-xl">👋</span>
                </h1>
                {subtitle && (
                  <p className="text-[12px] sm:text-[13px] text-[#5C3717] font-medium leading-tight">
                    {subtitle}
                  </p>
                )}
              </div>
            ) : null}

            <div className="w-full">{children}</div>

            {footer && <div className="mt-1 text-center">{footer}</div>}

            {/* Bottom Copyright */}
            <div className="text-center text-[11px] font-semibold text-[#8C6D4F]/80 tracking-wide pt-1">
              © 2026 Bhalyam · Made for the kids we were
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Bottom Anchor */}
      <div className="w-full h-1" />
    </div>
  );
}
