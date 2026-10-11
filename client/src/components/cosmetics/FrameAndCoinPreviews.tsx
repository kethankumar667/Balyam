import SeatAvatar from "../profile/SeatAvatar";
import { CarromCoinDisc } from "../../games/carrom/CarromCoinPattern";
import { getCarromCoinSetStyle } from "../../lib/carromCoinSetStyles";
import type { PreviewMode } from "./previewModes";

/**
 * The shop's preview stage content for the two newest categories.
 *
 * Frames are shown at three sizes (profile, a game seat, a lobby row) because the question a
 * buyer actually has is "will this still look right small?". Coin sets are shown up close and
 * then on a miniature board, because a coin that looks lovely alone can disappear against felt.
 */

interface FramePreviewProps {
  frameId: string;
  mode: PreviewMode;
  displayName: string;
  avatarId: string | null;
}

export function EnchantedAvatarFramePreview({ frameId, mode, displayName, avatarId }: FramePreviewProps) {
  const portrait = (sizeClass: string, frameScale = 1) => (
    <SeatAvatar
      avatar={avatarId ?? undefined}
      frame={frameId}
      frameScale={frameScale}
      name={displayName}
      className={sizeClass}
    />
  );

  if (mode === "GAME_SEAT") {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="flex w-56 items-center gap-3 rounded-2xl border-2 border-zinc-700/80 bg-[#0b1220] px-4 py-3 shadow-xl">
          {portrait("h-9 w-9")}
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{displayName}</p>
            <p className="font-mono text-[10px] text-zinc-400">Your turn</p>
          </div>
        </div>
        <span className="font-mono text-[10px] text-zinc-400">As seen on a game seat</span>
      </div>
    );
  }

  if (mode === "LOBBY") {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <ul className="flex w-56 flex-col gap-2 rounded-2xl border-2 border-zinc-700/80 bg-[#0b1220] p-3 shadow-xl">
          {[displayName, "Ravi", "Meena"].map((name, index) => (
            <li key={name} className="flex items-center gap-2.5">
              {index === 0 ? portrait("h-7 w-7") : <span className="h-7 w-7 rounded-full bg-zinc-700" />}
              <span className={`text-xs font-bold ${index === 0 ? "text-white" : "text-zinc-500"}`}>{name}</span>
            </li>
          ))}
        </ul>
        <span className="font-mono text-[10px] text-zinc-400">As seen in the lobby</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="p-4">{portrait("h-24 w-24", 2)}</div>
      <span className="text-xs font-bold text-white">{displayName}</span>
    </div>
  );
}

interface CoinSetPreviewProps {
  setId: string;
  mode: PreviewMode;
}

/** Where the coins sit on the miniature board, in percent of its width and height. */
const BOARD_COINS: ReadonlyArray<{ x: number; y: number; side: "white" | "black" | "queen" }> = [
  { x: 50, y: 50, side: "queen" },
  { x: 50, y: 36, side: "white" },
  { x: 62, y: 43, side: "black" },
  { x: 62, y: 57, side: "white" },
  { x: 50, y: 64, side: "black" },
  { x: 38, y: 57, side: "white" },
  { x: 38, y: 43, side: "black" },
  { x: 50, y: 22, side: "black" },
  { x: 74, y: 50, side: "white" },
  { x: 26, y: 50, side: "black" },
  { x: 50, y: 78, side: "white" },
];

export function EnchantedCarromCoinSetPreview({ setId, mode }: CoinSetPreviewProps) {
  const style = getCarromCoinSetStyle(setId);

  if (mode === "ON_BOARD") {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <div
          className="relative h-48 w-48 rounded-xl border-[6px] border-[#5C361E] shadow-2xl"
          style={{ background: "radial-gradient(circle at 50% 40%, #E8C98B, #C9A266)" }}
        >
          {BOARD_COINS.map((coin, index) => (
            <span
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${coin.x}%`, top: `${coin.y}%` }}
            >
              <CarromCoinDisc
                face={style[coin.side]}
                pattern={style.pattern}
                size={coin.side === "queen" ? 22 : 20}
                isQueen={coin.side === "queen"}
              />
            </span>
          ))}
        </div>
        <span className="font-mono text-[10px] text-zinc-400">Mid-game, on the board</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex items-end gap-3">
        <CarromCoinDisc face={style.white} pattern={style.pattern} size={72} />
        <CarromCoinDisc face={style.queen} pattern={style.pattern} size={84} isQueen />
        <CarromCoinDisc face={style.black} pattern={style.pattern} size={72} />
      </div>
      <span className="font-mono text-[10px] text-zinc-400">White side, queen, black side</span>
    </div>
  );
}
