import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowLeft, ArrowRight, User } from "lucide-react";
import { useSignIn } from "../../components/auth/useAccountAuth";
import { FormNotice } from "../../components/auth/AuthControls";
import {
  validateEmail,
  validatePasswordPresent,
  type FieldError,
} from "../../lib/authValidation";
import { GoogleMark } from "../../components/auth/authIcons";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, error, configured, submit, withGoogle, clearError } =
    useSignIn();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextEmail = validateEmail(email);
    const nextPassword = validatePasswordPresent(password);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextEmail || nextPassword) {
      return;
    }
    submit(email, password);
  }

  return (
    <div className="relative min-h-screen w-full bg-[#FAF6EE] text-[#2E2419] flex flex-col lg:flex-row overflow-x-hidden selection:bg-amber-200 font-sans">
      {/* Top Lounge Navigation Floating Chip */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-40">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAD7B8]/80 hover:bg-[#E2CEAD] border border-[#D8C2A0] text-[#5C3E21] text-xs font-bold shadow-xs backdrop-blur-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Lounge</span>
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════
          LEFT FULL-SCREEN PAGE: NOSTALGIC SCHOOL PLAYGROUND SPREAD
         ════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[48%] lg:min-h-screen relative flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden lg:border-r-2 border-[#E0CCAC]">
        {/* Full nostalgic background artwork: 5 boys sitting on stone ledge overlooking playground */}
        <img
          src="/SignuppageBG.png"
          alt="Nostalgic School Playground and Friends"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Soft morning ambient wash overlay for legibility. Explicit stops
            (not the default 0/50/100 from-via-to split) so the light wash
            stays strong through the whole branding text block — sticky
            note, logo, AND all three tagline lines — instead of fading to
            transparent by ~25% down and leaving dark text to fight the busy
            photo for contrast. Fully clears by the collage's midpoint so
            the playground scene still reads clearly, then a dark scrim
            settles in toward the bottom. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,253,245,0.94)_0%,rgba(255,253,245,0.8)_24%,rgba(255,253,245,0.38)_40%,rgba(255,253,245,0)_54%,rgba(28,18,8,0.42)_100%)] pointer-events-none" />

        {/* Spiral Wire Binding Seam along right edge on desktop */}
        <div className="hidden lg:flex absolute top-0 bottom-0 -right-3.5 w-7 flex-col justify-between py-6 z-30 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-7 h-3 rounded-full bg-gradient-to-r from-[#2A1D13] via-[#8C6D4F] to-[#2A1D13] border border-[#D8C2A0] shadow-[0_2px_4px_rgba(0,0,0,0.45)] transform -rotate-6" />
            </div>
          ))}
        </div>

        {/* Top Left Floating Sticky Note */}
        <div className="relative z-20 pt-8 sm:pt-4">
          <div className="inline-block bg-[#FBF0B5] px-3.5 py-2 rounded-md border border-[#E6DC9E] shadow-sm -rotate-4 mb-4">
            <div className="w-8 h-2.5 bg-[#E0D48A]/80 absolute -top-1 left-1/2 -translate-x-1/2 shadow-2xs" />
            <span className="font-script text-[13px] sm:text-[14px] font-bold text-[#4A3816] leading-tight block">
              Back to the good old days! ⭐️
            </span>
          </div>

          {/* Logo & Brand Sticker */}
          <div className="flex items-center gap-2 text-amber-600">
            <span className="font-script text-[80px] sm:text-[80px] ml-8 font-black text-[#112233] leading-none tracking-tight font-weight-bold">
              Bhalyam
            </span>
          </div>
          <div className="font-script text-[18px] sm:text-[22px] font-bold text-[#A82020] ml-[220px] leading-snug tracking-tight select-none pointer-events-none">
            — Blast from the past —
          </div>
          {/* Tagline Box */}
          {/* <div className="space-y-1 pt-3 max-w-[380px] ml-[280px]">
            <div className="flex items-start gap-1.5 text-[#1E293B]">
              <div className="font-script text-[20px] sm:text-[23px] font-bold text-[#1E293B] leading-snug">
                <div>Relive the games.</div>
                <div>Reconnect with friends.</div>
                <div>Create new memories. ♡</div>
              </div>
            </div>
          </div> */}
        </div>

        {/* Paper Plane Doodle in Top Right */}
        <div className="absolute top-10 right-8 z-20 pointer-events-none hidden sm:block opacity-85">
          <svg
            viewBox="0 0 100 80"
            className="w-16 h-12 text-[#3E2B1E]"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M10 40 L85 15 L50 70 L40 45 Z"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path d="M40 45 L85 15" strokeWidth="2" />
            <path
              d="M90 35 C95 45, 80 60, 65 62"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>
        </div>

        {/* Bottom Spacer to let the nostalgic illustration breathe */}
        <div className="relative z-20 pt-16 select-none pointer-events-none" />
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT FULL-SCREEN PAGE: SPIRAL NOTEBOOK LOGIN FORM
         ════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[52%] xl:w-[52%] min-h-screen bg-[#FAF6EE] flex flex-col items-center p-6 sm:p-10 lg:p-12 xl:p-16 relative overflow-y-auto">
        {/* Top Right Taped Sticky Note */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 bg-[#FBF0B5] px-3.5 py-2.5 rounded-md border border-[#E6DC9E] shadow-sm rotate-2 z-20 max-w-[200px] text-right pointer-events-none hidden sm:block">
          <div className="w-10 h-3 bg-[#E0D48A]/80 absolute -top-1.5 left-1/2 -translate-x-1/2 shadow-2xs" />
          <p className="font-script text-[12px] text-[#4A3816] font-bold leading-tight">
            Made for 90&apos;s kids with timeless memories ⭐️
          </p>
        </div>

        {/* Vertically centers as ONE block when there's room; degrades to a
            plain top-aligned, scrollable column when content is taller than
            the viewport (short mobile screens) — margin:auto resolves to 0
            under overflow instead of centering the overflow itself, which
            would strand content above scrollTop:0 where it can't be reached. */}
        <div className="my-auto w-full">
          {/* Bhalyam Logo */}
          <div className="flex justify-center -mt-6 pb-2">
            <img
              src="/FooterBhalyamlogo.png"
              alt="BHALYAM - Play Together. Remember Forever."
              className="h-24 sm:h-28 w-auto object-contain"
            />
          </div>

          {/* Top Header */}
          <div className="text-center space-y-1.5 max-w-[460px] mx-auto w-full">
            <div className="flex items-center justify-center gap-2">
              <span className="font-script text-[#0F172A] text-2xl font-bold tracking-widest">
                ≡
              </span>
              <h1 className="font-script text-[36px] sm:text-[46px] font-black text-[#0F172A] leading-none tracking-tight">
                Welcome Back!{' '}
              </h1>
              <span className="font-script text-[#0F172A] text-2xl font-bold tracking-widest">
                ≡
              </span>
            </div>
            <p className="text-[13px] sm:text-[14px] text-[#5C4A32] font-medium pt-1 leading-relaxed max-w-[380px] mx-auto">
              Log in to continue your nostalgic journey and play your favorite
              games ⭐️
            </p>
          </div>

          {/* ── LOGIN FORM CONTAINER ── */}
          <div className="py-4 max-w-[460px] mx-auto w-full">
            {/* Error / Demo Notice */}
            {error ? (
              <div className="mb-3">
                <FormNotice tone="error" title="Couldn't sign you in">
                  {error}
                </FormNotice>
              </div>
            ) : !configured ? (
              <div className="mb-3">
                <FormNotice tone="info" title="Offline Demo Mode">
                  Signing in here unlocks hosting locally on this device.
                </FormNotice>
              </div>
            ) : null}

            {/* noValidate: the browser's own "please fill out this field"
                popup otherwise intercepts submit before handleSubmit runs,
                so our styled red-text messages below never get a chance to
                show for an empty/malformed field — this hands ALL validation
                to handleSubmit so the custom messages always fire. */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
              {/* Email / Phone Field */}
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#64748B] pointer-events-none" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                      if (error) clearError();
                    }}
                    placeholder="Email or phone number"
                    className={`w-full bg-[#EEF2F6]/75 border rounded-full pl-11 pr-4 py-3.5 text-[14px] sm:text-[15px] font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all shadow-2xs ${
                      emailError ? "border-[#A82020]" : "border-[#CBD5E1]"
                    }`}
                    required
                  />
                </div>
                {emailError && (
                  <span className="text-[11px] font-bold text-[#A82020] block pl-3">
                    {emailError}
                  </span>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#64748B] pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                      if (error) clearError();
                    }}
                    placeholder="••••••••••••"
                    className={`w-full bg-[#EEF2F6]/75 border rounded-full pl-11 pr-11 py-3.5 text-[14px] sm:text-[15px] font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all shadow-2xs ${
                      passwordError ? "border-[#A82020]" : "border-[#CBD5E1]"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer transition"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <span className="text-[11px] font-bold text-[#A82020] block pl-3">
                    {passwordError}
                  </span>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1 px-1">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-[#5C3E21] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#0F172A] focus:ring-[#0F172A] accent-[#0F172A] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="font-script text-[15px] font-bold text-[#2563EB] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Primary Sign In Button: Dark Navy Log In */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0B1728] hover:bg-[#1E293B] text-white font-bold py-3.5 px-6 rounded-full text-[15px] shadow-sm hover:shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{loading ? "Logging in..." : "Log In"}</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>

              {/* Divider: or continue with */}
              <div className="flex items-center gap-3 my-3.5">
                <span className="h-px flex-1 bg-[#D8C2A0]/70" />
                <span className="text-[12px] font-semibold text-[#8C6D4F] whitespace-nowrap">
                  or continue with
                </span>
                <span className="h-px flex-1 bg-[#D8C2A0]/70" />
              </div>

              {/* Social Login Buttons: Google & Guest */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={withGoogle}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-full text-[13px] font-bold text-[#334155] transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <GoogleMark className="w-4 h-4" />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-full text-[13px] font-bold text-[#475569] transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <span>🎮 Guest</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Footer: Signup prompt & friends doodle */}
          <div className="pt-4 border-t border-[#D8C2A0]/60 space-y-2 max-w-[460px] mx-auto w-full">
            <div className="text-center text-[13px] sm:text-[14px] text-[#7A5B3E]">
              New to Bhalyam?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#A82020] underline ml-0.5 inline-flex items-center gap-1"
              >
                <span>Create an account</span>
                <span>→</span>
              </Link>
            </div>

            {/* Childhood Friends Pencil Sketch Illustration Banner */}
            <div className="flex items-center justify-center pt-1 text-[13.5px] font-script text-[#7A5B3E] font-bold select-none pointer-events-none">
              <span>⭐️ Best Friends Forever ⭐️</span>
            </div>
          </div>

          {/* Founder Section Asset */}
          <div className="flex justify-center pt-4 pb-2">
            <img
              src="/Foundersectionasset.png"
              alt="Bhalyam Founders"
              className="h-24 sm:h-28 w-auto object-contain opacity-90"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
