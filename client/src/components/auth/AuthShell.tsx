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
    <div
      className={`min-h-screen min-h-[100dvh] w-full font-sans text-[#5C3717] flex flex-col justify-between overflow-x-hidden relative bg-[#FAF3E0] ${
        isLogin
          ? "bg-[url('/LoginBG.png')] bg-cover bg-center bg-no-repeat"
          : "bg-[url('/SignupBG.png')] bg-cover bg-center bg-no-repeat"
      }`}
    >
      {/* Decorative SVG Doodles Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-35">
        {/* Paper Airplane top left */}
        <svg className="absolute top-16 left-[18%] w-10 h-10 text-[#E85D04] -rotate-12 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        {/* Tic-tac-toe */}
        <svg className="absolute top-8 left-[45%] w-9 h-9 text-[#7A5B3E] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 9h16M4 15h16M9 4v16M15 4v16" />
        </svg>
        {/* Star Sparkle */}
        <svg className="absolute top-36 left-[6%] w-7 h-7 text-[#F4C430] rotate-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
        </svg>
      </div>

      {/* Top Header Bar */}
      <header className="max-w-[1380px] w-full mx-auto px-4 sm:px-8 pt-3 sm:pt-4 flex items-center justify-between flex-shrink-0 z-30 relative">
        <div className="flex items-center gap-3">
          {onBackStep ? (
            <button
              type="button"
              onClick={onBackStep}
              aria-label="Back"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 border border-[#E6D4B5] text-[#5C3717] hover:bg-white active:scale-95 transition shadow-2xs cursor-pointer"
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
        <div className="flex items-center gap-2.5">
          <AuthLangToggle />

          <Link
            to={backTo}
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#5C3717] hover:text-[#E85D04] transition-colors bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-[#E6D4B5] shadow-2xs hover:bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </header>

      {/* Main Content Grid */}
      {/*
        `my-auto` on the child, not `items-center` on the parent.

        Centering a flex child that is TALLER than its line overflows in both
        directions, and the half that goes above the line cannot be scrolled to
        — flexbox has no way back to it. At 667x375 landscape that put the
        "Sign In", "Continue as Guest" and "Continue with Google" buttons at
        y = -25 with `document.scrollHeight === innerHeight`, so signing in was
        impossible on a phone held sideways. Measured, then reproduced with a
        direct click that Playwright reported as intercepted by the header.

        `my-auto` centres while there is room and collapses to zero when there
        is not, so the content stays inside the scrollable box either way.
        `overflow-y-auto` then makes the overflow reachable.
      */}
      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-8 py-3 sm:py-6 flex-1 flex justify-center min-h-0 overflow-y-auto z-10">
        <div className="w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* Left Hero Column (Matches UX Screens 1 & 4) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center h-full text-left">
            {isLogin ? (
              /* Screen 1: Login Hero */
              <div className="space-y-4 max-w-[480px]">
                <div>
                  <h1 className="bhalyam-display text-[32px] xl:text-[38px] font-extrabold text-[#4A2508] leading-[1.15] tracking-tight">
                    Your 90&apos;s Games, <br />
                    <span className="text-[#E85D04]">Now in One Place!</span>
                  </h1>
                  <p className="text-[14px] font-medium text-[#7A5B3E] mt-1.5 leading-snug">
                    Old-school fun. Modern multiplayer. <br />
                    All your childhood games, together.
                  </p>
                </div>

                {/* 4 Feature Badges matching UX Screen 1 */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#FFF0D6] border border-[#FCDDB5] text-[#E85D04] flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[12.5px] font-extrabold text-[#4A2508] leading-tight">
                      Play with Friends
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center flex-shrink-0">
                      <DoorOpen className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[12.5px] font-extrabold text-[#4A2508] leading-tight">
                      Create Private Rooms
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[12.5px] font-extrabold text-[#4A2508] leading-tight">
                      Play with Smart Bots
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] border border-[#DDD6FE] text-[#9333EA] flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[12.5px] font-extrabold text-[#4A2508] leading-tight">
                      No Ads. Just Pure Fun
                    </span>
                  </div>
                </div>

                {/* Nostalgic childhood artwork quote container */}
                <div className="pt-2">
                  <div className="rounded-3xl p-4 bg-gradient-to-br from-[#FFF8E7] to-[#FBE7BD] border border-[#E0AE3B] shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎲</span>
                      <div>
                        <p className="bhalyam-script text-[19px] font-bold text-[#E85D04] leading-tight">
                          “Remember fighting for the red token?”
                        </p>
                        <p className="text-[11.5px] text-[#7A5B3E] font-medium mt-0.5">
                          Pick up right where childhood left off.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Screen 4: Sign Up Hero */
              <div className="space-y-4 max-w-[480px]">
                <div>
                  <h1 className="bhalyam-display text-[32px] xl:text-[38px] font-extrabold text-[#4A2508] leading-[1.15] tracking-tight flex items-center gap-2">
                    <span>Join the Gang!</span>
                    <span className="text-[#E85D04]">✨</span>
                  </h1>
                  <p className="text-[14px] font-medium text-[#7A5B3E] mt-1.5 leading-snug">
                    Create your account and get your own table in the lounge.
                  </p>
                </div>

                {/* 4 Feature Badges matching UX Screen 4 */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3.5 py-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-[#FFF0D6] border border-[#FCDDB5] text-[#E85D04] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-extrabold text-[#4A2508]">
                      Save your name &amp; avatar
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3.5 py-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center flex-shrink-0">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-extrabold text-[#4A2508]">
                      Track your favourite rooms
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3.5 py-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-extrabold text-[#4A2508]">
                      Earn badges &amp; milestones
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3.5 py-2.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-extrabold text-[#4A2508]">
                      Play across all devices
                    </span>
                  </div>
                </div>

                {/* Nostalgic quote and Carousel Pagination Dots */}
                <div className="pt-2 text-left space-y-2">
                  <p className="bhalyam-script text-[19px] font-bold text-[#E85D04] leading-snug">
                    “Not just games... It&apos;s where friendships find their <strong className="underline">next innings!</strong>”
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="w-2 h-2 rounded-full bg-[#E6D4B5]" />
                    <span className="w-5 h-2 rounded-full bg-[#E85D04]" />
                    <span className="w-2 h-2 rounded-full bg-[#E6D4B5]" />
                    <span className="w-2 h-2 rounded-full bg-[#E6D4B5]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Form Card Column */}
          <div className="lg:col-span-5 w-full max-w-[480px] mx-auto lg:ml-auto lg:mr-0">
            {title ? (
              <div className="bg-white/95 backdrop-blur-md border border-[#F2E3C6] rounded-[28px] p-5 sm:p-6 lg:p-7 shadow-xl shadow-amber-900/10 text-left space-y-3 relative">
                <div className="text-center">
                  <h2 className="bhalyam-display text-[22px] sm:text-[25px] font-extrabold text-[#4A2508] tracking-tight flex items-center justify-center gap-1.5">
                    <span>{title}</span>
                    <span className="text-[#E85D04]">✨</span>
                  </h2>
                  {subtitle && (
                    <p className="text-[12px] text-[#7A5B3E] font-medium mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
                {children}
                {footer && <div className="mt-2.5 text-center">{footer}</div>}
              </div>
            ) : (
              children
            )}
          </div>

        </div>
      </main>

      {/* Footer minimal spacer */}
      <footer className="w-full py-2" />
    </div>
  );
}
