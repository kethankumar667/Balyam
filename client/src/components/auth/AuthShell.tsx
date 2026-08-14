import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "./authIcons";

export interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  heroType?: "login" | "signup";
  backTo?: string;
  backLabel?: string;
}

export default function AuthShell({
  children,
  title,
  subtitle,
  footer,
  heroType = "login",
  backTo = "/",
  backLabel = "Back to games",
}: AuthShellProps) {
  const isLogin = heroType === "login";

  return (
    <div
      className={`min-h-screen lg:h-screen w-full font-sans text-[#5C3717] flex flex-col justify-between overflow-y-auto lg:overflow-hidden relative bg-[#FAF3E0] ${
        isLogin
          ? "bg-[url('/LoginBG.png')] bg-cover bg-center bg-no-repeat"
          : "bg-[url('/SignupBG.png')] bg-cover bg-center bg-no-repeat"
      }`}
    >
      {/* Decorative SVG Doodles Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        {/* Paper Airplane top left */}
        <svg className="absolute top-16 left-[22%] w-10 h-10 text-[#E85D04] -rotate-12 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        {/* Tic-tac-toe top center */}
        <svg className="absolute top-8 left-[48%] w-9 h-9 text-[#7A5B3E] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 9h16M4 15h16M9 4v16M15 4v16" />
        </svg>
        {/* Star Sparkle near hero heading */}
        <svg className="absolute top-36 left-[8%] w-7 h-7 text-[#F4C430] rotate-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
        </svg>
        {/* Cloud top right */}
        <svg className="absolute top-12 right-[12%] w-14 h-10 text-[#A7F3D0] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h10a5 5 0 001-9.9M7 15a4.5 4.5 0 018.5-2M7 15H6a3 3 0 010-6h.5" />
        </svg>
      </div>

      {/* Header Bar */}
      <header className="max-w-[1380px] w-full mx-auto px-4 sm:px-8 pt-3 sm:pt-5 flex items-center justify-between flex-shrink-0 z-30 relative">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/FooterBhalyamlogo.png"
            alt="BHALYAM - Play Together. Remember Forever."
            className="w-40 sm:w-48 h-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#5C3717] hover:text-[#E85D04] transition-colors bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-[#E6D4B5] shadow-2xs -mt-[60px]"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-8 py-1 sm:py-2 flex-1 flex items-center justify-center min-h-0 z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col justify-center h-full text-left">
            {isLogin ? (
              <div className="space-y-3 max-w-[460px] lg:-mt-40 xl:-mt-48">
                <div>
                  <h1 className="bhalyam-display text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-[#4A2508] leading-[1.1] tracking-tight">
                    Your 90&apos;s Games, <br />
                    <span className="text-[#E85D04]">Now in One Place!</span>
                  </h1>
                  <p className="text-[13px] sm:text-[14.5px] font-medium text-[#7A5B3E] mt-1.5 leading-snug">
                    Old-school fun. Modern multiplayer. <br />
                    All your childhood games, together.
                  </p>
                  <div className="mt-2.5">
                    <p className="bhalyam-script text-[18px] sm:text-[21px] font-bold text-[#2563EB] leading-[1.25]">
                      “Some friendships
                    </p>
                    <div className="relative inline-block pl-5">
                      <p className="bhalyam-script text-[18px] sm:text-[21px] font-bold text-[#2563EB] leading-[1.25]">
                        just need a room code.
                        <span className="text-[#E85D04] ml-1">♡”</span>
                      </p>
                      {/* Orange Doodle Underline for line 2 */}
                      <svg className="absolute left-5 -bottom-1 w-[90%] h-2 text-[#E85D04] opacity-85" viewBox="0 0 200 8" fill="none">
                        <path d="M2 6C50 2 150 2 198 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 4 Feature Badges List (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-2.5 max-w-[460px] pt-1">
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-xs font-bold flex-shrink-0 text-[#4338CA]">
                      👥
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Your school gang</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Play together again</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-xs font-bold flex-shrink-0 text-[#D97706]">
                      🏠
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Your own adda</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Create a private room</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-xl bg-[#D1FAE5] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold flex-shrink-0 text-[#059669]">
                      🤖
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Play when away</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Smart bots included</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl p-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-xl bg-[#F3E8FF] border border-[#DDD6FE] flex items-center justify-center text-xs font-bold flex-shrink-0 text-[#7C3AED]">
                      💜
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">No distractions</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Just games &amp; memories</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-w-[460px] lg:-mt-52 xl:-mt-64 ml-20">
                <div>
                  <div className="inline-block bg-[#FFE8B3] border-2 border-[#F4C430] rounded-2xl px-3 py-0.5 mb-1.5 shadow-xs">
                    <h1 className="bhalyam-display text-[25px] sm:text-[30px] lg:text-[34px] font-extrabold text-[#4A2508] leading-tight flex items-center gap-2">
                      <span>Join the Gang!</span>
                      <span className="text-[#E85D04]">⚡</span>
                    </h1>
                  </div>
                  <p className="text-[13px] sm:text-[14px] font-medium text-[#7A5B3E] mt-1 leading-snug">
                    Create your account and get <span className="text-[#E85D04] font-extrabold">your own table</span> in the lounge.
                  </p>
                </div>

                {/* 4 Feature Badges List (Vertical Stack matching mockup) */}
                <div className="space-y-2 max-w-[400px] pt-0.5">
                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3 py-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-full bg-[#FFF0D6] border border-[#FCDDB5] text-[#E85D04] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      👤
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Save your name &amp; avatar</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Be known to your friends</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3 py-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-full bg-[#E6F4EA] border border-[#A7F3D0] text-[#137333] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      🟢
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Track your favourite rooms</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Never lose your adda</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3 py-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-full bg-[#FFF5E6] border border-[#FCDDB5] text-[#D97706] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      🏆
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Earn badges &amp; milestones</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Play more, unlock more</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-[#E6D4B5] rounded-2xl px-3 py-2 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="w-7 h-7 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      📱
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#4A2508] leading-tight">Play across all devices</p>
                      <p className="text-[10px] font-medium text-[#7A5B3E]">Your games, anytime anywhere</p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Right Form Card Column */}
          <div className="lg:col-span-5 w-full max-w-[480px] ml-auto mr-0 lg:-mr-2 xl:-mr-8 lg:-mt-[40px] xl:-mt-[32px]">
            {title ? (
              <div className="bg-white/95 backdrop-blur-md border-2 border-[#F2E3C6] rounded-[24px] p-4 sm:p-5.5 shadow-2xl text-left space-y-3 relative">
                <div className="text-center">
                  <h2 className="bhalyam-display text-[21px] sm:text-[24px] font-extrabold text-[#4A2508] tracking-tight flex items-center justify-center gap-2">
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
    </div>
  );
}
