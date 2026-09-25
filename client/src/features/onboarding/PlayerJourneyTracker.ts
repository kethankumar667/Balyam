import type { OnboardingMilestone, PlayerOnboardingState } from "@shared/onboarding/PlayerJourney";
import { readConsent } from "../../lib/privacy/consent";

const ONBOARDING_STORAGE_KEY = "bhalyam.onboarding.state";
/** Session-only markers (cleared by the browser when the tab closes; never written to localStorage). */
const TOUR_OFFERED_KEY = "bhalyam.tour.offered";
const TOUR_PROMPT_DISMISSED_KEY = "bhalyam.tour.promptDismissed";

/** Fallback for the rare browser where sessionStorage throws, so a flag still holds until reload. */
const memoryFlags = new Set<string>();

export class PlayerJourneyTracker {
  private static instance: PlayerJourneyTracker;

  private state: PlayerOnboardingState = {
    hasCompletedWelcome: false,
    completedMilestones: [],
  };

  private constructor() {
    this.load();
  }

  public static getInstance(): PlayerJourneyTracker {
    if (!PlayerJourneyTracker.instance) {
      PlayerJourneyTracker.instance = new PlayerJourneyTracker();
    }
    return PlayerJourneyTracker.instance;
  }

  /**
   * False once someone has chosen "Only what's essential". This is optional
   * "progress" data, and the consent layer purges optional keys on every load, so
   * writing it to localStorage for that person would only make the tour reappear
   * after each reload. It is kept for the tab session instead, where it honours
   * the choice and still stops the repeat.
   */
  public isPersistenceAllowed(): boolean {
    return readConsent()?.choice !== "essential-only";
  }

  private store(): Storage | null {
    try {
      if (typeof window === "undefined") return null;
      return this.isPersistenceAllowed() ? window.localStorage : window.sessionStorage;
    } catch {
      // Ignore storage errors in restricted iframe/private mode
      return null;
    }
  }

  private load(): void {
    try {
      const data = this.store()?.getItem(ONBOARDING_STORAGE_KEY);
      if (data) {
        this.state = JSON.parse(data);
      }
    } catch {
      // Ignore storage errors / corrupt JSON
    }
  }

  private save(): void {
    try {
      this.store()?.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage errors
    }
  }

  private readFlag(key: string): boolean {
    try {
      return window.sessionStorage.getItem(key) === "1" || memoryFlags.has(key);
    } catch {
      return memoryFlags.has(key);
    }
  }

  private writeFlag(key: string): void {
    memoryFlags.add(key);
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      // memoryFlags still holds it until reload
    }
  }

  public getState(): PlayerOnboardingState {
    return { ...this.state };
  }

  public markWelcomeComplete(): void {
    this.state.hasCompletedWelcome = true;
    this.save();
  }

  /** The tour has already been put in front of this person in this visit (so a reload does not do it again). */
  public wasTourOffered(): boolean {
    return this.readFlag(TOUR_OFFERED_KEY);
  }

  public markTourOffered(): void {
    this.writeFlag(TOUR_OFFERED_KEY);
  }

  /** "Not now" on the quiet tour prompt. Lasts for this visit only. */
  public isTourPromptDismissed(): boolean {
    return this.readFlag(TOUR_PROMPT_DISMISSED_KEY);
  }

  public dismissTourPrompt(): void {
    this.writeFlag(TOUR_PROMPT_DISMISSED_KEY);
  }

  public markMilestone(milestone: OnboardingMilestone): void {
    if (!this.state.completedMilestones.includes(milestone)) {
      this.state.completedMilestones.push(milestone);
      this.save();
    }
  }

  public isMilestoneComplete(milestone: OnboardingMilestone): boolean {
    return this.state.completedMilestones.includes(milestone);
  }

  public getCompletionPercentage(): number {
    const total = 5; // 5 Starter Quests
    const completed = this.state.completedMilestones.length;
    return Math.min(100, Math.round((completed / total) * 100));
  }

  public reset(): void {
    this.state = {
      hasCompletedWelcome: false,
      completedMilestones: [],
    };
    memoryFlags.clear();
    try {
      window.sessionStorage.removeItem(TOUR_OFFERED_KEY);
      window.sessionStorage.removeItem(TOUR_PROMPT_DISMISSED_KEY);
    } catch {
      // Ignore storage errors
    }
    this.save();
  }
}

export const journeyTracker = PlayerJourneyTracker.getInstance();
