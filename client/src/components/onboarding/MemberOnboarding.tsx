import { useState } from "react";
import ProfileCompletionPrompt from "../profile/ProfileCompletionPrompt";
import ReferralCodePrompt from "./ReferralCodePrompt";
import WelcomeCelebration from "./WelcomeCelebration";
import { useConsentPending } from "../../hooks/useConsentPending";
import { useAuthStore } from "../../store/authStore";

/**
 * The first-run order for a signed-in member, one dialog at a time:
 *
 *   1. the privacy choice (`ConsentModal`, mounted at the app root) — nothing here appears until it is answered;
 *   2. the profile questions: birthday and gender, then an avatar (`ProfileCompletionPrompt`);
 *   3. a friend's referral code, for a new member who has not added one (`ReferralCodePrompt`);
 *   4. the welcome, which is also what releases the welcome coins (`WelcomeCelebration`).
 *
 * Before this, the privacy dialog and the profile questions opened together and fought for the
 * screen, and the welcome coins were paid silently the moment the wallet was made. Each step now
 * waits for the one before it to report back — the privacy answer through `useConsentPending`, the
 * profile step through `onFinished` (saved, skipped with "Not now", or nothing to ask).
 *
 * Mount it with a `key` of the member's id: a different member signing in on the same device starts
 * their own order from the top.
 */
export default function MemberOnboarding() {
  const isConsentPending = useConsentPending();
  const profileReady = useAuthStore((state) => state.profileReady);
  const [isProfileDone, setIsProfileDone] = useState(false);
  const [isReferralDone, setIsReferralDone] = useState(false);

  if (isConsentPending || profileReady === false) return null;
  if (!isProfileDone) return <ProfileCompletionPrompt onFinished={() => setIsProfileDone(true)} />;
  if (!isReferralDone) return <ReferralCodePrompt onFinished={() => setIsReferralDone(true)} />;
  return <WelcomeCelebration />;
}
