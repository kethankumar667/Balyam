import { useRef } from "react";
import type { Achievement } from "@shared/profile/Achievements";
import Modal from "../../components/Modal";
import { VaultBadge } from "./VaultAchievementCard";

interface AchievementRevealModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AchievementRevealModal({ achievement, isOpen, onClose }: AchievementRevealModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  if (!isOpen || !achievement) return null;
  return <Modal open={isOpen} onClose={onClose} initialFocusRef={closeButtonRef} ariaLabelledBy="achModalTitle" ariaDescribedBy="achModalDescription" mobileSheet panelClassName="trophy-vault w-full max-w-md">
    <div className="relative overflow-hidden rounded-t-3xl border border-[var(--vault-edge)] bg-[var(--vault-canvas)] p-6 text-center text-[var(--vault-ink)] shadow-2xl md:rounded-3xl sm:p-8">
      <p className="mb-5 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--vault-gold)]">A memory in the making</p>
      <div className="flex justify-center"><VaultBadge achievement={achievement} large /></div>
      <h2 id="achModalTitle" className="mt-5 font-display text-2xl">{achievement.title}</h2>
      <p id="achModalDescription" className="mt-3 text-sm leading-relaxed text-[var(--vault-soft)]">{achievement.description}</p>
      <div className="my-6 rounded-xl border border-[var(--vault-edge)] bg-[var(--vault-panel)] p-4 text-sm">
        <p className={achievement.unlocked ? "font-bold text-[var(--vault-green)]" : "font-bold text-[var(--vault-gold)]"}>{achievement.unlocked ? "✓ Unlocked & Recorded" : `In Progress (${achievement.currentProgress} / ${achievement.targetValue})`}</p>
        {achievement.unlocked && achievement.unlockedAt ? <p className="mt-2 text-xs text-[var(--vault-soft)]">Unlocked {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(achievement.unlockedAt)}</p> : null}
      </div>
      <button ref={closeButtonRef} type="button" onClick={onClose} className="min-h-[48px] w-full rounded-xl border border-[var(--vault-gold)] bg-[var(--vault-panel)] text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vault-gold)]">Close</button>
    </div>
  </Modal>;
}
