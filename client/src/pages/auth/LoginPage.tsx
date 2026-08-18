import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, Heart, ArrowRight } from "lucide-react";
import AuthShell from "../../components/auth/AuthShell";
import { useSignIn } from "../../components/auth/useAccountAuth";
import { FormNotice } from "../../components/auth/AuthControls";
import { validateEmail, validatePasswordPresent, type FieldError } from "../../lib/authValidation";
import { AppleMark, GoogleMark } from "../../components/auth/authIcons";
import AuthTrustSheet from "../../components/auth/AuthTrustSheet";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showTrustSheet, setShowTrustSheet] = useState(false);

  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, error, configured, submit, withGoogle, clearError } = useSignIn();

  /**
   * Apple is the one provider that is genuinely out of reach: it needs a paid
   * developer account, which this project does not have. Kept as its own
   * state rather than folded into `error`, because "we can't offer this" is a
   * different thing from "your sign-in failed".
   */
  const [appleUnavailable, setAppleUnavailable] = useState(false);

  function clearNotices() {
    if (error) clearError();
    if (appleUnavailable) setAppleUnavailable(false);
  }

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
    <AuthShell heroType="login">
      <div className="space-y-3">
        
        {/* Floating White Card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#F2E3C6] rounded-[28px] p-5 sm:p-6 lg:p-7 shadow-xl shadow-amber-900/10 text-left space-y-4 relative">
          
          {/* Card Header */}
          <div className="text-center">
            <h2 className="bhalyam-display text-[24px] sm:text-[27px] font-extrabold text-[#4A2508] tracking-tight flex items-center justify-center gap-1.5">
              <span>Welcome back!</span>
              <span className="text-[#E85D04]">✨</span>
            </h2>
            <p className="text-[12.5px] text-[#7A5B3E] font-medium mt-0.5">
              Sign in to open your room and pick up where you left off.
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#FFF5E0] border border-[#E6D4B5] rounded-full text-center">
            <button
              type="button"
              className="py-1.5 text-[12.5px] font-extrabold rounded-full bg-white text-[#4A2508] shadow-xs border border-[#F4C430] cursor-default"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="py-1.5 min-h-[24px] inline-flex items-center text-[12.5px] font-bold text-[#866C55] hover:text-[#5C3717] transition-colors cursor-pointer"
            >
              Continue as Guest
            </button>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-2 pt-0.5">
            <button
              type="button"
              onClick={withGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] active:scale-98 rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleMark className="w-4 h-4" />
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => setAppleUnavailable(true)}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] active:scale-98 rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs cursor-pointer"
            >
              <AppleMark className="w-[17px] h-[17px]" />
              <span>Continue with Apple</span>
            </button>
          </div>

          {error ? (
            <FormNotice tone="error" title="Couldn't sign you in">
              {error}
            </FormNotice>
          ) : appleUnavailable ? (
            <FormNotice tone="info" title="Apple sign-in isn't available">
              It needs a paid Apple developer account, which this app doesn&apos;t have.
              Google and email both work.
            </FormNotice>
          ) : !configured ? (
            <FormNotice tone="info" title="This build has no account service">
              Signing in here only unlocks hosting on this device — no password is
              checked and nothing is sent anywhere. Set the Supabase keys to make it
              real.
            </FormNotice>
          ) : null}

          {/* Divider */}
          <div className="flex items-center gap-3 py-0.5">
            <span className="h-px flex-1 bg-[#E6D4B5]" />
            <span className="shrink-0 whitespace-nowrap text-[10.5px] font-extrabold text-[#9C7E63] uppercase tracking-wider">
              or sign in with email
            </span>
            <span className="h-px flex-1 bg-[#E6D4B5]" />
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Email Input */}
            <div>
              <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    clearNotices();
                  }}
                  placeholder="you@example.com"
                  className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-4 py-2.5 text-[13.5px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                    emailError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                  }`}
                  required
                />
              </div>
              {emailError && (
                <span className="text-[11px] font-bold text-[#E11D48] mt-1 block">
                  {emailError}
                </span>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-extrabold text-[#4A2508]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11.5px] font-extrabold text-[#E85D04] hover:underline min-h-[24px] inline-flex items-center"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    clearNotices();
                  }}
                  placeholder="Enter your password"
                  className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-10 py-2.5 text-[13.5px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                    passwordError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#9C7E63] hover:text-[#4A2508] cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <span className="text-[11px] font-bold text-[#E11D48] mt-1 block">
                  {passwordError}
                </span>
              )}
            </div>

            {/* Options Row: Checkbox */}
            <div className="flex items-center gap-2 pt-0.5 min-h-[44px]">
              <input
                type="checkbox"
                id="keepSignedIn"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 shrink-0 rounded border-[#D9C4A3] text-[#E85D04] focus:ring-[#F4C430] accent-[#E85D04] cursor-pointer"
              />
              <label htmlFor="keepSignedIn" className="text-[11.5px] font-bold text-[#5C3717] select-none cursor-pointer min-h-[44px] inline-flex items-center">
                Keep me signed in on this device
              </label>
            </div>

            {/* Primary CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04] hover:from-[#F4C430] hover:to-[#D45000] text-[#4A2508] font-extrabold py-3 rounded-full text-[14.5px] shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mt-1.5 cursor-pointer"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          {/* Footer Text */}
          <div className="text-center pt-2 border-t border-[#F2E3C6]">
            <span className="text-[12px] text-[#7A5B3E] font-medium">
              New to BHALYAM?{" "}
            </span>
            <Link to="/signup" className="text-[12px] font-extrabold text-[#E85D04] hover:underline min-h-[24px] inline-flex items-center">
              Create an account
            </Link>
          </div>

        </div>

        {/* Below Card Badges Row (Clickable to trigger Trust & Safety Sheet) */}
        <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-[#8C6D4F] pt-0.5">
          <button
            type="button"
            onClick={() => setShowTrustSheet(true)}
            className="flex items-center gap-1 min-h-[24px] hover:text-[#E85D04] transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#E85D04]" />
            <span>Secure</span>
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setShowTrustSheet(true)}
            className="flex items-center gap-1 min-h-[24px] hover:text-[#E85D04] transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Lightweight</span>
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setShowTrustSheet(true)}
            className="flex items-center gap-1 min-h-[24px] hover:text-[#E85D04] transition cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
            <span>Made for You</span>
          </button>
        </div>

      </div>

      {/* Trust & Safety Bottom Sheet */}
      <AuthTrustSheet open={showTrustSheet} onClose={() => setShowTrustSheet(false)} />
    </AuthShell>
  );
}
