import { useState, useMemo } from "react";
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
  Calendar,
  Sparkles,
  X,
  BadgePercent,
  IdCard,
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
import { AppleMark, GoogleMark } from "../../components/auth/authIcons";
import { generateAccountId, getEraFromBirthYear } from "../../lib/accountGenerator";

export default function SignUpPage() {
  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();

  // Wizard state: Step 1 (Credentials & Personal Details) | Step 2 (Avatar & Terms)
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState(playerName.trim());
  const [isCustomDisplayName, setIsCustomDisplayName] = useState(false);
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("1995-05-20");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("Male");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(avatarId || AVATARS[0]?.id || "");
  const [showAllAvatarsModal, setShowAllAvatarsModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Validation Errors
  const [firstNameError, setFirstNameError] = useState<FieldError>(null);
  const [lastNameError, setLastNameError] = useState<FieldError>(null);
  const [displayNameError, setDisplayNameError] = useState<FieldError>(null);
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [dobError, setDobError] = useState<FieldError>(null);
  const [genderError, setGenderError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<FieldError>(null);

  const { loading, error, configured, submit, withGoogle, clearError } = useSignUp();

  /** Apple needs a paid developer account this project does not have. */
  const [appleUnavailable, setAppleUnavailable] = useState(false);

  function clearNotices() {
    if (error) clearError();
    if (appleUnavailable) setAppleUnavailable(false);
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

  function handleDisplayNameChange(val: string) {
    setDisplayName(val);
    setIsCustomDisplayName(true);
    if (displayNameError) setDisplayNameError(null);
    clearNotices();
  }

  // Dynamic Era & Account ID generation based on DOB
  const birthYear = useMemo(() => {
    if (!dob) return 1995;
    const y = new Date(dob).getFullYear();
    return isNaN(y) ? 1995 : y;
  }, [dob]);

  const eraTag = useMemo(() => getEraFromBirthYear(birthYear), [birthYear]);

  // Persistent random 4-digit and 2-digit suffix for this session
  const randomSuffix = useMemo(() => {
    const xxxx = Math.floor(1000 + Math.random() * 9000);
    const yyy = Math.floor(10 + Math.random() * 90);
    return `${xxxx}-${yyy}`;
  }, []);

  const generatedAccountId = useMemo(() => {
    return `BHYM-${eraTag}-${randomSuffix}`;
  }, [eraTag, randomSuffix]);

  // Live password strength criteria
  const hasMinLength = password.length >= 8;
  const hasNumOrSymbol = /[0-9!@#$%^&*()]/.test(password);
  const hasLetters = /[a-zA-Z]/.test(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // Display top 12 avatars in 3x4 grid for Step 2
  const top12Avatars = AVATARS.slice(0, 12);

  function handleGoToStep2(e: React.FormEvent) {
    e.preventDefault();
    const nextFirst = validateFirstName(firstName);
    const nextLast = validateLastName(lastName);
    const nextName = validateName(displayName);
    const nextEmail = validateEmail(email);
    const nextDob = validateDob(dob);
    const nextGender = validateGender(gender);
    const nextPassword = validatePassword(password);
    const nextConfirm = validatePasswordConfirm(password, confirmPassword);

    setFirstNameError(nextFirst);
    setLastNameError(nextLast);
    setDisplayNameError(nextName);
    setEmailError(nextEmail);
    setDobError(nextDob);
    setGenderError(nextGender);
    setPasswordError(nextPassword);
    setConfirmPasswordError(nextConfirm);

    if (
      nextFirst ||
      nextLast ||
      nextName ||
      nextEmail ||
      nextDob ||
      nextGender ||
      nextPassword ||
      nextConfirm
    ) {
      return;
    }
    setStep(2);
  }

  function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeTerms) return;

    // Save profile state to room store
    setPlayerName(displayName.trim());
    if (selectedAvatar) {
      setAvatarId(selectedAvatar);
    }

    // Submit with all required profile & generated account metadata
    submit(email, password, displayName, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob,
      gender,
      accountId: generatedAccountId,
      avatarId: selectedAvatar,
    });
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
              /* ── STEP 1: Account Information & Personal Details ── */
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
                    Join the nostalgic gaming lounge in less than a minute.
                  </p>
                </div>

                {/* Social Sign Up Buttons */}
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
                  <FormNotice tone="error" title="Couldn't create your account">
                    {error}
                  </FormNotice>
                ) : appleUnavailable ? (
                  <FormNotice tone="info" title="Apple sign-up isn't available">
                    It needs a paid Apple developer account, which this app doesn&apos;t
                    have. Google and email both work.
                  </FormNotice>
                ) : !configured ? (
                  <FormNotice tone="info" title="This build has no account service">
                    Creating an account here only unlocks hosting on this device — nothing
                    is stored on a server and no email is sent.
                  </FormNotice>
                ) : null}

                {/* Divider */}
                <div className="flex items-center gap-3 py-0.5">
                  <span className="h-px flex-1 bg-[#E6D4B5]" />
                  <span className="shrink-0 whitespace-nowrap text-[10.5px] font-extrabold text-[#9C7E63] uppercase tracking-wider">
                    or fill your details
                  </span>
                  <span className="h-px flex-1 bg-[#E6D4B5]" />
                </div>

                {/* Step 1 Form */}
                <form onSubmit={handleGoToStep2} className="space-y-3">
                  
                  {/* Row 1: First Name & Last Name (2 columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* First Name */}
                    <div>
                      <label className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                        First Name <span className="text-[#E85D04]">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        placeholder="e.g. Kethan"
                        className={`w-full bg-[#FFFDF8] border rounded-2xl px-3.5 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                          firstNameError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                        }`}
                        required
                      />
                      {firstNameError && (
                        <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                          {firstNameError}
                        </span>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                        Last Name <span className="text-[#E85D04]">*</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        placeholder="e.g. Kumar"
                        className={`w-full bg-[#FFFDF8] border rounded-2xl px-3.5 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                          lastNameError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                        }`}
                        required
                      />
                      {lastNameError && (
                        <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                          {lastNameError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Display Name (Auto-Generated & Editable) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11.5px] font-extrabold text-[#4A2508]">
                        Display Name <span className="text-[#E85D04]">*</span>
                      </label>
                      <span className="text-[10px] font-semibold text-[#86694C] bg-[#FAF2DF] px-2 py-0.5 rounded-full border border-[#E6D4B5]">
                        {isCustomDisplayName ? "Customized ✏️" : "Auto-generated 🪄"}
                      </span>
                    </div>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => handleDisplayNameChange(e.target.value)}
                        placeholder="e.g. Kethan Kumar"
                        className={`w-full bg-[#FFFDF8] border rounded-2xl pl-10 pr-10 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                          displayNameError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                        }`}
                        required
                      />
                      {displayName.trim().length >= 2 && !displayNameError && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10.5px] text-[#7A5B3E] font-medium mt-0.5 block">
                      Generated from your name. You can customize this anytime!
                    </span>
                    {displayNameError && (
                      <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                        {displayNameError}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Email Input */}
                  <div>
                    <label className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                      Email ID <span className="text-[#E85D04]">*</span>
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
                        className={`w-full bg-[#FFFDF8] border rounded-2xl pl-10 pr-4 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                          emailError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                        }`}
                        required
                      />
                    </div>
                    {emailError && (
                      <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                        {emailError}
                      </span>
                    )}
                  </div>

                  {/* Row 4: Date of Birth & Gender (2 columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Date of Birth */}
                    <div>
                      {/* `htmlFor`/`id`, not just proximity. The label existed
                          and was not ASSOCIATED, so axe reported the date input
                          as unlabelled at critical impact: a screen reader
                          announced "date, edit" with no indication of which
                          date. Visual adjacency is not an association. */}
                      <label htmlFor="signup-dob" className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                        Date of Birth <span className="text-[#E85D04]">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
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
                          /* `focus:outline-*`, not `focus-visible:`, and not a ring.
                             Measured: keyboard-focusing this date input produced
                             outline-style:none AND box-shadow:none — no visible focus
                             indicator at all, on 1 of 20 tab stops in both themes. The
                             `outline-none` suppressed the global focus ring and the
                             `ring-2` replacement never painted on this control, which is
                             exactly the failure accessibility-standards §1.2 warns about:
                             never remove an outline without an accessible replacement that
                             actually renders.

                             `:focus-visible` is the usual choice and is wrong HERE: Chromium
                             puts focus inside a date input's shadow DOM, so the host does not
                             match `:focus-visible` and the app's global
                             `*:focus-visible { box-shadow: var(--ring) }` never paints. `:focus`
                             always matches the host. A date field is only ever focused
                             deliberately, so the usual reason to prefer `:focus-visible` —
                             avoiding a ring on mouse clicks — does not apply. */
                          className={`w-full bg-[#FFFDF8] border rounded-2xl pl-10 pr-3 py-2 text-[12.5px] font-medium text-[#4A2508] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#F4C430] transition-all ${
                            dobError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                          }`}
                          required
                        />
                      </div>
                      {dobError && (
                        <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                          {dobError}
                        </span>
                      )}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                        Gender <span className="text-[#E85D04]">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {(["Male", "Female", "Other"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              setGender(g);
                              if (genderError) setGenderError(null);
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-[11.5px] font-bold border transition-all cursor-pointer text-center ${
                              gender === g
                                ? "bg-[#FAF2DF] border-[#D4A574] text-[#8C4A0E] ring-2 ring-[#F4C430]/60 shadow-xs font-black"
                                : "bg-white border-[#E6D4B5] text-[#7A5B3E] hover:border-[#D4A574]"
                            }`}
                          >
                            {g === "Male" ? "Male 👨" : g === "Female" ? "Female 👩" : "Other 🌟"}
                          </button>
                        ))}
                      </div>
                      {genderError && (
                        <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                          {genderError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Account ID & Era Badge Preview */}
                  <div className="bg-[#FAF4E6] border border-[#ECD9BA] rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <IdCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-[#7A5E45] uppercase tracking-wider">
                            Generated Account ID:
                          </span>
                          <span className="font-mono font-black text-[12px] text-[#16223B]">
                            {generatedAccountId}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#B45309] block truncate">
                          🎂 Era: {eraTag === "90S" ? "90s Kid (1991–2000)" : eraTag === "21S" ? "21st Century Kid (2001–2010)" : `${eraTag} Era`}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                      Auto-Assigned
                    </span>
                  </div>

                  {/* Row 5: Password & Confirm Password (2 columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Password */}
                    <div>
                      <label className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                        Password <span className="text-[#E85D04]">*</span>
                      </label>
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
                          placeholder="8+ characters"
                          className={`w-full bg-[#FFFDF8] border rounded-2xl pl-10 pr-9 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                            passwordError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C7E63] hover:text-[#4A2508] cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {passwordError && (
                        <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                          {passwordError}
                        </span>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-[11.5px] font-extrabold text-[#4A2508] mb-1">
                        Confirm Password <span className="text-[#E85D04]">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7E63] pointer-events-none" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmPasswordError) setConfirmPasswordError(null);
                            clearNotices();
                          }}
                          placeholder="Re-type password"
                          className={`w-full bg-[#FFFDF8] border rounded-2xl pl-10 pr-9 py-2 text-[13px] font-medium text-[#4A2508] placeholder-[#B5987A] focus:outline-none focus:ring-2 focus:ring-[#F4C430] transition-all ${
                            confirmPasswordError ? "border-[#E11D48]" : "border-[#E6D4B5]"
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C7E63] hover:text-[#4A2508] cursor-pointer"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {confirmPasswordError && (
                        <span className="text-[10px] font-bold text-[#E11D48] mt-0.5 block">
                          {confirmPasswordError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Password Rules & Match Checklist */}
                  <div className="flex items-center gap-2.5 pt-0.5 flex-wrap text-[10.5px] font-bold text-[#7A5B3E]">
                    <div className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-black ${
                        hasMinLength ? "bg-[#10B981] text-white" : "bg-[#E6D4B5] text-transparent"
                      }`}>
                        ✓
                      </span>
                      <span className={hasMinLength ? "text-[#10B981]" : "text-[#7A5B3E]"}>
                        8+ chars
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-black ${
                        hasNumOrSymbol ? "bg-[#10B981] text-white" : "bg-[#E6D4B5] text-transparent"
                      }`}>
                        ✓
                      </span>
                      <span className={hasNumOrSymbol ? "text-[#10B981]" : "text-[#7A5B3E]"}>
                        1 number/symbol
                      </span>
                    </div>

                    {confirmPassword.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-black ${
                          passwordsMatch ? "bg-[#10B981] text-white" : "bg-rose-500 text-white"
                        }`}>
                          {passwordsMatch ? "✓" : "✕"}
                        </span>
                        <span className={passwordsMatch ? "text-[#10B981]" : "text-rose-600 font-extrabold"}>
                          {passwordsMatch ? "Passwords match" : "Doesn't match"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Next CTA Button */}
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#FFB703] via-[#F4C430] to-[#E85D04] hover:from-[#F4C430] hover:to-[#D45000] text-[#4A2508] font-extrabold py-2.5 rounded-full text-[14px] shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <span>Next: Choose Avatar</span>
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
                className="space-y-3.5"
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
                      Pick an avatar to represent you at the table.
                    </p>
                  </div>
                </div>

                {/* Account Summary Banner */}
                <div className="bg-[#FAF4E6] border border-[#ECD9BA] rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500 bg-white flex-shrink-0">
                      <img
                        src={findAvatar(selectedAvatar)?.src || "/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg"}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[13px] text-[#16223B] truncate">
                        {displayName}
                      </div>
                      <div className="font-mono text-[10.5px] text-[#7A5E45] truncate">
                        ID: <span className="font-bold text-[#16223B]">{generatedAccountId}</span> • {email}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0">
                    {gender}
                  </span>
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
                    <span>View more avatars</span>
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

                  {error ? (
                    <FormNotice tone="error" title="Couldn't create your account">
                      {error}
                    </FormNotice>
                  ) : null}

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
                    <span>{loading ? "Creating account..." : "Create account & Play 🚀"}</span>
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
