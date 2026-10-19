import { useRef, type KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { useTheme } from "../../lib/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import {
  MINUTE_CHOICES,
  PEOPLE_MAX,
  PEOPLE_MIN,
  stepPeople,
  type TableFit as TableFitValue,
} from "./tableFit";
import type { PlayWay } from "./playWay";

/**
 * "How many of you, and how long have you got?" — the table builder's controls.
 *
 * Lives inside the way panel and only exists once a way is chosen. The headcount
 * stepper is for a table, so it is hidden for "alone" (a one-player game has no
 * headcount). Both answers start at "Any" and neither is remembered: they
 * describe tonight, not the person.
 *
 * Headcount is a stepper, not chips, because the range is 2 to 12 and seven
 * chips would not fit a 375px panel. Time is chips because there are only three
 * answers and seeing them all at once is the point. The chips are a radio group
 * (one tab stop, arrows move and select), same contract as the way cards.
 */

interface TimeOption {
  value: number | null;
  label: string;
}

const TIME_OPTIONS: readonly TimeOption[] = [
  { value: null, label: "Any time" },
  ...MINUTE_CHOICES.map((m) => ({ value: m, label: `Up to ${m} min` })),
];

export function TableFitControls({
  way,
  fit,
  onChange,
}: {
  way: PlayWay;
  fit: TableFitValue;
  onChange: (next: TableFitValue) => void;
}) {
  const { play } = useAudio();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeTime = Math.max(
    0,
    TIME_OPTIONS.findIndex((o) => o.value === fit.minutes),
  );

  function pickTime(index: number) {
    const { value } = TIME_OPTIONS[index];
    if (value === fit.minutes) return;
    play(AUDIO.UI_TOGGLE);
    onChange({ ...fit, minutes: value });
  }

  function onChipKeyDown(event: KeyboardEvent, index: number) {
    const last = TIME_OPTIONS.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    pickTime(next);
    chipRefs.current[next]?.focus();
  }

  function stepHeadcount(direction: 1 | -1) {
    play(AUDIO.UI_TOGGLE);
    onChange({ ...fit, people: stepPeople(fit.people, direction) });
  }

  const labelClass = `text-[13px] font-semibold ${isDark ? "text-zinc-200" : "text-[#3B332A]"}`;
  const stepperButton = `flex h-11 w-11 shrink-0 items-center justify-center rounded-full border cursor-pointer
    transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:transform-none
    disabled:cursor-not-allowed disabled:opacity-40
    focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
      isDark
        ? "border-white/20 text-white hover:bg-white/10"
        : "border-[#D9C7A8] bg-white/70 text-[#1D2C4A] hover:bg-white"
    }`;

  return (
    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-10">
      {way === "friends" && (
        <div role="group" aria-labelledby="table-fit-people" className="flex flex-col gap-1.5">
          <span id="table-fit-people" className={labelClass}>
            How many of you?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepperButton}
              onClick={() => stepHeadcount(-1)}
              disabled={fit.people === null}
              aria-label="Fewer people"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className={`min-w-[7.5rem] text-center text-[15px] font-bold tabular-nums ${
                isDark ? "text-white" : "text-[#1D2C4A]"
              }`}
            >
              {fit.people === null ? "Any number" : `${fit.people} people`}
            </span>
            <button
              type="button"
              className={stepperButton}
              onClick={() => stepHeadcount(1)}
              disabled={fit.people === PEOPLE_MAX}
              aria-label="More people"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
            {fit.people === null && (
              <span className="sr-only">Starts at {PEOPLE_MIN} people</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span id="table-fit-time" className={labelClass}>
          How long have you got?
        </span>
        <div role="radiogroup" aria-labelledby="table-fit-time" className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((option, index) => {
            const selected = index === activeTime;
            return (
              <button
                key={option.label}
                ref={(el) => {
                  chipRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => pickTime(index)}
                onKeyDown={(e) => onChipKeyDown(e, index)}
                className={`min-h-[44px] rounded-full border px-4 text-[13px] font-bold whitespace-nowrap cursor-pointer
                  transition-[background-color,color,border-color] duration-150
                  focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    selected
                      ? isDark
                        ? "border-amber-300 bg-amber-300 text-amber-950"
                        : "border-[#1D2C4A] bg-[#1D2C4A] text-white"
                      : isDark
                        ? "border-white/20 text-zinc-200 hover:bg-white/10"
                        : "border-[#D9C7A8] bg-white/70 text-[#5C4532] hover:bg-white"
                  }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
