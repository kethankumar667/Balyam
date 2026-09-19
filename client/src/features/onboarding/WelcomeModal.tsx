import React from "react";
import { HoloDeckOnboardingModal } from "./HoloDeckOnboardingModal";

export interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartQuest?: () => void;
}

/**
 * Platform Welcome Modal (Holo-Deck Onboarding)
 * Upgraded to futuristic MAANG/FAANG standards with 5 interactive discovery stages.
 */
export const WelcomeModal: React.FC<WelcomeModalProps> = (props) => {
  return <HoloDeckOnboardingModal {...props} />;
};

export default WelcomeModal;
