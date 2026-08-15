import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  X,
} from "lucide-react";
import AuthShell from "../../components/auth/AuthShell";
import { useLocalSignIn } from "../../components/auth/useLocalSignIn";
import { FormNotice } from "../../components/auth/AuthControls";
import {
  validateEmail,
  validateName,
  validatePassword,
  type FieldError,
} from "../../lib/authValidation";
import { useRoomStore } from "../../store/roomStore";
import { AVATARS, findAvatar } from "../../lib/avatars";
import { AppleMark, GoogleMark } from "../../components/auth/authIcons";

export default function SignUpPage() {
  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();

  // Wizard state: Step 1 (Credentials) | Step 2 (Avatar & Terms)
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [name, setName] = useState(playerName.trim());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(avatarId || AVATARS[0]?.id || "");
  const [showAllAvatarsModal, setShowAllAvatarsModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Validation Errors
  const [nameError, setNameError] = useState<FieldError>(null);
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const { loading, unavailable, submit, markUnavailable, reset } = useLocalSignIn();

  // Live password strength criteria
  const hasMinLength = password.length >= 8;
  const hasNumOrSymbol = /[0-9!@#$%^&*()]/.test(password);
  const hasLetters = /[a-zA-Z]/.test(password);

  // Display top 12 avatars in 3x4 grid for Step 2
  const top12Avatars = AVATARS.slice(0, 12);

  function handleGoToStep2(e: React.FormEvent) {
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
    setStep(2);
  }

  function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeTerms) return;

    // Save profile state to room store
    setPlayerName(name.trim());
    if (selectedAvatar) {
      setAvatarId(selectedAvatar);
    }
    submit(email);
  }

  return (
    <AuthShell
      heroType="signup"
      currentStep={step}
      onBackStep={step === 2 ? () => setStep(1) : undefined}
    >
      <div className="space-y-3">
        
        {/* Floating White Card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#F2E3C6] rounded-[28px] p-5 sm:p-6 lg:p-7 shadow-xl shadow-amber-900/10 text-left relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* ── STEP 1: Account Information & Credentials (UX Screen 5) ── */
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3.5"
              >
                {/* Card Header */}
                <div className="text-center">
                  <h2 className="bhalyam-display text-[24px] sm:text-[27px] font-extrabold text-[#4A2508] tracking-tight flex items-center justify-center gap-1.5">
                    <span>Create your account</span>
                    <span className="text-[#E85D04]">✨</span>
                  </h2>
                  <p className="text-[12px] text-[#7A5B3E] font-medium mt-0.5">
                    Takes less than a minute — and a lifetime of memories.
                  </p>
                </div>

                {/* Social Sign Up Buttons */}
                <div className="space-y-2 pt-0.5">
                  <button
                    type="button"
                    onClick={markUnavailable}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] active:scale-98 rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs cursor-pointer"
                  >
                    <GoogleMark className="w-4 h-4" />
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={markUnavailable}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-[#D9C4A3] hover:border-[#B38918] hover:bg-[#FFFDF5] active:scale-98 rounded-full text-[13px] font-bold text-[#4A2508] transition-all shadow-xs cursor-pointer"
                  >
                    <AppleMark className="w-[17px] h-[17px]" />
                    <span>Continue with Apple</span>
                  </button>
                </div>

                {unavailable ? (
                  <FormNotice tone="info" title="Provider sign-up isn't connected yet">
                    Google and Apple need OAuth credentials this build doesn&apos;t have. Use your
                    email below — it works today.
                  </FormNotice>
                ) : null}

                {/* Divider */}
                <div className="flex items-center gap-3 py-0.5">
                  <span className="h-px flex-1 bg-[#E6D4B5]" />
                  <span className="shrink-0 whitespace-nowrap text-[10.5px] font-extrabold text-[#9C7E63] uppercase tracking-wider">
                    or sign up with email
                  </span>
                  <span className="h-px flex-1 bg-[#E6D4B5]" />
                </div>

                {/* Step 1 Form */}
                <form onSubmit={handleGoToStep2} className="space-y-3">
                  
                  {/* Display Name Input */}
                  <div>
                    <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1">
                      Display name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError(null);
                          if (unavailable) reset();
                        }}
                        placeholder="e.g. Kethan Kumar"
                        className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-10 py-2.5 text-[13.5px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                          nameError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                        }`}
                        required
                      />
                      {name.trim().length >= 2 && !nameError && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[#7A5B3E] font-medium mt-1 block">
                      This is what your friends will see at the table.
                    </span>
                    {nameError && (
                      <span className="text-[11px] font-bold text-[#E11D48] mt-0.5 block">
                        {nameError}
                      </span>
                    )}
                  </div>

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
                    <label className="block text-[12px] font-extrabold text-[#4A2508] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                          if (unavailable) reset();
                        }}
                        placeholder="Create a strong password"
                        className={`w-full bg-[#FFFDF8] border rounded-full pl-10 pr-10 py-2.5 text-[13.5px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                          passwordError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9C7E63] hover:text-[#4A2508] cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Live Password Rules Checklist */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] font-bold text-[#7A5B3E]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                          hasMinLength ? "bg-[#10B981] text-white" : "bg-[#E6D4B5] text-transparent"
                        }`}>
                          ✓
                        </span>
                        <span className={hasMinLength ? "text-[#10B981]" : "text-[#7A5B3E]"}>
                          At least 8 characters
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                          hasNumOrSymbol ? "bg-[#10B981] text-white" : "bg-[#E6D4B5] text-transparent"
                        }`}>
                          ✓
                        </span>
                        <span className={hasNumOrSymbol ? "text-[#10B981]" : "text-[#7A5B3E]"}>
                          1 number or symbol
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                          hasLetters ? "bg-[#10B981] text-white" : "bg-[#E6D4B5] text-transparent"
                        }`}>
                          ✓
                        </span>
                        <span className={hasLetters ? "text-[#10B981]" : "text-[#7A5B3E]"}>
                          Mix of letters
                        </span>
                      </div>
                    </div>

                    {passwordError && (
                      <span className="text-[11px] font-bold text-[#E11D48] mt-1 block">
                        {passwordError}
                      </span>
                    )}
                  </div>

                  {/* Next CTA Button */}
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04] hover:from-[#F4C430] hover:to-[#D45000] text-[#4A2508] font-extrabold py-3 rounded-full text-[14.5px] shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
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

              </motion.div>
            ) : (
              /* ── STEP 2: Avatar Selection & Finalize (UX Screen 6) ── */
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Top Navigation Row: Back Arrow + Heading */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    aria-label="Back to previous step"
                    className="w-8 h-8 rounded-full bg-[#FFF5E0] border border-[#E6D4B5] text-[#5C3717] flex items-center justify-center hover:bg-[#FBE7BD] active:scale-95 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center flex-1 pr-8">
                    <h2 className="bhalyam-display text-[22px] sm:text-[25px] font-extrabold text-[#4A2508] tracking-tight flex items-center justify-center gap-1.5">
                      <span>Almost there!</span>
                      <span className="text-[#E85D04]">✨</span>
                    </h2>
                    <p className="text-[12px] text-[#7A5B3E] font-medium mt-0.5">
                      Pick an avatar that represents you at the table.
                    </p>
                  </div>
                </div>

                {/* 3x4 Avatar Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-1 justify-items-center">
                  {top12Avatars.map((av) => {
                    const isSelected = selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.id)}
                        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden transition-all duration-150 cursor-pointer shadow-xs ${
                          isSelected
                            ? "border-[#E85D04] ring-4 ring-[#F4C430]/60 scale-105 shadow-md"
                            : "border-[#E6D4B5] hover:border-[#D4A574] hover:scale-105"
                        }`}
                        title={av.label}
                      >
                        <img
                          src={av.src}
                          alt={av.label}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-[#E85D04] border-2 border-white text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* View More Button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllAvatarsModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#E6D4B5] bg-[#FFF8E7] text-[12px] font-bold text-[#5C3717] hover:bg-white hover:border-[#D4A574] active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>View more</span>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Final Form: Terms Checkbox + Create Account CTA */}
                <form onSubmit={handleFinalSubmit} className="space-y-3 pt-1">
                  
                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-[#D9C4A3] text-[#E85D04] focus:ring-[#F4C430] accent-[#E85D04] cursor-pointer"
                      required
                    />
                    <label
                      htmlFor="agreeTerms"
                      className="text-[11.5px] font-bold text-[#5C3717] select-none cursor-pointer leading-tight"
                    >
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

                  {/* Create Account Primary CTA */}
                  <button
                    type="submit"
                    disabled={loading || !agreeTerms}
                    className={`w-full font-extrabold py-3 rounded-full text-[14.5px] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !agreeTerms || loading
                        ? "bg-[#D9C4A3] text-[#8C6D4F] cursor-not-allowed opacity-70"
                        : "bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04] hover:from-[#F4C430] hover:to-[#D45000] text-[#4A2508] hover:scale-[1.01] active:scale-95"
                    }`}
                  >
                    <span>{loading ? "Creating account..." : "Create account"}</span>
                    <ArrowRight className="w-4 h-4" />
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

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* ── ALL AVATARS MODAL SHEET ── */}
      <AnimatePresence>
        {showAllAvatarsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllAvatarsModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-[#FFFDF8] rounded-t-[32px]
                         border-t-2 border-x-2 border-[#E6D4B5] shadow-2xl z-50 p-5 sm:p-6
                         flex flex-col text-left max-h-[85vh]"
              role="dialog"
              aria-modal="true"
              aria-label="Choose from all avatars"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E6D4B5]">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-[#E85D04]" />
                  <span className="bhalyam-display text-[18px] font-extrabold text-[#4A2508]">
                    Choose an Avatar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllAvatarsModal(false)}
                  className="w-8 h-8 rounded-full bg-[#FFF5E0] border border-[#E6D4B5] text-[#5C3717] flex items-center justify-center hover:bg-[#FBE7BD] active:scale-95 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 justify-items-center">
                  {AVATARS.map((av) => {
                    const isSelected = selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av.id);
                          setShowAllAvatarsModal(false);
                        }}
                        className={`relative w-14 h-14 rounded-full border-2 overflow-hidden transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "border-[#E85D04] ring-4 ring-[#F4C430]/60 scale-105 shadow-md"
                            : "border-[#E6D4B5] hover:border-[#D4A574] hover:scale-105"
                        }`}
                      >
                        <img
                          src={av.src}
                          alt={av.label}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-4.5 h-4.5 rounded-full bg-[#E85D04] border-2 border-white text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
