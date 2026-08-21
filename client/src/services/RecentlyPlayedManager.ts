import type { BhalyamGameSlug } from "../components/bhalyam/data";

const RECENTLY_PLAYED_KEY = "bhalyam.recently_played";
const MAX_RECENT_ITEMS = 10;

export interface RecentlyPlayedItem {
  slug: BhalyamGameSlug;
  lastPlayedAt: number; // Unix epoch ms
  playCount: number;
}

class RecentlyPlayedManagerService {
  private cache: RecentlyPlayedItem[] | null = null;
  private listeners = new Set<() => void>();

  private load(): RecentlyPlayedItem[] {
    if (this.cache !== null) return this.cache;
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
      if (!raw) {
        this.cache = [];
        return this.cache;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cache = [];
        return this.cache;
      }

      this.cache = parsed
        .filter((item): item is RecentlyPlayedItem =>
          typeof item?.slug === "string" && typeof item?.lastPlayedAt === "number"
        )
        .slice(0, MAX_RECENT_ITEMS);

      return this.cache;
    } catch {
      this.cache = [];
      return this.cache;
    }
  }

  private save(): void {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      if (this.cache) {
        localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(this.cache));
      }
    } catch {
      /* quota exceeded / private mode fallback */
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* listener error isolation */
      }
    }
  }

  public getRecentlyPlayed(): RecentlyPlayedItem[] {
    return this.load().slice();
  }

  public recordRecentlyPlayed(slug: BhalyamGameSlug): void {
    const list = this.load();
    const now = Date.now();
    const existingIndex = list.findIndex((item) => item.slug === slug);

    let updatedItem: RecentlyPlayedItem;
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      updatedItem = {
        slug,
        lastPlayedAt: now,
        playCount: (existing.playCount || 1) + 1,
      };
      list.splice(existingIndex, 1);
    } else {
      updatedItem = {
        slug,
        lastPlayedAt: now,
        playCount: 1,
      };
    }

    // Insert at front (newest first)
    list.unshift(updatedItem);

    // Limit to max 10
    if (list.length > MAX_RECENT_ITEMS) {
      list.length = MAX_RECENT_ITEMS;
    }

    this.cache = list;
    this.save();
    this.notify();
  }

  public clearRecentlyPlayed(): void {
    this.cache = [];
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(RECENTLY_PLAYED_KEY);
      } catch {
        /* ignore */
      }
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const RecentlyPlayedManager = new RecentlyPlayedManagerService();
