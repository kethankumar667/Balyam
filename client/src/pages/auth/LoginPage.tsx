import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { useLocalSignIn } from "../../components/auth/useLocalSignIn";
import { FormNotice } from "../../components/auth/AuthControls";
import { validateEmail, validatePasswordPresent, type FieldError } from "../../lib/authValidation";
import { AppleMark, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "../../components/auth/authIcons";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, unavailable, submit, markUnavailable, reset } = useLocalSignIn();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextEmail = validateEmail(email);
    const nextPassword = validatePasswordPresent(password);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextEmail || nextPassword) {
      return;
    }
    submit(email);
  }

  return (
    <AuthShell heroType="login">
      <div className="space-y-3.5">
        
        {/* Floating White Card */}
        <div className="bg-white border border-[#F2E3C6] rounded-[28px] p-5 sm:p-6 lg:p-7 shadow-xl shadow-amber-900/10 text-left space-y-4 relative">
          
          {/* Card Header */}
          <div className="text-center">
            <h2 className="bhalyam-display text-[24px] sm:text-[27px] font-extrabold text-[#4A2508] tracking-tight">
              Welcome back, friend! ✨
            </h2>
            <p className="text-[12.5px] text-[#7A5B3E] font-medium mt-0.5">
              Sign in to open your room and pick up where your table left off.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#FFF5E0] border border-[#E6D4B5] rounded-full text-center">
            <button
              type="button"
              className="py-1.5 text-[12.5px] font-extrabold rounded-full bg-white text-[#4A2508] shadow-xs border border-[#F4C430]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="py-1.5 text-[12.5px] font-bold text-[#9C7E63] hover:text-[#5C3717] transition-colors"
            >
              Continue as Guest
            </button>
          </div>

          {/* Social Sign In Buttons. These stay honestly dead: a provider
              sign-in needs OAuth client credentials that are not configured,
              and quietly signing someone in "with Google" without ever
              contacting Google would be the one lie on this page. */}
          <div className="space-y-2 pt-0.5">
            <button
              type="button"
              onClick={markUnavailable}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={markUnavailable}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs"
            >
              <AppleMark className="w-[17px] h-[17px]" />
              <span>Continue with Apple</span>
            </button>
          </div>

          {unavailable ? (
            <FormNotice tone="info" title="Provider sign-in isn't connected yet">
              Google and Apple need OAuth credentials this build doesn&apos;t have. Use your
              email below — it works today.
            </FormNotice>
          ) : null}

          {/* Divider. The label is `shrink-0` and the rules `flex-1`: the
              previous version let a full-width rule squeeze the label, which
              wrapped "OR SIGN IN WITH EMAIL" onto two lines against the right
              edge instead of centring it. */}
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
                <MailIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9C7E63] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (unavailable) reset();
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
                  className="text-[11.5px] font-extrabold text-[#E85D04] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9C7E63] pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (unavailable) reset();
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9C7E63] hover:text-[#4A2508]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-[17px] h-[17px]" />
                  ) : (
                    <EyeIcon className="w-[17px] h-[17px]" />
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
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="keepSignedIn"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded border-[#D9C4A3] text-[#E85D04] focus:ring-[#F4C430] accent-[#E85D04]"
              />
              <label htmlFor="keepSignedIn" className="text-[11.5px] font-bold text-[#5C3717] select-none cursor-pointer">
                Keep me signed in on this device
              </label>
            </div>

            {/* Primary CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04] hover:from-[#F4C430] hover:to-[#D45000] text-[#4A2508] font-extrabold py-2.5 rounded-full text-[14.5px] shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mt-1.5"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <span>→</span>
            </button>

          </form>

          {/* Footer Text */}
          <div className="text-center pt-2 border-t border-[#F2E3C6]">
            <span className="text-[12px] text-[#7A5B3E] font-medium">
              New to BHALYAM?{" "}
            </span>
            <Link to="/signup" className="text-[12px] font-extrabold text-[#E85D04] hover:underline">
              Create an account
            </Link>
          </div>

        </div>

        {/* Below Card Badges Row */}
        <div className="flex items-center justify-center gap-3.5 text-[11px] font-bold text-[#8C6D4F] pt-0.5">
          <span className="flex items-center gap-1">🛡️ Secure</span>
          <span>·</span>
          <span className="flex items-center gap-1">⚡ Lightweight</span>
          <span>·</span>
          <span className="flex items-center gap-1">❤️ Made for You</span>
        </div>

      </div>
    </AuthShell>
  );
}
