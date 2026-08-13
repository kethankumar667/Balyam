import type { GameKind } from "@shared/types.js";
import type { GameEngine } from "./GameEngine.js";
import { RpsEngine } from "./rps/RpsEngine.js";
import { RummyEngine } from "./rummy/RummyEngine.js";
import { LudoEngine } from "./ludo/LudoEngine.js";
import { SnlEngine } from "./snl/SnlEngine.js";
import { HandCricketEngine } from "./handcricket/HandCricketEngine.js";
import { UnoEngine } from "./uno/UnoEngine.js";
import { WordBuildingEngine } from "./wordbuilding/WordBuildingEngine.js";
import { DotsBoxesEngine } from "./dotsboxes/DotsBoxesEngine.js";
import { StarGameEngine } from "./stargame/StarGameEngine.js";
import { BingoEngine } from "./bingo/BingoEngine.js";
import { NamePlaceAnimalEngine } from "./namesplaceanimal/NamePlaceAnimalEngine.js";
import { TambolaEngine } from "./tambola/TambolaEngine.js";
import { SamethaluEngine } from "./samethalu/SamethaluEngine.js";
import { TeluguCinemaluEngine } from "./telugucinemalu/TeluguCinemaluEngine.js";
import { SnakeEngine } from "./snake/SnakeEngine.js";
import { VyomaYudhEngine } from "./vyomayudh/VyomaYudhEngine.js";
import { CarromEngine } from "./carrom/CarromEngine.js";
import { ChessEngine } from "./chess/ChessEngine.js";
import { BlockBlastEngine } from "./blockblast/BlockBlastEngine.js";

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
    case "wordbuilding":
      return new WordBuildingEngine();
    case "dotsboxes":
      return new DotsBoxesEngine();
    case "stargame":
      return new StarGameEngine();
    case "bingo":
      return new BingoEngine();
    case "namesplaceanimal":
      return new NamePlaceAnimalEngine();
    case "tambola":
      return new TambolaEngine();
    case "samethalu":
      return new SamethaluEngine();
    case "telugucinemalu":
      return new TeluguCinemaluEngine();
    case "snake":
      return new SnakeEngine();
    case "vyomayudh":
      return new VyomaYudhEngine();
    case "carrom":
      return new CarromEngine();
    case "chess":
      return new ChessEngine();
    case "blockblast":
      return new BlockBlastEngine();
    default:
      throw new Error(`Game not implemented yet: ${kind}`);
  }
}

export function getGameLimits(kind: GameKind): { min: number; max: number } {
  const limits: Record<string, { min: number; max: number }> = {
    rps: { min: 2, max: 2 },
    rummy: { min: 2, max: 6 },
    ludo: { min: 2, max: 8 },
    snl: { min: 2, max: 6 },
    handcricket: { min: 2, max: 2 },
    uno: { min: 2, max: 10 },
    wordbuilding: { min: 2, max: 8 },
    dotsboxes: { min: 2, max: 4 },
    stargame: { min: 2, max: 4 },
    bingo: { min: 1, max: 8 },
    namesplaceanimal: { min: 2, max: 8 },
    tambola: { min: 1, max: 12 },
    samethalu: { min: 1, max: 1 },
    telugucinemalu: { min: 1, max: 1 },
    snake: { min: 1, max: 4 },
    vyomayudh: { min: 1, max: 1 },
    carrom: { min: 2, max: 2 },
    chess: { min: 2, max: 2 },
    // One seat is a legitimate game here (endless solo), not a lobby waiting
    // to fill — the engine switches mode on seat count.
    blockblast: { min: 1, max: 8 },
  };

  return limits[kind] ?? { min: 2, max: 4 };
}
