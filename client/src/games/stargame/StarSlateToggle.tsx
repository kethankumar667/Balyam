import { Palette } from "lucide-react";
import { useSchoolSlate } from "../../lib/schoolSlate";

/**
 * Turns the earned School Slate on and off for Star Game. It is the game's only theme control, so it is shown only to
 * an account that owns the slate (or is wearing it); everyone else has nothing to choose.
 */
export default function StarSlateToggle({ className = "" }: { className?: string }) {
  const { isOn, isOwned, error, setOn } = useSchoolSlate("stargame");
  if (!isOn && !isOwned) return null;
  const label = isOn ? "Switch off the School Slate theme" : "Switch on the School Slate theme";
  return (
    <button
      type="button"
      onClick={() => void setOn(!isOn)}
      aria-pressed={isOn}
      aria-label={label}
      title={error ?? label}
      className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
        isOn ? "border-amber-300/70 bg-amber-300/15 text-amber-200" : "border-white/15 bg-white/5 text-slate-200 hover:text-white"
      } ${className}`}
    >
      <Palette className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
