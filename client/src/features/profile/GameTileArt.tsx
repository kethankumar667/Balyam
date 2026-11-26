import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { tileImageForGame } from "../myrecords/records";

const FRAME =
  "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-300/80 bg-surface-0 dark:border-slate-700/80";

/**
 * A game's tile picture as a small square, shown before its name in a list row.
 *
 * Decorative: the name sits right beside it, so it is hidden from assistive tech. The art is the same set the
 * home tiles use (`tileImageForGame`), served as AVIF or WebP where the browser can, because the PNG originals
 * are megabytes and this is a 44px thumbnail. A game with no art, or art that fails to load, shows a plain
 * controller icon in the same frame, so a row never has a hole or a broken-image mark.
 */
export default function GameTileArt({ game }: { game: string }) {
  const [failed, setFailed] = useState(false);
  const art = tileImageForGame(game);

  if (!art || failed) {
    return (
      <span aria-hidden="true" className={`${FRAME} text-ink-mid`}>
        <Gamepad2 className="h-5 w-5" />
      </span>
    );
  }

  // Names such as "Bingo Tile.png" hold a space, which splits a srcset entry in two: encode the path first.
  const png = encodeURI(art);
  const modern = (extension: string) => png.replace(/\.png$/i, `.${extension}`);

  return (
    <span aria-hidden="true" className={FRAME}>
      {/* `picture` is inline by default, which stops the image filling the frame's height. */}
      <picture className="block h-full w-full">
        <source type="image/avif" srcSet={modern("avif")} />
        <source type="image/webp" srcSet={modern("webp")} />
        <img
          src={png}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </picture>
    </span>
  );
}
