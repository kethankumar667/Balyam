import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ThemedSelectProps {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Lets a `<label htmlFor>` name the field. */
  id?: string;
  /** For a select with no visible label of its own (the calendar's month and year). */
  ariaLabel?: string;
  /** Shown while `value` matches no option. */
  placeholder?: string;
  disabled?: boolean;
  /** `field` is a full-width form control; `inline` is a compact heading-style control. */
  variant?: "field" | "inline";
}

/** Above the stacked dialogs (`Modal` 50–70, `SheetShell` 71): a list opened from inside one must still be on top. */
const LIST_Z = 120;
const LIST_MAX_HEIGHT = 288;
const LIST_MIN_WIDTH = 144;
const VIEWPORT_GAP = 8;
const TYPEAHEAD_RESET_MS = 700;

const TRIGGER_BASE =
  "flex cursor-pointer items-center justify-between gap-2 text-left transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-60";

const TRIGGER_VARIANT = {
  field:
    "mt-1 min-h-[48px] w-full rounded-xl border border-[#EEDBCA] bg-white px-3 text-base text-[#2B3550] " +
    "hover:border-amber-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-amber-500",
  inline:
    "min-h-[44px] rounded-lg px-2.5 text-base font-bold text-[#2B3550] hover:bg-amber-100 " +
    "dark:text-slate-100 dark:hover:bg-slate-700",
} as const;

interface Placement {
  left: number;
  width: number;
  /** Anchored by `top` when the list opens downward, by `bottom` when it opens upward. */
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/** Where the list goes: under the trigger when there is room, above it when there is clearly more room there. */
function placeBelowOrAbove(trigger: HTMLElement): Placement {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
  const spaceAbove = rect.top - VIEWPORT_GAP;
  const opensUp = spaceBelow < 200 && spaceAbove > spaceBelow;
  const width = Math.max(rect.width, LIST_MIN_WIDTH);
  const left = Math.min(Math.max(VIEWPORT_GAP, rect.left), Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP));
  return opensUp
    ? { left, width, bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(LIST_MAX_HEIGHT, spaceAbove - 4) }
    : { left, width, top: rect.bottom + 4, maxHeight: Math.min(LIST_MAX_HEIGHT, spaceBelow - 4) };
}

function nextEnabled(options: readonly SelectOption[], from: number, step: 1 | -1): number {
  for (let i = from + step; i >= 0 && i < options.length; i += step) {
    if (!options[i].disabled) return i;
  }
  return from;
}

/**
 * A dropdown that looks like the rest of the app.
 *
 * ── Why not the browser's `<select>` ──────────────────────────────────
 * The open list of a native select is drawn by the operating system: a white box with a hairline
 * border and a blue highlight, none of it ours to style, and on desktop it ignores the dark theme.
 * Next to BHALYAM's cream cards it looked like a mistake. On a phone the native picker is genuinely
 * good, but a form that looks right on one device and wrong on another is not a feature.
 *
 * ── What it keeps from the native one ─────────────────────────────────
 * It is a real combobox/listbox: arrow keys, Home/End, type-to-jump, Enter or Space to choose, Escape
 * to close, Tab to move on, and a screen reader hears the field's name, its value and its options.
 * Focus never leaves the button — the highlighted option is announced through `aria-activedescendant`
 * — so a dialog's focus trap has nothing to fight over.
 *
 * ── Details that matter ───────────────────────────────────────────────
 * - The list is drawn in a portal with fixed positioning. Inside a bottom sheet or a scrolling
 *   calendar a list that stays in place is clipped; this one cannot be.
 * - It opens upward when there is more room above, and is sized to fit the screen.
 * - Escape closes only the list. The event is stopped so a dialog around the field does not also close
 *   — but only while the list is open.
 * - Options are 44px tall: the app's touch-target floor.
 */
export default function ThemedSelect({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  placeholder = "Select",
  disabled = false,
  variant = "field",
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", timer: 0 });
  const reduceMotion = useReducedMotion();
  const listId = useId();

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const optionId = useCallback((index: number) => `${listId}-option-${index}`, [listId]);

  const openList = useCallback(() => {
    if (disabled || !triggerRef.current) return;
    setPlacement(placeBelowOrAbove(triggerRef.current));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabled(options, -1, 1));
    setOpen(true);
  }, [disabled, options, selectedIndex]);

  const closeList = useCallback(() => setOpen(false), []);

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, options],
  );

  // Centre the chosen option the moment the list opens, so a long list (the years) starts where the value is.
  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const chosen = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && chosen) list.scrollTop = chosen.offsetTop - list.clientHeight / 2 + chosen.offsetHeight / 2;
  }, [open]);

  // Keyboard movement keeps the highlighted option in view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex, optionId]);

  // A tap outside, a scroll of the page behind, or a resize puts the list somewhere stale: close it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeList);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeList);
    };
  }, [open, closeList]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const jumpTo = (character: string) => {
    window.clearTimeout(typeahead.current.timer);
    typeahead.current.text += character.toLowerCase();
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.text = "";
    }, TYPEAHEAD_RESET_MS);
    const from = Math.max(activeIndex, 0);
    const ordered = [...options.keys()].map((i) => (i + from) % options.length);
    const hit = ordered.find((i) => !options[i].disabled && options[i].label.toLowerCase().startsWith(typeahead.current.text));
    if (hit !== undefined) setActiveIndex(hit);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => nextEnabled(options, i, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => nextEnabled(options, i, -1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(nextEnabled(options, -1, 1));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(nextEnabled(options, options.length, -1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) jumpTo(event.key);
    }
  };

  const listStyle: CSSProperties | undefined = placement
    ? {
        position: "fixed",
        zIndex: LIST_Z,
        left: placement.left,
        minWidth: placement.width,
        top: placement.top,
        bottom: placement.bottom,
        maxHeight: placement.maxHeight,
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
        className={`${TRIGGER_BASE} ${TRIGGER_VARIANT[variant]}`}
      >
        <span className={selected ? undefined : "opacity-60"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 opacity-70 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        listStyle &&
        createPortal(
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={listStyle}
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-[#EEDBCA] bg-white p-1 shadow-xl shadow-amber-900/20 dark:border-slate-600 dark:bg-slate-800"
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={`flex min-h-[44px] items-center justify-between gap-3 rounded-lg px-3 text-[15px] ${
                    option.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                  } ${
                    isSelected
                      ? "bg-amber-100 font-bold text-amber-950 dark:bg-amber-400/20 dark:text-amber-200"
                      : isActive
                        ? "bg-amber-50 text-amber-950 dark:bg-slate-700 dark:text-white"
                        : "text-[#2B3550] dark:text-slate-100"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-300" />}
                </li>
              );
            })}
          </motion.ul>,
          document.body,
        )}
    </>
  );
}
