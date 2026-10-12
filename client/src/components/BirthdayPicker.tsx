import { forwardRef, useCallback, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { defaultBirthMonth, formatBirthday, fromIsoDate, toIsoDate } from "../lib/isoDate";
import ThemedSelect from "./ThemedSelect";
import "react-day-picker/style.css";
import "./birthdayPicker.css";

/** Oldest year offered — the same floor `validateDob` enforces. */
const OLDEST_YEAR = 1920;

export interface BirthdayPickerProps {
  /** Lets a `<label htmlFor>` name the field. */
  id?: string;
  /** `YYYY-MM-DD`, or an empty string while nothing is chosen. */
  value: string;
  onChange: (isoDate: string) => void;
  invalid?: boolean;
  /** Id(s) of help or error text to read out with the field. */
  describedBy?: string;
  /** Replaces the field's default look entirely, for a page with its own styling. */
  className?: string;
  /** Test seam; the real clock otherwise. */
  today?: Date;
}

const DEFAULT_FIELD =
  "mt-1 flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border-2 bg-white px-3 text-left text-base " +
  "text-[#2B3550] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 " +
  "dark:bg-slate-800 dark:text-slate-100";

/**
 * The calendar's month and year lists, drawn by `ThemedSelect` instead of the browser's own `<select>`
 * (react-day-picker's default). The native list is painted by the operating system and cannot be styled.
 *
 * react-day-picker reports a change as a `<select>` change event and only ever reads `target.value`, so
 * that is the one thing the adapter hands back. It lives at module level on purpose: a component defined
 * inside the picker would be a new type on every render and remount the lists as they open.
 */
function CalendarDropdown({ options, value, onChange, disabled, "aria-label": ariaLabel }: DropdownProps) {
  const items = (options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
    disabled: option.disabled,
  }));
  return (
    <ThemedSelect
      variant="inline"
      value={String(value ?? "")}
      options={items}
      ariaLabel={ariaLabel}
      disabled={disabled}
      onChange={(next) => onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)}
    />
  );
}

const CALENDAR_COMPONENTS = { Dropdown: CalendarDropdown };

/**
 * A birthday picker a person can actually use.
 *
 * ── Why not the browser's date field ──────────────────────────────────
 * `<input type="date">` is built for "next Tuesday". To reach a birth year it makes
 * people step back through years, and on some phones and browsers it is hard to
 * operate at all. Here the field opens a calendar with MONTH and YEAR DROPDOWNS —
 * on a phone those are the native pickers, which people already know — so 1995 is two
 * taps away, and the calendar starts on a grown-up year rather than this month.
 *
 * Built on react-day-picker, which brings the keyboard model and ARIA grid that are
 * easy to get subtly wrong by hand.
 *
 * ── Details that matter ───────────────────────────────────────────────
 * - The calendar opens inline under the field, not as a floating popover: inside a
 *   bottom sheet a popover is easily clipped.
 * - Escape closes only the calendar. The event is stopped so a dialog around the field
 *   does not also close — but only while the calendar is open.
 * - Dates are read and written in the viewer's local calendar (`lib/isoDate`), so the
 *   day tapped is the day saved.
 * - Years run from 1920 to today and future days are disabled.
 */
const BirthdayPicker = forwardRef<HTMLButtonElement, BirthdayPickerProps>(function BirthdayPicker(
  { id, value, onChange, invalid, describedBy, className, today },
  forwardedRef,
) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLButtonElement | null>(null);
  const valueId = useId();
  const panelId = useId();

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      fieldRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const now = today ?? new Date();
  const selected = fromIsoDate(value);

  const close = () => {
    setOpen(false);
    fieldRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const fieldClass = className ?? `${DEFAULT_FIELD} ${invalid ? "border-red-600" : "border-[#EEDBCA] dark:border-slate-600"}`;

  return (
    <div onKeyDown={handleKeyDown}>
      <button
        ref={setRefs}
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={[describedBy, valueId].filter(Boolean).join(" ")}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={fieldClass}
      >
        <span id={valueId} className={selected ? undefined : "opacity-60"}>
          {selected ? formatBirthday(selected) : "Select your birthday"}
        </span>
        <CalendarDays aria-hidden="true" className="h-5 w-5 flex-shrink-0 opacity-70" />
      </button>

      {open && (
        <div id={panelId} className="bhalyam-dob mt-2">
          <DayPicker
            mode="single"
            required
            autoFocus
            captionLayout="dropdown"
            components={CALENDAR_COMPONENTS}
            selected={selected}
            onSelect={(date) => {
              onChange(toIsoDate(date));
              close();
            }}
            defaultMonth={selected ?? defaultBirthMonth(now)}
            startMonth={new Date(OLDEST_YEAR, 0)}
            endMonth={new Date(now.getFullYear(), now.getMonth())}
            disabled={{ after: now }}
          />
        </div>
      )}
    </div>
  );
});

export default BirthdayPicker;
