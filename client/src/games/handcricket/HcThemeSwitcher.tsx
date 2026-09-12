import type { ReactNode } from "react";
import { HC_SKINS, type HcSkin } from "./hc-skin";

/**
 * The 3-way theme switcher every Hand Cricket header renders.
 *
 * Structural only — no colours of its own. Each theme (broadcast, doordarshan,
 * nostalgia) has its own header chrome and must not visually announce a
 * DIFFERENT theme's palette while sitting inside it, so this component owns
 * only the semantics (button group, current-value a11y) and hands every
 * pixel of each chip to the caller's `renderOption`.
 *
 * Replaces the old per-skin binary toggle (`HeaderBtn`/`renderBroadcastButton`,
 * each hardcoded to flip to exactly one other skin) now that there are three
 * themes instead of two — a single "switch to the other one" button no
 * longer has a well-defined target.
 */
export function HcThemeSwitcher({
  current,
  onChange,
  renderOption,
  className = "",
}: {
  current: HcSkin;
  onChange: (skin: HcSkin) => void;
  renderOption: (opt: { id: HcSkin; label: string }, isActive: boolean) => ReactNode;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Hand Cricket theme" className={`inline-flex items-center gap-1 ${className}`}>
      {HC_SKINS.map((opt) => {
        const isActive = opt.id === current;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.id)}
            className="cursor-pointer disabled:cursor-default"
            disabled={isActive}
          >
            {renderOption(opt, isActive)}
          </button>
        );
      })}
    </div>
  );
}
