import { useState, useEffect, useRef } from "react";
import { validateName, type FieldError } from "../../lib/authValidation";
import { X, Check, AlertCircle } from "lucide-react";
import Modal from "../../components/Modal";

interface EditProfileModalProps {
  isOpen: boolean;
  initialDisplayName: string;
  initialBio?: string;
  initialRegion?: string;
  onClose: () => void;
  onSave: (data: { displayName: string; bio: string; region: string }) => Promise<void>;
}

const REGION_OPTIONS = [
  "India 🇮🇳",
  "United States 🇺🇸",
  "United Kingdom 🇬🇧",
  "Canada 🇨🇦",
  "Australia 🇦🇺",
  "Global 🌐",
];

export default function EditProfileModal({
  isOpen,
  initialDisplayName,
  initialBio = "",
  initialRegion = "India 🇮🇳",
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [region, setRegion] = useState(initialRegion);
  const [nameError, setNameError] = useState<FieldError | null>(null);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialDisplayName);
      setBio(initialBio);
      setRegion(initialRegion);
      setNameError(null);
    }
  }, [isOpen, initialDisplayName, initialBio, initialRegion]);

  // Focus trap, Escape, focus restoration and body-scroll lock are all
  // owned by <Modal> at the return site below.

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateName(displayName);
    if (error) {
      setNameError(error);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        bio: bio.trim().slice(0, 160),
        region,
      });
      setSaving(false);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      initialFocusRef={nameInputRef}
      ariaLabelledBy="editProfileTitle"
      className="auth-shell animate-in fade-in duration-200"
      panelClassName="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative overflow-hidden"
    >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--auth-field-edge)] pb-4">
          <h2 id="editProfileTitle" className="text-lg font-black text-[var(--auth-ink)] tracking-tight">
            Edit Personal Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] flex items-center justify-center transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="editDisplayNameInput"
              className="text-xs font-bold font-mono text-[var(--auth-ink-soft)] uppercase block"
            >
              Display Name
            </label>
            <input
              id="editDisplayNameInput"
              ref={nameInputRef}
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (nameError) setNameError(null);
              }}
              maxLength={24}
              required
              className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 font-mono transition"
            />
            {nameError && (
              <p className="text-xs text-rose-500 font-mono flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {nameError}
              </p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-1.5">
            <label
              htmlFor="editRegionSelect"
              className="text-xs font-bold font-mono text-[var(--auth-ink-soft)] uppercase block"
            >
              Country / Region
            </label>
            <select
              id="editRegionSelect"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 font-mono transition"
            >
              {REGION_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-stone-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="editBioTextarea"
                className="text-xs font-bold font-mono text-[var(--auth-ink-soft)] uppercase block"
              >
                Bio / About Me
              </label>
              <span className="text-[10px] font-mono text-[var(--auth-ink-soft)]">
                {bio.length} / 160
              </span>
            </div>
            <textarea
              id="editBioTextarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Tell other players about your favorite childhood games..."
              className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--auth-field-edge)]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] text-xs font-bold font-mono text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs font-mono uppercase tracking-wider transition shadow-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500/60 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
    </Modal>
  );
}
