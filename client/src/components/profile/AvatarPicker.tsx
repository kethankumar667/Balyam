import { AVATARS, findAvatar } from "../../lib/avatars";
import { UserIcon } from "../auth/authIcons";

/**
 * Pick an avatar from the ones BHALYAM ships.
 *
 * A radiogroup rather than a grid of buttons, because that is what it is:
 * one choice out of many, mutually exclusive. The semantics buy real
 * behaviour — arrow keys move between options and only the selected one is a
 * tab stop, so reaching the fiftieth avatar does not cost fifty tabs.
 *
 * Selection applies immediately. There is no Save: the choice is one value,
 * reversible in a tap, and a confirm step on something this small is
 * ceremony. The display name keeps its Save because half a name is a state
 * worth not committing.
 */
export interface AvatarPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const chosen = findAvatar(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--auth-field-edge)]
                     bg-[var(--auth-field)] flex items-center justify-center flex-shrink-0"
        >
          {chosen ? (
            <img src={chosen.src} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-7 h-7 text-[var(--auth-ink-mute)]" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold text-[var(--auth-ink)]">
            {chosen ? chosen.label : "No avatar yet"}
          </p>
          <p className="text-[12.5px] leading-snug text-[var(--auth-ink-mute)]">
            {chosen
              ? "Shown next to your name on this device."
              : "Pick one below, or keep the plain silhouette."}
          </p>
        </div>
        {chosen ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto min-h-[44px] px-3 rounded-lg text-[13px] font-bold
                       text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)]
                       hover:bg-[var(--auth-rule)]/50
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-colors duration-150"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div
        role="radiogroup"
        aria-label="Choose an avatar"
        className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[280px] overflow-y-auto p-1
                   rounded-xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)]"
      >
        {AVATARS.map((a) => {
          const selected = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={a.label}
              // Roving tabindex: the group is one stop, arrows move within it.
              tabIndex={selected || (!value && a === AVATARS[0]) ? 0 : -1}
              onClick={() => onChange(a.id)}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark
                          focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--auth-field)]
                          transition-[transform,box-shadow] duration-150
                          ${
                            selected
                              ? "ring-2 ring-bhalyam-gold-dark shadow-[0_4px_10px_-4px_rgba(228,177,40,0.8)] scale-[1.03]"
                              : "ring-1 ring-[var(--auth-field-edge)] hover:scale-[1.03]"
                          }`}
            >
              <img
                src={a.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {selected ? (
                <span
                  className="absolute inset-0 ring-2 ring-inset ring-white/70 rounded-lg"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
