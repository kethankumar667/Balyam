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
    // No defensive .slice() here — this is useSyncExternalStore's
    // getSnapshot. It must return the SAME reference across calls until
    // the data actually changes, or React sees a "new" value on every
    // render and re-renders forever ("Maximum update depth exceeded").
    // `this.cache` only gets a new reference when toggleFavourite /
    // addFavourite / removeFavourite / the first load() actually change
    // the data.
    return this.load();
  }

  public isFavourite(slug: BhalyamGameSlug): boolean {
    return this.load().includes(slug);
  }

  public toggleFavourite(slug: BhalyamGameSlug): boolean {
    const list = this.load();
    const isNowFav = !list.includes(slug);

    // A NEW array, not a mutated one — this.cache must change REFERENCE,
    // not just contents. getFavourites() intentionally stopped defensively
    // copying (see its comment) so useSyncExternalStore can tell "changed"
    // from "unchanged" via a plain reference check; mutating the existing
    // array in place (the previous `list.splice`/`list.push` here) left
    // that reference identical before and after, so React never re-rendered
    // — the favourite toggled in storage but the heart icon never updated.
    this.cache = isNowFav ? [...list, slug] : list.filter((s) => s !== slug);
    this.save();
    this.notify();
    return isNowFav;
  }

  public addFavourite(slug: BhalyamGameSlug): void {
    const list = this.load();
    if (!list.includes(slug)) {
      this.cache = [...list, slug];
      this.save();
      this.notify();
    }
  }

  public removeFavourite(slug: BhalyamGameSlug): void {
    const list = this.load();
    if (list.includes(slug)) {
      this.cache = list.filter((s) => s !== slug);
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
