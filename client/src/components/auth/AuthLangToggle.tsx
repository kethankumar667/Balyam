import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { LOCALE_BY_ID, LOCALE_IDS, type LocaleId } from "../../i18n/types";

/**
 * Dropdown language selector in the auth header matching the UX mockup ("🌐 English ▾").
 */
export default function AuthLangToggle() {
  const { locale, setLocale, ready } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const activeMeta = LOCALE_BY_ID[locale] || LOCALE_BY_ID["en"];

  return (
    <div ref={dropdownRef} className="relative inline-block text-left z-50">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={!ready}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                   bg-white/90 backdrop-blur-xs border border-[#E6D4B5]
                   text-[#4A2508] text-[12.5px] font-bold shadow-2xs hover:bg-white
                   hover:border-[#D4A574] active:scale-95 transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 text-[#9C7E63]" />
        <span>{activeMeta.englishName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#9C7E63] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white border border-[#E6D4B5]
                     shadow-xl shadow-amber-900/15 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {LOCALE_IDS.map((id) => {
            const isSelected = id === locale;
            const meta = LOCALE_BY_ID[id];
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLocale(id);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-[12.5px] font-bold flex items-center justify-between
                            transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#FFF5E0] text-[#E85D04]"
                                : "text-[#4A2508] hover:bg-[#FFFDF8]"
                            }`}
              >
                <div>
                  <div className="font-extrabold">{meta.nativeName}</div>
                  <div className="text-[10.5px] text-[#9C7E63] font-medium">{meta.englishName}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#E85D04]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
