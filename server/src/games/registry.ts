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
import { SnakeEngine } from "./snake/SnakeEngine.js";
import { CarromEngine } from "./carrom/CarromEngine.js";
import { ChessEngine } from "./chess/ChessEngine.js";
import { BlockBlastEngine } from "./blockblast/BlockBlastEngine.js";
import { SpaceWarEngine } from "./spacewar/SpaceWarEngine.js";

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
    case "snake":
      return new SnakeEngine();
    case "carrom":
      return new CarromEngine();
    case "chess":
      return new ChessEngine();
    case "blockblast":
      return new BlockBlastEngine();
    case "spacewar":
      return new SpaceWarEngine();
    default:
      throw new Error(`Game not implemented yet: ${kind}`);
  }
}

import { getGameLimits } from "@shared/catalog.js";
export { getGameLimits };
