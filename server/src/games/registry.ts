import type { GameKind } from "@shared/types.js";
import type { GameEngine } from "./GameEngine.js";
import { RpsEngine } from "./rps/RpsEngine.js";
import { RummyEngine } from "./rummy/RummyEngine.js";
import { LudoEngine } from "./ludo/LudoEngine.js";
import { SnlEngine } from "./snl/SnlEngine.js";
import { HandCricketEngine } from "./handcricket/HandCricketEngine.js";
import { UnoEngine } from "./uno/UnoEngine.js";

export function createEngine(kind: GameKind): GameEngine {
  switch (kind) {
    case "rps":
      return new RpsEngine();
    case "rummy":
      return new RummyEngine();
    case "ludo":
      return new LudoEngine();
    case "snl":
      return new SnlEngine();
    case "handcricket":
      return new HandCricketEngine();
    case "uno":
      return new UnoEngine();
    default:
      throw new Error(`Game not implemented yet: ${kind}`);
  }
}

export function getGameLimits(kind: GameKind): { min: number; max: number } {
  switch (kind) {
    case "rps":
      return { min: 2, max: 2 };
    case "rummy":
      return { min: 2, max: 6 };
    case "ludo":
      return { min: 2, max: 4 };
    case "snl":
      return { min: 2, max: 10 };
    case "handcricket":
      return { min: 2, max: 2 };
    case "uno":
      return { min: 2, max: 8 };
  }
}
