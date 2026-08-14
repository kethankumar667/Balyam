import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { usePreviewSubmit } from "../../components/auth/usePreviewSubmit";
import { validateEmail, validateName, validatePassword, type FieldError } from "../../lib/authValidation";
import { useRoomStore } from "../../store/roomStore";
import { AVATARS } from "../../lib/avatars";

const AVATAR_OPTIONS = AVATARS.slice(0, 6);

export default function SignUpPage() {
  const { playerName, setPlayerName } = useRoomStore();

  const [name, setName] = useState(playerName || "monica");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]?.id || "");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [nameError, setNameError] = useState<FieldError>(null);
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, done, submit, reset } = usePreviewSubmit();

  // Password rules helper
  const hasMinLength = password.length >= 8;
  const hasNumOrSymbol = /[0-9!@#$%^&*()]/.test(password);
  const hasLetters = /[a-zA-Z]/.test(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextName = validateName(name);
    const nextEmail = validateEmail(email);
    const nextPassword = validatePassword(password);
    setNameError(nextName);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextName || nextEmail || nextPassword) {
      return;
    }
    setPlayerName(name.trim());
    submit();
  }

  return (
    <AuthShell heroType="signup">
      <div className="space-y-3">
        
        {/* Floating White Card */}
        <div className="bg-white border border-[#F2E3C6] rounded-[28px] p-5 sm:p-6 lg:p-7 shadow-xl shadow-amber-900/10 text-left space-y-3.5 relative">
          
          {/* Card Header */}
          <div className="text-center">
            <h2 className="bhalyam-display text-[24px] sm:text-[27px] font-extrabold text-[#4A2508] tracking-tight">
              Create your account ✨
            </h2>
            <p className="text-[12px] text-[#7A5B3E] font-medium mt-0.5">
              Takes less than a minute — and a lifetime of memories.
            </p>
          </div>

          {/* Social Sign Up Buttons */}
          <div className="space-y-2 pt-0.5">
            <button
              type="button"
              onClick={submit}
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
              onClick={submit}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs"
            >
              <span className="text-base text-black">🍏</span>
              <span>Continue with Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="border-t border-[#E6D4B5] w-full" />
            <span className="bg-white px-3 text-[10.5px] font-extrabold text-[#9C7E63] uppercase tracking-wider relative z-10">
              or sign up with email
            </span>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            
            {/* Display Name Input */}
            <div>
              <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1">
                Display name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7E63] text-sm">
                  👤
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                    if (done) reset();
                  }}
                  placeholder="monica"
                  className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-10 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                    nameError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                  }`}
                  required
                />
                {name.trim().length >= 2 && !nameError && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#10B981] font-bold text-sm">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#7A5B3E] font-medium mt-0.5 block">
                This is what your friends will see at the table.
              </span>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7E63] text-sm">
                  ✉️
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (done) reset();
                  }}
                  placeholder="you@example.com"
                  className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-4 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
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
              <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7E63] text-sm">
                  🔒
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (done) reset();
                  }}
                  placeholder="Create a strong password"
                  className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-10 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                    passwordError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9C7E63] hover:text-[#4A2508] text-sm"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Password Rules Checklist */}
              <div className="flex items-center gap-2.5 mt-1 flex-wrap text-[10.5px] font-bold text-[#7A5B3E]">
                <div className="flex items-center gap-1">
                  <span className={hasMinLength ? "text-[#10B981]" : "text-[#B5987A]"}>
                    {hasMinLength ? "✓" : "○"}
                  </span>
                  <span>At least 8 chars</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={hasNumOrSymbol ? "text-[#10B981]" : "text-[#B5987A]"}>
                    {hasNumOrSymbol ? "✓" : "○"}
                  </span>
                  <span>1 num/symbol</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={hasLetters ? "text-[#10B981]" : "text-[#B5987A]"}>
                    {hasLetters ? "✓" : "○"}
                  </span>
                  <span>Mix of letters</span>
                </div>
              </div>
            </div>

            {/* Choose Your Avatar */}
            <div>
              <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1.5">
                Choose your avatar
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.id)}
                    className={`w-8 h-8 rounded-full border-2 overflow-hidden transition-all shadow-2xs ${
                      selectedAvatar === av.id
                        ? "border-[#F4C430] scale-110 ring-2 ring-[#F4C430]/40"
                        : "border-[#E6D4B5] hover:border-[#D4A574]"
                    }`}
                  >
                    <img src={av.src} alt={av.label} className="w-full h-full object-cover" />
                  </button>
                ))}
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-full border border-[#E6D4B5] bg-[#FFF8E7] text-[10.5px] font-bold text-[#5C3717] hover:bg-white transition-all"
                >
                  View more ⚙️
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-0.5">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-[#D9C4A3] text-[#E85D04] focus:ring-[#F4C430] accent-[#E85D04]"
                required
              />
              <label htmlFor="agreeTerms" className="text-[11.5px] font-bold text-[#5C3717] select-none cursor-pointer leading-tight">
                I agree to the{" "}
                <Link to="/privacy" className="text-[#E85D04] underline font-extrabold">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <a href="#terms" className="text-[#E85D04] underline font-extrabold">
                  Terms of Service
                </a>
              </label>
            </div>

            {/* Primary CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04] hover:from-[#F4C430] hover:to-[#D45000] text-[#4A2508] font-extrabold py-2.5 rounded-full text-[14.5px] shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mt-1"
            >
              <span>{loading ? "Creating account..." : "Create account"}</span>
              <span>→</span>
            </button>

          </form>

          {/* Footer Text */}
          <div className="text-center pt-2 border-t border-[#F2E3C6]">
            <span className="text-[12px] text-[#7A5B3E] font-medium">
              Already have an account?{" "}
            </span>
            <Link to="/login" className="text-[12px] font-extrabold text-[#E85D04] hover:underline">
              Sign in
            </Link>
          </div>

        </div>

        {/* Below Card Badges Row */}
        <div className="flex items-center justify-center gap-3 text-[10.5px] font-bold text-[#8C6D4F] pt-0.5">
          <span className="flex items-center gap-1">🛡️ Secure &amp; Private</span>
          <span>|</span>
          <span className="flex items-center gap-1">🚫 No Spam</span>
          <span>|</span>
          <span className="flex items-center gap-1">🔒 Your Data Stays Yours</span>
        </div>

      </div>
    </AuthShell>
  );
}
