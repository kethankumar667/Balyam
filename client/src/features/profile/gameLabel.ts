import { getGameById } from "../../catalog/gameCatalog";

export function getProfileGameLabel(game: string): string {
  if (game === "none") return "Not set";
  return getGameById(game)?.name ?? game;
}
