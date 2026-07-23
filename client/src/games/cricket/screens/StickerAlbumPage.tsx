import { useNavigate } from "react-router-dom";
import { AchievementSticker, GamePageShell, NotebookSurface } from "../components";
import { ACHIEVEMENT_DEFS } from "../achievements";
import { useStickerStore } from "../stickerStore";

/**
 * Sticker Album — the full catalog of real, honestly-derived achievements
 * (achievements.ts). Unlocked stickers show their earn count; locked ones
 * stay visible (muted) with the real description, so the goal is never a
 * mystery box.
 */
export function StickerAlbumPage() {
  const navigate = useNavigate();
  const unlocked = useStickerStore((s) => s.unlocked);
  const unlockedCount = Object.keys(unlocked).length;

  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={() => navigate("/cricket/profile")}
          className="w-full rounded-2xl bg-[#2E7D32] py-3.5 font-black text-white active:scale-95"
        >
          Back to profile
        </button>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <h1 className="text-center font-display text-2xl text-[#3A2210]">Sticker Album</h1>
        <p className="mt-1 text-center text-sm text-[#6D4323]/80">
          {unlockedCount} / {ACHIEVEMENT_DEFS.length} unlocked
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {ACHIEVEMENT_DEFS.map((def) => {
            const earned = unlocked[def.id];
            return (
              <div key={def.id} className="relative">
                <AchievementSticker title={def.title} description={def.description} glyph={def.glyph} locked={!earned} />
                {earned && earned.timesEarned > 1 && (
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#C0392B] text-[10px] font-black text-white shadow-md">
                    ×{earned.timesEarned}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default StickerAlbumPage;
