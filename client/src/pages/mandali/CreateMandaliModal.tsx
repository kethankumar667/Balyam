/**
 * BHALYAM Mandali — the sheet for starting a Mandali.
 *
 * Four things to say (name, about, who can join, what you enjoy) and one button.
 * It opens private by default: a Mandali belongs to the people who are invited
 * to it, and opening it up is a choice, not the starting point. The handle
 * follows the name until the person types their own.
 *
 * Rules:
 * - Touch targets >= 44x44px, visible focus, real labels.
 * - Light and dark themes both flip fully.
 * - Every visible string goes through t().
 */

import React, { useId, useState } from "react";
import { Check } from "lucide-react";
import type { CreateMandaliPayload, MandaliVisibility } from "@shared/mandali/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumButton, AlbumSheet } from "../../components/mandali/album";

export interface CreateMandaliModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMandaliPayload) => Promise<{ success: boolean; error?: string }>;
}

const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi"];
const AVAILABLE_TAGS = ["Casual", "Ludo", "Hand Cricket", "Rummy", "UNO", "Weekend Play", "Voice Lounge"];
const MAX_TAGS = 4;
const MAX_HANDLE_LENGTH = 24;
const MIN_HANDLE_LENGTH = 3;
/** The symbol is no longer chosen by the person (the cover cloth comes from the id); the server still stores one. */
const DEFAULT_EMBLEM = "crown_gold";

const FIELD =
  "album-focus min-h-[48px] w-full rounded-xl border border-album-line bg-album-field px-4 text-[15px] text-album-ink placeholder:text-album-ink3 focus-visible:border-album-foil";

const slugFromName = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, MAX_HANDLE_LENGTH);

const cleanHandle = (typed: string): string => typed.replace(/^@/, "").replace(/\s+/g, "-").toLowerCase();

export const CreateMandaliModal: React.FC<CreateMandaliModalProps> = ({ open, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("Telugu");
  const [visibility, setVisibility] = useState<MandaliVisibility>("INVITE_ONLY");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Casual"]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changeName = (value: string) => {
    setName(value);
    if (!handleTouched) setHandle(slugFromName(value));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((existing) => existing !== tag);
      return current.length < MAX_TAGS ? [...current, tag] : current;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t("mandali.create.err.name"));
    if (handle.trim().length < MIN_HANDLE_LENGTH) return setError(t("mandali.create.err.handle"));

    setSubmitting(true);
    const res = await onSubmit({
      name: name.trim(),
      handle: handle.trim(),
      description: description.trim(),
      emblem: DEFAULT_EMBLEM,
      language,
      visibility,
      tags: selectedTags,
    });
    setSubmitting(false);

    if (res.success) onClose();
    else setError(res.error || t("mandali.create.err.failed"));
  };

  const access: { value: MandaliVisibility; label: string; hint: string }[] = [
    { value: "INVITE_ONLY", label: t("mandali.create.access.invite"), hint: t("mandali.create.access.invite.hint") },
    { value: "PUBLIC", label: t("mandali.create.access.open"), hint: t("mandali.create.access.open.hint") },
  ];

  return (
    <AlbumSheet
      open={open}
      onClose={onClose}
      title={t("mandali.create.title")}
      description={t("mandali.create.subtitle")}
      footer={
        <AlbumButton type="submit" form={formId} variant="primary" size="lg" className="w-full" loading={submitting}>
          {submitting ? t("mandali.create.submitting") : t("mandali.create.submit")}
        </AlbumButton>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5 pt-1">
        {error && (
          <p role="alert" className="m-0 rounded-xl border border-album-danger/40 bg-album-danger/10 px-4 py-3 text-[15px] font-medium text-album-danger">
            {error}
          </p>
        )}

        <div>
          <label htmlFor={`${formId}-name`} className="mb-1.5 block text-[15px] font-semibold text-album-ink">
            {t("mandali.create.name")}
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            required
            value={name}
            onChange={(event) => changeName(event.target.value)}
            placeholder={t("mandali.create.name.placeholder")}
            maxLength={40}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-handle`} className="mb-1.5 block text-[15px] font-semibold text-album-ink">
            {t("mandali.create.handle")}
          </label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-album-ink3">
              @
            </span>
            <input
              id={`${formId}-handle`}
              type="text"
              required
              value={handle}
              onChange={(event) => {
                setHandleTouched(true);
                setHandle(cleanHandle(event.target.value));
              }}
              placeholder="nellore-gang"
              maxLength={MAX_HANDLE_LENGTH}
              aria-describedby={`${formId}-handle-hint`}
              className={`${FIELD} pl-9`}
            />
          </div>
          <p id={`${formId}-handle-hint`} className="m-0 mt-1.5 text-sm text-album-ink3">
            {t("mandali.create.handle.hint")}
          </p>
        </div>

        <div>
          <label htmlFor={`${formId}-about`} className="mb-1.5 block text-[15px] font-semibold text-album-ink">
            {t("mandali.create.about")}
          </label>
          <textarea
            id={`${formId}-about`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("mandali.create.about.placeholder")}
            rows={3}
            maxLength={160}
            className={`${FIELD} resize-none py-3`}
          />
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[15px] font-semibold text-album-ink">{t("mandali.create.access")}</legend>
          <div role="radiogroup" className="space-y-2">
            {access.map((option) => {
              const selected = visibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setVisibility(option.value)}
                  className={`album-focus flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected ? "border-album-foil bg-album-foilfill/15" : "border-album-line bg-album-raised hover:bg-album-field"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-album-foil bg-album-foilfill text-album-onfoil" : "border-album-ink3"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-album-ink">{option.label}</span>
                    <span className="block text-sm text-album-ink3">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${formId}-language`} className="mb-1.5 block text-[15px] font-semibold text-album-ink">
            {t("mandali.create.language")}
          </label>
          <select id={`${formId}-language`} value={language} onChange={(event) => setLanguage(event.target.value)} className={FIELD}>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="p-0 text-[15px] font-semibold text-album-ink">{t("mandali.create.tags")}</legend>
          <p className="m-0 mb-2 text-sm text-album-ink3">{t("mandali.create.tags.hint")}</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTag(tag)}
                  className={`album-focus flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium transition-colors ${
                    selected
                      ? "border-album-foil bg-album-foilfill/15 text-album-ink"
                      : "border-album-line bg-album-raised text-album-ink2 hover:bg-album-field"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5 text-album-foil" aria-hidden="true" />}
                  {tag}
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>
    </AlbumSheet>
  );
};
