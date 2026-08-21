import type { BhalyamGameSlug } from "../components/bhalyam/data";

const FAVOURITES_KEY = "bhalyam.favourites";

class FavouritesManagerService {
  private cache: BhalyamGameSlug[] | null = null;
  private listeners = new Set<() => void>();

  private load(): BhalyamGameSlug[] {
    if (this.cache !== null) return this.cache;
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(FAVOURITES_KEY);
      if (!raw) {
        this.cache = [];
        return this.cache;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cache = [];
        return this.cache;
      }

      this.cache = parsed.filter((slug): slug is BhalyamGameSlug => typeof slug === "string");
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
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(this.cache));
      }
    } catch {
      /* quota / private mode fallback */
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

  public getFavourites(): BhalyamGameSlug[] {
    return this.load().slice();
  }

  public isFavourite(slug: BhalyamGameSlug): boolean {
    return this.load().includes(slug);
  }

  public toggleFavourite(slug: BhalyamGameSlug): boolean {
    const list = this.load();
    const index = list.indexOf(slug);
    let isNowFav: boolean;

    if (index >= 0) {
      list.splice(index, 1);
      isNowFav = false;
    } else {
      list.push(slug);
      isNowFav = true;
    }

    this.cache = list;
    this.save();
    this.notify();
    return isNowFav;
  }

  public addFavourite(slug: BhalyamGameSlug): void {
    const list = this.load();
    if (!list.includes(slug)) {
      list.push(slug);
      this.cache = list;
      this.save();
      this.notify();
    }
  }

  public removeFavourite(slug: BhalyamGameSlug): void {
    const list = this.load();
    const index = list.indexOf(slug);
    if (index >= 0) {
      list.splice(index, 1);
      this.cache = list;
      this.save();
      this.notify();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const FavouritesManager = new FavouritesManagerService();
