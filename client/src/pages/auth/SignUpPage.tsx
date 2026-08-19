import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Calendar,
  X,
} from "lucide-react";
import AuthShell from "../../components/auth/AuthShell";
import { useSignUp } from "../../components/auth/useAccountAuth";
import { FormNotice } from "../../components/auth/AuthControls";
import {
  validateEmail,
  validateFirstName,
  validateLastName,
  validateName,
  validateDob,
  validateGender,
  validatePassword,
  validatePasswordConfirm,
  type FieldError,
} from "../../lib/authValidation";
import { useRoomStore } from "../../store/roomStore";
import { AVATARS, findAvatar } from "../../lib/avatars";
import { GoogleMark } from "../../components/auth/authIcons";
import { generateAccountId, getEraFromBirthYear } from "../../lib/accountGenerator";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();

  // 4-Step Wizard: 1 (About You) | 2 (Password) | 3 (Avatar) | 4 (Welcome)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Personal Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState(playerName.trim());
  const [isCustomDisplayName, setIsCustomDisplayName] = useState(false);
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("1995-05-20");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("Male");

  // Step 2: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3: Avatar & Terms
  const [selectedAvatar, setSelectedAvatar] = useState(avatarId || AVATARS[0]?.id || "avatar_1");
  const [showAllAvatarsModal, setShowAllAvatarsModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Field Errors
  const [firstNameError, setFirstNameError] = useState<FieldError>(null);
  const [lastNameError, setLastNameError] = useState<FieldError>(null);
  const [displayNameError, setDisplayNameError] = useState<FieldError>(null);
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [dobError, setDobError] = useState<FieldError>(null);
  const [genderError, setGenderError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<FieldError>(null);

  const { loading, error, configured, submit, withGoogle, clearError } = useSignUp();

  function clearNotices() {
    if (error) clearError();
  }

  // Handle First & Last Name auto-generation for Display Name
  function handleFirstNameChange(val: string) {
    setFirstName(val);
    if (firstNameError) setFirstNameError(null);
    clearNotices();
    if (!isCustomDisplayName) {
      const combined = `${val} ${lastName}`.trim();
      setDisplayName(combined);
      if (displayNameError) setDisplayNameError(null);
    }
  }

  function handleLastNameChange(val: string) {
    setLastName(val);
    if (lastNameError) setLastNameError(null);
    clearNotices();
    if (!isCustomDisplayName) {
      const combined = `${firstName} ${val}`.trim();
      setDisplayName(combined);
      if (displayNameError) setDisplayNameError(null);
    }
  }

  // Dynamic Era & Account ID generation
  const birthYear = useMemo(() => {
    if (!dob) return 1995;
    const y = new Date(dob).getFullYear();
    return isNaN(y) ? 1995 : y;
  }, [dob]);

  const eraTag = useMemo(() => getEraFromBirthYear(birthYear), [birthYear]);

  const randomSuffix = useMemo(() => {
    const xxxx = Math.floor(1000 + Math.random() * 9000);
    const yyy = Math.floor(10 + Math.random() * 90);
    return `${xxxx}-${yyy}`;
  }, []);

  const generatedAccountId = useMemo(() => {
    return `BHYM-${eraTag}-${randomSuffix}`;
  }, [eraTag, randomSuffix]);

  // Live password validation
  const hasMinLength = password.length >= 8;
  const hasNumOrSymbol = /[0-9!@#$%^&*()]/.test(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // 12 avatars for Step 3 grid
  const primaryAvatars = useMemo(() => AVATARS.slice(0, 12), []);

  // Step 1 Validation -> Proceed to Step 2
  function handleProceedToStep2(e: React.FormEvent) {
    e.preventDefault();
    const nextFirst = validateFirstName(firstName);
    const nextLast = validateLastName(lastName);
    const nextName = validateName(displayName);
    const nextEmail = validateEmail(email);
    const nextDob = validateDob(dob);
    const nextGender = validateGender(gender);

    setFirstNameError(nextFirst);
    setLastNameError(nextLast);
    setDisplayNameError(nextName);
    setEmailError(nextEmail);
    setDobError(nextDob);
    setGenderError(nextGender);

    if (nextFirst || nextLast || nextName || nextEmail || nextDob || nextGender) {
      return;
    }
    setStep(2);
  }

  // Step 2 Validation -> Proceed to Step 3
  function handleProceedToStep3(e: React.FormEvent) {
    e.preventDefault();
    const nextPassword = validatePassword(password);
    const nextConfirm = validatePasswordConfirm(password, confirmPassword);

    setPasswordError(nextPassword);
    setConfirmPasswordError(nextConfirm);

    if (nextPassword || nextConfirm) {
      return;
    }
    setStep(3);
  }

  // Step 3 -> Final Account Creation Submission
  function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeTerms) return;

    // Save profile state to room store
    setPlayerName(displayName.trim());
    if (selectedAvatar) {
      setAvatarId(selectedAvatar);
    }

    // Submit registration with all profile data
    submit(email, password, displayName, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob,
      gender,
      accountId: generatedAccountId,
      avatarId: selectedAvatar,
    });
  }

  const chosenAvatarObj = findAvatar(selectedAvatar) || AVATARS[0];

  return (
    <AuthShell
      heroType="signup"
      currentStep={step <= 3 ? step : undefined}
      onBackStep={step === 2 ? () => setStep(1) : step === 3 ? () => setStep(2) : undefined}
    >
      <div className="space-y-3 text-left">
        
        {/* ── TOP PROGRESS INDICATOR (Steps 1, 2, 3) ── */}
        {step <= 3 && (
          <div className="w-full space-y-1 pb-1">
            <div className="text-center text-[10px] font-extrabold tracking-widest text-[#7A5B3E] uppercase">
              STEP {step} OF 3
            </div>
            
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 max-w-[360px] mx-auto">
              {/* Step 1 */}
              <div className="flex items-center gap-1">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    step === 1
                      ? "bg-[#162A3B] text-white ring-2 ring-[#162A3B]/20 shadow-xs"
                      : step > 1
                      ? "bg-[#162A3B] text-white"
                      : "bg-white/80 border border-[#CBD5E1] text-[#94A3B8]"
                  }`}
                >
                  {step > 1 ? "✓" : "1"}
                </span>
                <span className={`text-xs font-bold ${step === 1 ? "text-[#162A3B]" : "text-[#7A5B3E]/80"}`}>
                  About You
                </span>
              </div>

              <span className={`h-0.5 w-6 sm:w-8 rounded-full transition-all ${step >= 2 ? "bg-[#162A3B]" : "bg-[#E2E8F0]"}`} />

              {/* Step 2 */}
              <div className="flex items-center gap-1">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    step === 2
                      ? "bg-[#162A3B] text-white ring-2 ring-[#162A3B]/20 shadow-xs"
                      : step > 2
                      ? "bg-[#162A3B] text-white"
                      : "bg-white/80 border border-[#CBD5E1] text-[#94A3B8]"
                  }`}
                >
                  {step > 2 ? "✓" : "2"}
                </span>
                <span className={`text-xs font-bold ${step === 2 ? "text-[#162A3B]" : "text-[#7A5B3E]/80"}`}>
                  Password
                </span>
              </div>

              <span className={`h-0.5 w-6 sm:w-8 rounded-full transition-all ${step >= 3 ? "bg-[#162A3B]" : "bg-[#E2E8F0]"}`} />

              {/* Step 3 */}
              <div className="flex items-center gap-1">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    step === 3
                      ? "bg-[#162A3B] text-white ring-2 ring-[#162A3B]/20 shadow-xs"
                      : "bg-white/80 border border-[#CBD5E1] text-[#94A3B8]"
                  }`}
                >
                  3
                </span>
                <span className={`text-xs font-bold ${step === 3 ? "text-[#162A3B]" : "text-[#7A5B3E]/80"}`}>
                  Avatar
                </span>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ══════════════════════════════════════════════════════════
              STEP 1: ABOUT YOU
             ══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              {/* Heading & Subtitle */}
              <div className="text-left space-y-0.5">
                <h1 className="text-[21px] sm:text-[24px] font-black text-[#111827] tracking-tight flex items-center gap-1.5">
                  <span>Create your Bhalyam account</span>
                  <span className="text-xl">👋</span>
                </h1>
                <p className="text-[12px] sm:text-[13px] text-[#5C3717] font-medium">
                  Your childhood games are waiting.
                </p>
              </div>

              {/* Continue with Google */}
              <div>
                <button
                  type="button"
                  onClick={withGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-2 px-4 bg-white/95 hover:bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-semibold text-[#334155] transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99]"
                >
                  <GoogleMark className="w-4 h-4" />
                  <span>Continue with Google</span>
                </button>
              </div>

              {error ? (
                <FormNotice tone="error" title="Couldn't create your account">
                  {error}
                </FormNotice>
              ) : !configured ? (
                <FormNotice tone="info" title="This build has no account service">
                  Creating an account here only unlocks hosting on this device — nothing
                  is stored on a server and no email is sent.
                </FormNotice>
              ) : null}

              {/* Divider */}
              <div className="flex items-center gap-2.5 my-0.5">
                <span className="h-px flex-1 bg-[#E2E8F0]" />
                <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-[#94A3B8]">
                  or
                </span>
                <span className="h-px flex-1 bg-[#E2E8F0]" />
              </div>

              {/* Step 1 Form */}
              <form onSubmit={handleProceedToStep2} className="space-y-2">
                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="block text-xs font-semibold text-[#1E293B]">
                      First Name <span className="text-[#E85D04]">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      placeholder="e.g. Kethan"
                      className={`w-full bg-white/95 border rounded-xl px-3.5 py-1.5 text-[13px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                        firstNameError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                      }`}
                      required
                    />
                    {firstNameError && (
                      <span className="text-[10px] font-bold text-[#E11D48] block">
                        {firstNameError}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-xs font-semibold text-[#1E293B]">
                      Last Name <span className="text-[#E85D04]">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      placeholder="e.g. Kumar"
                      className={`w-full bg-white/95 border rounded-xl px-3.5 py-1.5 text-[13px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                        lastNameError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                      }`}
                      required
                    />
                    {lastNameError && (
                      <span className="text-[10px] font-bold text-[#E11D48] block">
                        {lastNameError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Display Name */}
                <div className="space-y-0.5">
                  <label className="block text-xs font-semibold text-[#1E293B]">
                    Display Name <span className="text-[#E85D04]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setIsCustomDisplayName(true);
                        if (displayNameError) setDisplayNameError(null);
                      }}
                      placeholder="e.g. MasterGamer"
                      className={`w-full bg-white/95 border rounded-xl px-3.5 py-1.5 pr-8 text-[13px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                        displayNameError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                      }`}
                      required
                    />
                    {displayName.trim().length >= 2 && !displayNameError && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  {displayNameError && (
                    <span className="text-[10px] font-bold text-[#E11D48] block">
                      {displayNameError}
                    </span>
                  )}
                </div>

                {/* Row 3: Email ID */}
                <div className="space-y-0.5">
                  <label className="block text-xs font-semibold text-[#1E293B]">
                    Email ID <span className="text-[#E85D04]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                      clearNotices();
                    }}
                    placeholder="e.g. rajamonica@bhalyam.test"
                    className={`w-full bg-white/95 border rounded-xl px-3.5 py-1.5 text-[13px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                      emailError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                    }`}
                    required
                  />
                  {emailError && (
                    <span className="text-[10px] font-bold text-[#E11D48] block">
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Row 4: Birthday & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label htmlFor="signup-dob" className="block text-xs font-semibold text-[#1E293B]">
                      Birthday <span className="text-[#E85D04]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="signup-dob"
                        type="date"
                        value={dob}
                        max={new Date().toISOString().split("T")[0]}
                        min="1930-01-01"
                        onChange={(e) => {
                          setDob(e.target.value);
                          if (dobError) setDobError(null);
                          clearNotices();
                        }}
                        className={`w-full bg-white/95 border rounded-xl px-3 py-1.5 pr-8 text-[12px] font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                          dobError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                        }`}
                        required
                      />
                      <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                    </div>
                    {dobError && (
                      <span className="text-[10px] font-bold text-[#E11D48] block">
                        {dobError}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-xs font-semibold text-[#1E293B]">
                      Gender <span className="text-[#E85D04]">*</span>
                    </label>
                    <div className="flex items-center gap-1 pt-0.5">
                      {(["Male", "Female", "Other"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setGender(g);
                            if (genderError) setGenderError(null);
                          }}
                          className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                            gender === g
                              ? "bg-[#162A3B] border-[#162A3B] text-white shadow-xs"
                              : "bg-white/95 border-[#E2E8F0] text-[#475569] hover:bg-white"
                          }`}
                        >
                          {g === "Male" ? "👦 Male" : g === "Female" ? "👧 Female" : "✨ Other"}
                        </button>
                      ))}
                    </div>
                    {genderError && (
                      <span className="text-[10px] font-bold text-[#E11D48] block">
                        {genderError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Continue CTA */}
                <button
                  type="submit"
                  className="w-full bg-[#162A3B] hover:bg-[#0E1E2B] text-white font-bold py-2.5 rounded-xl text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-1.5 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Footer Text */}
              <div className="text-center pt-0.5">
                <span className="text-[12px] text-[#64748B]">
                  Already have an account?{" "}
                </span>
                <Link to="/login" className="inline-flex items-center -my-3.5 py-3.5 font-bold text-[#2563EB] hover:underline text-[12px]">
                  Sign in
                </Link>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 2: CREATE PASSWORD
             ══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Heading & Subtitle */}
              <div className="text-left space-y-0.5">
                <h1 className="text-[21px] sm:text-[24px] font-black text-[#111827] tracking-tight flex items-center gap-1.5">
                  <span>Almost there!</span>
                  <span className="text-xl">🔐</span>
                </h1>
                <p className="text-[12px] sm:text-[13px] text-[#5C3717] font-medium">
                  Create a password to keep your Bhalyam account safe.
                </p>
              </div>

              {/* Password Form */}
              <form onSubmit={handleProceedToStep3} className="space-y-2.5">
                {/* Password Field */}
                <div className="space-y-0.5">
                  <label className="block text-xs font-semibold text-[#1E293B]">
                    Password <span className="text-[#E85D04]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                        clearNotices();
                      }}
                      placeholder="••••••••••"
                      className={`w-full bg-white/95 border rounded-xl pl-8 pr-8 py-2 text-[13px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                        passwordError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[24px] min-w-[24px] inline-flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {passwordError && (
                    <span className="text-[10px] font-bold text-[#E11D48] block">
                      {passwordError}
                    </span>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-0.5">
                  <label className="block text-xs font-semibold text-[#1E293B]">
                    Confirm Password <span className="text-[#E85D04]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError(null);
                        clearNotices();
                      }}
                      placeholder="••••••••••"
                      className={`w-full bg-white/95 border rounded-xl pl-8 pr-8 py-2 text-[13px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                        confirmPasswordError ? "border-[#E11D48]" : "border-[#E2E8F0]"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[24px] min-w-[24px] inline-flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <span className="text-[10px] font-bold text-[#E11D48] block">
                      {confirmPasswordError}
                    </span>
                  )}
                </div>

                {/* Dynamic Password Requirements Box */}
                <div className="bg-white/80 border border-[#E6D4B5]/80 rounded-xl p-2.5 space-y-1 text-left shadow-2xs">
                  <div className="text-[11px] font-bold text-[#475569]">
                    Password requirements
                  </div>
                  <div className="space-y-0.5 text-[11px] font-medium">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-[#10B981] font-semibold" : "text-[#64748B]"}`}>
                      <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${
                        hasMinLength ? "bg-[#10B981] text-white" : "border border-[#CBD5E1] text-transparent"
                      }`}>
                        ✓
                      </span>
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumOrSymbol ? "text-[#10B981] font-semibold" : "text-[#64748B]"}`}>
                      <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${
                        hasNumOrSymbol ? "bg-[#10B981] text-white" : "border border-[#CBD5E1] text-transparent"
                      }`}>
                        ✓
                      </span>
                      <span>1 number or symbol</span>
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-[#10B981] font-semibold" : "text-rose-600 font-semibold"}`}>
                        <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${
                          passwordsMatch ? "bg-[#10B981] text-white" : "bg-rose-500 text-white"
                        }`}>
                          {passwordsMatch ? "✓" : "✕"}
                        </span>
                        <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Back + Continue */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white/95 text-[13px] font-bold text-[#5C3717] hover:bg-white active:scale-95 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#162A3B] hover:bg-[#0E1E2B] text-white font-bold py-2.5 rounded-xl text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Footer Text */}
              <div className="text-center pt-0.5">
                <span className="text-[12px] text-[#64748B]">
                  Already have an account?{" "}
                </span>
                <Link to="/login" className="inline-flex items-center -my-3.5 py-3.5 font-bold text-[#2563EB] hover:underline text-[12px]">
                  Sign in
                </Link>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 3: CHOOSE AVATAR
             ══════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Heading & Subtitle */}
              <div className="text-left space-y-0.5">
                <h1 className="text-[21px] sm:text-[24px] font-black text-[#111827] tracking-tight flex items-center gap-1.5">
                  <span>Pick your Bhalyam avatar</span>
                  <span className="text-xl">🎮</span>
                </h1>
                <p className="text-[12px] sm:text-[13px] text-[#5C3717] font-medium">
                  Choose the character that feels most like you.
                </p>
              </div>

              {/* Selected Avatar Preview Chip */}
              <div className="bg-white/90 border border-[#E2E8F0] rounded-xl p-2 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-500 bg-white flex-shrink-0">
                    <img
                      src={chosenAvatarObj?.src || "/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg"}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-bold text-[13px] text-[#16223B] truncate">
                      {displayName || "Player"}
                    </div>
                    <div className="font-mono text-[10px] text-[#7A5E45] truncate">
                      ID: <span className="font-bold text-[#16223B]">{generatedAccountId}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllAvatarsModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#FFF5E0] border border-[#E6D4B5] text-[11px] font-bold text-[#5C3717] hover:bg-[#FBE7BD] transition cursor-pointer"
                >
                  All Avatars
                </button>
              </div>

              {/* 3x4 Avatar Selection Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 py-1 justify-items-center">
                {primaryAvatars.map((av) => {
                  const isSelected = selectedAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden transition-all duration-150 cursor-pointer shadow-2xs ${
                        isSelected
                          ? "border-[#162A3B] ring-3 ring-[#162A3B]/30 scale-105 shadow-sm"
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
                        <div className="absolute top-0 right-0 w-4.5 h-4.5 rounded-full bg-[#162A3B] border-2 border-white text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Final Submit Form */}
              <form onSubmit={handleFinalSubmit} className="space-y-2 pt-0.5">
                {/* Terms Checkbox */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#CBD5E1] text-[#162A3B] focus:ring-amber-500 accent-[#162A3B] cursor-pointer"
                    required
                  />
                  <label
                    htmlFor="agreeTerms"
                    className="text-xs font-medium text-[#475569] select-none cursor-pointer leading-tight"
                  >
                    I agree to the{" "}
                    <Link to="/privacy" className="text-[#2563EB] underline font-semibold">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <a href="#terms" className="text-[#2563EB] underline font-semibold">
                      Terms of Service
                    </a>
                  </label>
                </div>

                {error ? (
                  <FormNotice tone="error" title="Couldn't create your account">
                    {error}
                  </FormNotice>
                ) : null}

                {/* Actions: Back + Create My Account */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white/95 text-[13px] font-bold text-[#5C3717] hover:bg-white active:scale-95 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !agreeTerms}
                    className={`flex-1 font-bold py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !agreeTerms || loading
                        ? "bg-[#CBD5E1] text-[#64748B] cursor-not-allowed opacity-70"
                        : "bg-[#162A3B] hover:bg-[#0E1E2B] text-white active:scale-[0.98]"
                    }`}
                  >
                    <span>{loading ? "Creating account..." : "Create My Account 🎉"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Footer Text */}
              <div className="text-center pt-0.5">
                <span className="text-[12px] text-[#64748B]">
                  Already have an account?{" "}
                </span>
                <Link to="/login" className="inline-flex items-center -my-3.5 py-3.5 font-bold text-[#2563EB] hover:underline text-[12px]">
                  Sign in
                </Link>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 4: WELCOME TO BHALYAM!
             ══════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 text-center py-2"
            >
              <div className="inline-block px-3 py-1 rounded-full bg-[#162A3B] text-white text-[11px] font-black uppercase tracking-wider">
                WELCOME TO BHALYAM!
              </div>

              <div className="space-y-1">
                <h1 className="text-[24px] sm:text-[28px] font-black text-[#111827] tracking-tight">
                  Welcome to Bhalyam! 🎉
                </h1>
                <p className="text-[13px] text-[#5C3717] font-medium">
                  Your childhood gaming lounge is ready.
                </p>
              </div>

              {/* Celebratory Avatar Display with Doodles */}
              <div className="relative w-28 h-28 mx-auto my-3 flex items-center justify-center">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-[#F4C430]/30 rounded-full blur-md" />
                
                {/* Avatar frame */}
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#162A3B] shadow-lg bg-white">
                  <img
                    src={chosenAvatarObj?.src || "/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg"}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Handcrafted Doodle Accents */}
                <span className="absolute -top-1 -right-1 text-xl animate-bounce">
                  ✨
                </span>
                <span className="absolute -bottom-1 -left-1 text-lg">
                  🏆
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="text-[16px] font-black text-[#16223B]">
                  {displayName}
                </div>
                <div className="font-mono text-[11px] text-[#7A5E45]">
                  ID: <span className="font-bold text-[#16223B]">{generatedAccountId}</span>
                </div>
              </div>

              {/* Enter Bhalyam CTA */}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full bg-[#162A3B] hover:bg-[#0E1E2B] text-white font-bold py-3.5 rounded-xl text-[15px] shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Enter Bhalyam</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
                            ? "border-[#162A3B] ring-3 ring-[#162A3B]/30 scale-105 shadow-md"
                            : "border-[#E6D4B5] hover:border-[#D4A574] hover:scale-105"
                        }`}
                      >
                        <img
                          src={av.src}
                          alt={av.label}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-4.5 h-4.5 rounded-full bg-[#162A3B] border-2 border-white text-white flex items-center justify-center">
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
