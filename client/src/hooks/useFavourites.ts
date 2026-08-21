import { useSyncExternalStore } from "react";
import { FavouritesManager } from "../services/FavouritesManager";
import type { BhalyamGameSlug } from "../components/bhalyam/data";

export function useFavourites(): {
  favourites: BhalyamGameSlug[];
  isFavourite: (slug: BhalyamGameSlug) => boolean;
  toggleFavourite: (slug: BhalyamGameSlug) => boolean;
  addFavourite: (slug: BhalyamGameSlug) => void;
  removeFavourite: (slug: BhalyamGameSlug) => void;
} {
  const favourites = useSyncExternalStore(
    FavouritesManager.subscribe.bind(FavouritesManager),
    () => FavouritesManager.getFavourites(),
    () => []
  );

  return {
    favourites,
    isFavourite: (slug: BhalyamGameSlug) => favourites.includes(slug),
    toggleFavourite: FavouritesManager.toggleFavourite.bind(FavouritesManager),
    addFavourite: FavouritesManager.addFavourite.bind(FavouritesManager),
    removeFavourite: FavouritesManager.removeFavourite.bind(FavouritesManager),
  };
}
