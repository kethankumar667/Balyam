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
  Calendar,
  X,
  User,
  Mail,
} from "lucide-react";
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
import { getEraFromBirthYear } from "../../lib/accountGenerator";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();

  // 3-Step Onboarding Flow: 1 (About You) | 2 (Secure Account) | 3 (Choose Avatar)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Personal Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState(playerName.trim());
  const [isCustomDisplayName, setIsCustomDisplayName] = useState(false);
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");

  // Step 2: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3: Avatar & Terms
  const [selectedAvatar, setSelectedAvatar] = useState(
    avatarId || AVATARS[0]?.id || "avatar_1",
  );
  const [showAllAvatarsModal, setShowAllAvatarsModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Field Errors
  const [firstNameError, setFirstNameError] = useState<FieldError>(null);
  const [lastNameError, setLastNameError] = useState<FieldError>(null);
  const [displayNameError, setDisplayNameError] = useState<FieldError>(null);
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [dobError, setDobError] = useState<FieldError>(null);
  const [genderError, setGenderError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [confirmPasswordError, setConfirmPasswordError] =
    useState<FieldError>(null);

  const { loading, error, configured, submit, withGoogle, clearError } =
    useSignUp();

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

  // 12 avatars for Step 3 grid
  const primaryAvatars = useMemo(() => AVATARS.slice(0, 12), []);

  // Step 1 Validation -> Proceed to Step 2
  function handleProceedToStep2(e: React.FormEvent) {
    e.preventDefault();
    const nextFirst = validateFirstName(firstName);
    const nextLast = validateLastName(lastName);
    const nextName = validateName(displayName);
    const nextDob = validateDob(dob);
    const nextGender = validateGender(gender);

    setFirstNameError(nextFirst);
    setLastNameError(nextLast);
    setDisplayNameError(nextName);
    setDobError(nextDob);
    setGenderError(nextGender);

    if (nextFirst || nextLast || nextName || nextDob || nextGender) {
      return;
    }
    setStep(2);
  }

  // Step 2 Validation -> Proceed to Step 3
  function handleProceedToStep3(e: React.FormEvent) {
    e.preventDefault();
    const nextEmail = validateEmail(email);
    const nextPassword = validatePassword(password);
    const nextConfirm = validatePasswordConfirm(password, confirmPassword);

    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setConfirmPasswordError(nextConfirm);

    if (nextEmail || nextPassword || nextConfirm) {
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
          LEFT FULL-SCREEN PAGE: BRANDING & NOSTALGIA STORYTELLING
         ════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[48%] lg:min-h-screen relative flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden lg:border-r-2 border-[#E0CCAC]">
        {/* Full nostalgic background artwork: Gameboy, Polaroid, Pencils, Cassette, Good Old Days button */}
        <img
          src="/LoginPageBg.png"
          alt="Nostalgic Morning Games Desk and Memories"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Soft morning ambient wash overlay for legibility. Explicit stops
            (not the default 0/50/100 from-via-to split) so the light wash
            stays strong through the whole branding text block — logo,
            headline AND the body paragraph below it — instead of fading to
            transparent by ~25% down and leaving dark text to fight the busy
            photo for contrast. Fully clears by the collage's midpoint so the
            Gameboy/polaroid/marbles still read clearly, then a dark scrim
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

        {/* Top Branding Section */}
        <div className="relative z-20 pt-8 sm:pt-20">
          <div className="flex items-center gap-2 text-amber-600">
            <span className="font-script text-[80px] sm:text-[80px] font-black text-[#112233] leading-none tracking-tight">
              Bhalyam
            </span>
          </div>
          <div className="font-script text-[18px] sm:text-[22px] font-bold text-[#A82020] ml-[220px] leading-snug tracking-tight select-none pointer-events-none">
            — Blast from the past —
          </div>
          {/* Hero Headline */}
          <div className="space-y-1.5 pt-3">
            <div className="flex items-start gap-1.5 text-[#1E293B]">
              <div className="font-script text-[22px] sm:text-[45px] font-black text-[#1E293B] leading-tight ml-[200px]" >
                <div>Join the nostalgia.</div>
                <div>
                  Create new{" "}
                  <span className="text-[#A82020] underline decoration-[#A82020] decoration-2">
                    memories.
                  </span>{" "}
                </div>
              </div>
            </div>
          </div>
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
          RIGHT FULL-SCREEN PAGE: INTERACTIVE SIGNUP EXPERIENCE
         ════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[52%] xl:w-[52%] min-h-screen bg-[#FAF6EE] flex flex-col items-center p-6 sm:p-10 lg:p-12 xl:p-16 relative overflow-y-auto">
        {/* Vertically centers as ONE block when there's room; degrades to a
            plain top-aligned, scrollable column when content is taller than
            the viewport (short mobile screens, or step 3's avatar grid) —
            margin:auto resolves to 0 under overflow instead of centering the
            overflow itself, which would strand content above scrollTop:0
            where it can't be reached. */}
        <div className="my-auto w-full">
          {/* Bhalyam Logo */}
          <div className="flex justify-center pt-2 pb-2">
            <img
              src="/FooterBhalyamlogo.png"
              alt="BHALYAM - Play Together. Remember Forever."
              className="h-24 sm:h-28 w-auto object-contain"
            />
          </div>

          {/* Top Title with hand-drawn rays & red underline */}
          <div className="text-center space-y-1 max-w-[460px] mx-auto w-full">

            <div className="flex items-center justify-center gap-2">
              <span className="font-script text-[#A82020] text-2xl font-bold tracking-widest">
                ≡
              </span>
              <h1 className="font-script text-[36px] sm:text-[44px] font-black text-[#162A3B] leading-none tracking-tight">
                Create Your Account {' '}
              </h1>
              <span className="font-script text-[#A82020] text-2xl font-bold tracking-widest">
                ≡
              </span>
            </div>
            <div className="w-24 h-0.75 mx-auto rounded-full bg-[#A82020] mt-1" />
          </div>

          {/* ── 3-STEP TIMELINE INDICATOR ── */}
          <div className="py-3 px-1 max-w-[460px] mx-auto w-full">
            <div className="flex items-center justify-between relative">
              {/* Connecting Dashed Line */}
              <div className="absolute top-4 left-8 right-8 h-0.5 border-t-2 border-dashed border-[#CBD5E1] z-0" />

              {/* Step 1 */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all shadow-xs ${
                    step === 1
                      ? "bg-[#881337] text-white ring-4 ring-[#881337]/20"
                      : step > 1
                        ? "bg-[#162A3B] text-white"
                        : "bg-[#E8DFC8] text-[#5C4A32]"
                  }`}
                >
                  {step > 1 ? "✓" : "1"}
                </div>
                <span
                  className={`text-[11.5px] font-bold mt-1 tracking-tight ${
                    step === 1 ? "text-[#881337]" : "text-[#7A5B3E]/80"
                  }`}
                >
                  About You
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all shadow-xs ${
                    step === 2
                      ? "bg-[#881337] text-white ring-4 ring-[#881337]/20"
                      : step > 2
                        ? "bg-[#162A3B] text-white"
                        : "bg-[#E8DFC8] text-[#5C4A32]"
                  }`}
                >
                  {step > 2 ? "✓" : "2"}
                </div>
                <span
                  className={`text-[11.5px] font-bold mt-1 tracking-tight ${
                    step === 2 ? "text-[#881337]" : "text-[#7A5B3E]/80"
                  }`}
                >
                  Secure Account
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all shadow-xs ${
                    step === 3
                      ? "bg-[#881337] text-white ring-4 ring-[#881337]/20"
                      : "bg-[#E8DFC8] text-[#5C4A32]"
                  }`}
                >
                  3
                </div>
                <span
                  className={`text-[11.5px] font-bold mt-1 tracking-tight ${
                    step === 3 ? "text-[#881337]" : "text-[#7A5B3E]/80"
                  }`}
                >
                  Choose Avatar
                </span>
              </div>
            </div>
          </div>

          {/* ── FORM CONTAINER ── */}
          <div className="py-2 max-w-[460px] mx-auto w-full">
            {/* Error Notice */}
            {error ? (
              <div className="my-1.5">
                <FormNotice tone="error" title="Couldn't create your account">
                  {error}
                </FormNotice>
              </div>
            ) : !configured ? (
              <div className="my-1.5">
                <FormNotice tone="info" title="Offline Demo Mode">
                  Account is stored locally on this device.
                </FormNotice>
              </div>
            ) : null}

            {/* ── INTERACTIVE FORM BODY ── */}
            <div className="flex-1 py-1">
              <AnimatePresence mode="wait">
                {/* ══════════════════════════════════════════════════════════
                    STEP 1: ABOUT YOU
                   ══════════════════════════════════════════════════════════ */}
                {step === 1 && (
                  // noValidate on all three steps: the browser's own "please
                  // fill out this field" popup otherwise intercepts submit
                  // before the handler runs, so the styled red-text messages
                  // below each field never get a chance to show.
                  <motion.form
                    key="step1"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handleProceedToStep2}
                    noValidate
                    className="space-y-3.5 text-left"
                  >
                    {/* Row 1: First Name & Last Name */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) =>
                              handleFirstNameChange(e.target.value)
                            }
                            placeholder="First Name"
                            className={`w-full bg-[#FAF6EE] border rounded-full pl-10 pr-4 py-3 text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                              firstNameError
                                ? "border-[#A82020]"
                                : "border-[#CBD5E1]"
                            }`}
                            required
                          />
                        </div>
                        {firstNameError && (
                          <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                            {firstNameError}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) =>
                              handleLastNameChange(e.target.value)
                            }
                            placeholder="Last Name"
                            className={`w-full bg-[#FAF6EE] border rounded-full pl-10 pr-4 py-3 text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                              lastNameError
                                ? "border-[#A82020]"
                                : "border-[#CBD5E1]"
                            }`}
                            required
                          />
                        </div>
                        {lastNameError && (
                          <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                            {lastNameError}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Display Name */}
                    <div className="space-y-1">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value);
                            setIsCustomDisplayName(true);
                            if (displayNameError) setDisplayNameError(null);
                          }}
                          placeholder="Display Name"
                          className={`w-full bg-[#FAF6EE] border rounded-full pl-10 pr-10 py-3 text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                            displayNameError
                              ? "border-[#A82020]"
                              : "border-[#CBD5E1]"
                          }`}
                          required
                        />
                        {displayName.trim().length >= 2 &&
                          !displayNameError && (
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                      </div>
                      <p className="text-[11px] text-[#7A5B3E] font-medium pl-3">
                        This is how your name will appear in Bhalyam.
                      </p>
                      {displayNameError && (
                        <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                          {displayNameError}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Date of Birth & Gender */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10.5px] font-bold text-[#5C4A32] uppercase tracking-wider pl-1 block">
                          Date of Birth
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={dob}
                            max={new Date().toISOString().split("T")[0]}
                            min="1930-01-01"
                            onChange={(e) => {
                              setDob(e.target.value);
                              if (dobError) setDobError(null);
                              clearNotices();
                            }}
                            className={`w-full bg-[#FAF6EE] border rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                              dobError ? "border-[#A82020]" : "border-[#CBD5E1]"
                            }`}
                            required
                          />
                          <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        </div>
                        {dobError && (
                          <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                            {dobError}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <label className="text-[10.5px] font-bold text-[#5C4A32] uppercase tracking-wider pl-1 block">
                          Gender
                        </label>
                        <div className="relative">
                          <select
                            value={gender}
                            onChange={(e) => {
                              setGender(
                                e.target.value as
                                  | "Male"
                                  | "Female"
                                  | "Other"
                                  | "",
                              );
                              if (genderError) setGenderError(null);
                            }}
                            className={`w-full bg-[#FAF6EE] border rounded-full pl-4 pr-9 py-2.5 text-sm font-medium text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs appearance-none cursor-pointer ${
                              genderError
                                ? "border-[#A82020]"
                                : "border-[#CBD5E1]"
                            }`}
                            required
                          >
                            <option value="" disabled>
                              Select Gender ▾
                            </option>
                            <option value="Male">👦 Male</option>
                            <option value="Female">👧 Female</option>
                            <option value="Other">✨ Other</option>
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-[#64748B]">
                            ▾
                          </div>
                        </div>
                        {genderError && (
                          <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                            {genderError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={withGoogle}
                        disabled={loading}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-full text-[13px] font-bold text-[#334155] transition shadow-2xs cursor-pointer active:scale-95 w-full"
                      >
                        <GoogleMark className="w-4 h-4" />
                        <span>Google</span>
                      </button>

                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-[#881337] hover:bg-[#9F1239] text-white font-bold text-sm rounded-full shadow-sm hover:shadow-md active:scale-98 transition cursor-pointer w-full"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* ══════════════════════════════════════════════════════════
                    STEP 2: SECURE ACCOUNT (Email & Password)
                   ══════════════════════════════════════════════════════════ */}
                {step === 2 && (
                  <motion.form
                    key="step2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handleProceedToStep3}
                    noValidate
                    className="space-y-3.5 text-left"
                  >
                    {/* Email Field */}
                    <div className="space-y-1">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setEmailError(null);
                            clearNotices();
                          }}
                          placeholder="Email Address"
                          className={`w-full bg-[#FAF6EE] border rounded-full pl-10 pr-4 py-3 text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                            emailError ? "border-[#A82020]" : "border-[#CBD5E1]"
                          }`}
                          required
                        />
                      </div>
                      {emailError && (
                        <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                          {emailError}
                        </span>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError(null);
                            clearNotices();
                          }}
                          placeholder="Create Password (8+ characters)"
                          className={`w-full bg-[#FAF6EE] border rounded-full pl-10 pr-11 py-3 text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                            passwordError
                              ? "border-[#A82020]"
                              : "border-[#CBD5E1]"
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {passwordError && (
                        <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                          {passwordError}
                        </span>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-1">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmPasswordError)
                              setConfirmPasswordError(null);
                            clearNotices();
                          }}
                          placeholder="Confirm Password"
                          className={`w-full bg-[#FAF6EE] border rounded-full pl-10 pr-11 py-3 text-sm font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition-all shadow-2xs ${
                            confirmPasswordError
                              ? "border-[#A82020]"
                              : "border-[#CBD5E1]"
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {confirmPasswordError && (
                        <span className="text-[10.5px] font-bold text-[#A82020] block pl-3">
                          {confirmPasswordError}
                        </span>
                      )}
                    </div>

                    {/* Password Requirements Status Box */}
                    <div className="bg-[#FFFDF7] border border-[#CBD5E1] rounded-2xl p-2.5 space-y-1">
                      <div className="text-[11px] font-bold text-[#5C3E21]">
                        Password Requirements:
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                        <div
                          className={`flex items-center gap-1.5 ${
                            hasMinLength
                              ? "text-emerald-700 font-bold"
                              : "text-[#7A5B3E]"
                          }`}
                        >
                          <span>{hasMinLength ? "✓" : "○"}</span>
                          <span>8+ Characters</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            hasNumOrSymbol
                              ? "text-emerald-700 font-bold"
                              : "text-[#7A5B3E]"
                          }`}
                        >
                          <span>{hasNumOrSymbol ? "✓" : "○"}</span>
                          <span>1 Number / Symbol</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row: Back + Next Step */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-[#CBD5E1] bg-white text-xs font-bold text-[#5C3E21] hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#881337] hover:bg-[#9F1239] text-white font-bold text-sm shadow-sm hover:shadow-md active:scale-98 transition cursor-pointer ml-auto"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* ══════════════════════════════════════════════════════════
                    STEP 3: CHOOSE AVATAR & TERMS
                   ══════════════════════════════════════════════════════════ */}
                {step === 3 && (
                  <motion.form
                    key="step3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handleFinalSubmit}
                    noValidate
                    className="space-y-3 text-left"
                  >
                    {/* Selected Avatar Banner */}
                    <div className="bg-[#FFFDF7] border border-[#CBD5E1] rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#881337] bg-white flex-shrink-0">
                          <img
                            src={
                              chosenAvatarObj?.src ||
                              "/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg"
                            }
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[13px] text-[#162A3B] truncate">
                            {displayName || "Player"}
                          </div>
                          <div className="font-mono text-[10px] text-[#7A5B3E]">
                            ID:{" "}
                            <span className="font-bold text-[#162A3B]">
                              {generatedAccountId}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAllAvatarsModal(true)}
                        className="px-3 py-1.5 rounded-full bg-[#FAF0DC] border border-[#D8C2A0] text-[11px] font-bold text-[#5C3E21] hover:bg-[#F5E4C4] transition cursor-pointer"
                      >
                        All Avatars
                      </button>
                    </div>

                    {/* 4x3 Avatar Selection Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 justify-items-center py-1">
                      {primaryAvatars.map((av) => {
                        const isSelected = selectedAvatar === av.id;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatar(av.id)}
                            className={`relative w-12 h-12 rounded-full border-2 overflow-hidden transition-all duration-150 cursor-pointer shadow-xs ${
                              isSelected
                                ? "border-[#881337] ring-3 ring-[#881337]/30 scale-105"
                                : "border-[#CBD5E1] hover:border-[#881337]/60 hover:scale-105"
                            }`}
                            title={av.label}
                          >
                            <img
                              src={av.src}
                              alt={av.label}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-[#881337] text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Terms Checkbox */}
                    <div className="flex items-start gap-2 pt-1 pl-1">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-[#CBD5E1] text-[#881337] focus:ring-[#881337] accent-[#881337] cursor-pointer"
                        required
                      />
                      <label
                        htmlFor="agreeTerms"
                        className="text-[11.5px] font-medium text-[#5C3E21] select-none cursor-pointer leading-snug"
                      >
                        I agree to Bhalyam&apos;s{" "}
                        <Link
                          to="/privacy"
                          className="text-[#881337] font-bold underline"
                        >
                          Privacy Policy
                        </Link>{" "}
                        and Terms of Service.
                      </label>
                    </div>

                    {/* Bottom Action Row: Back + Create Account CTA */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-[#CBD5E1] bg-white text-xs font-bold text-[#5C3E21] hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading || !agreeTerms}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#881337] hover:bg-[#9F1239] text-white font-bold text-sm shadow-sm hover:shadow-md active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ml-auto"
                      >
                        <span>
                          {loading ? "Creating..." : "Create Account 🚀"}
                        </span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Footer: Sign In Link */}
            <div className="text-center text-[13px] text-[#7A5B3E] pt-3 border-t border-[#D8C2A0]/50 mt-1">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-[#881337] hover:underline inline-flex items-center ml-0.5"
              >
                Sign In
              </Link>
            </div>

            {/* Childhood Friends Pencil Sketch Illustration Banner */}
            <div className="flex items-center justify-center pt-1.5 text-[13.5px] font-script text-[#7A5B3E] font-bold select-none pointer-events-none">
              <span>♡ Made with love for the 90&apos;s kids ⭐️</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALL AVATARS MODAL ── */}
      {showAllAvatarsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF6EE] border-2 border-[#D8C2A0] rounded-3xl p-5 max-w-[480px] w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D8C2A0]/60 pb-2">
              <div className="font-script text-[22px] font-bold text-[#162A3B]">
                Choose Your Bhalyam Avatar
              </div>
              <button
                type="button"
                onClick={() => setShowAllAvatarsModal(false)}
                className="w-8 h-8 rounded-full bg-[#EAD7B8] hover:bg-[#D8C2A0] flex items-center justify-center text-[#5C3E21] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 justify-items-center py-2">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(av.id);
                    setShowAllAvatarsModal(false);
                  }}
                  className={`w-14 h-14 rounded-full border-2 overflow-hidden hover:scale-105 transition cursor-pointer ${
                    selectedAvatar === av.id
                      ? "border-[#881337] ring-3 ring-[#881337]/30"
                      : "border-[#CBD5E1]"
                  }`}
                >
                  <img
                    src={av.src}
                    alt={av.label}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
