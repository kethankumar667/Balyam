import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";
import AuthShell from "../../components/auth/AuthShell";
import { useSignIn } from "../../components/auth/useAccountAuth";
import { FormNotice } from "../../components/auth/AuthControls";
import { validateEmail, validatePasswordPresent, type FieldError } from "../../lib/authValidation";
import { GoogleMark } from "../../components/auth/authIcons";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, error, configured, submit, withGoogle, clearError } = useSignIn();

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
    <AuthShell
      heroType="login"
      title="Welcome Back"
      subtitle="Today is a new day. It's your day. You shape it. Sign in to start playing games."
    >
      <div className="space-y-4 text-left">
        {error ? (
          <FormNotice tone="error" title="Couldn't sign you in">
            {error}
          </FormNotice>
        ) : !configured ? (
          <FormNotice tone="info" title="This build has no account service">
            Signing in here only unlocks hosting on this device — no password is
            checked and nothing is sent anywhere. Set the Supabase keys to make it
            real.
          </FormNotice>
        ) : null}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Input */}
          <div className="space-y-1">
            <label className="block text-[13px] font-semibold text-[#1E293B]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
                if (error) clearError();
              }}
              placeholder="Example@email.com"
              className={`w-full bg-white/90 border rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                emailError ? "border-[#E11D48]" : "border-[#E2E8F0]"
              }`}
              required
            />
            {emailError && (
              <span className="text-[11px] font-bold text-[#E11D48] mt-0.5 block">
                {emailError}
              </span>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block text-[13px] font-semibold text-[#1E293B]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                  if (error) clearError();
                }}
                placeholder="At least 8 characters"
                className={`w-full bg-white/90 border rounded-xl pl-4 pr-11 py-2.5 text-[14px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                  passwordError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] inline-flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <span className="text-[11px] font-bold text-[#E11D48] mt-0.5 block">
                {passwordError}
              </span>
            )}
            <div className="flex justify-end pt-0.5">
              <Link
                to="/forgot-password"
                className="text-[12px] font-semibold text-[#2563EB] hover:underline inline-flex items-center min-h-[44px]"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* Primary Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#162A3B] hover:bg-[#0E1E2B] text-white font-bold py-3.5 rounded-xl text-[15px] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-3">
          <span className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-xs font-medium text-[#94A3B8]">
            Or
          </span>
          <span className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        {/* Social Sign In Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={withGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white/90 hover:bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-semibold text-[#334155] transition-all shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleMark className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white/90 hover:bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-semibold text-[#334155] transition-all shadow-2xs cursor-pointer"
          >
            <span>🎮 Continue as Guest</span>
          </button>
        </div>

        {/* Footer Text */}
        <div className="text-center text-[13px] text-[#64748B] pt-2">
          Don&apos;t you have an account?{" "}
          <Link to="/signup" className="inline-flex items-center -my-3.5 py-3.5 font-bold text-[#2563EB] hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
