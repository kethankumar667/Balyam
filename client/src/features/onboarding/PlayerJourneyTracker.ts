import type { OnboardingMilestone, PlayerOnboardingState } from "@shared/onboarding/PlayerJourney";

const ONBOARDING_STORAGE_KEY = "bhalyam.onboarding.state";

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

  private load(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const data = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (data) {
          this.state = JSON.parse(data);
        }
      }
    } catch {
      // Ignore storage errors in restricted iframe/private mode
    }
  }

  private save(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {
      // Ignore storage errors
    }
  }

  public getState(): PlayerOnboardingState {
    return { ...this.state };
  }

  public markWelcomeComplete(): void {
    this.state.hasCompletedWelcome = true;
    this.save();
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
    this.save();
  }
}

export const journeyTracker = PlayerJourneyTracker.getInstance();
