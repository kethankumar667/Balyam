/**
 * BHALYAM Mandali — Futuristic Create Mandali Modal
 *
 * Creation dialog with unique handle verification, emblem picker, language tags,
 * and dual Light & Dark mode theme support.
 *
 * Rules:
 * - Touch targets >= 44x44px.
 * - Zero usage of Sparkles from lucide-react. Uses Crown, Flame, Shield, Trophy.
 * - WCAG 2.1 AA focus rings.
 */

import React, { useState } from "react";
import { X, Crown, Flame, Shield, Trophy, Check, Zap } from "lucide-react";
import Modal from "../../components/Modal";
import type { CreateMandaliPayload, MandaliVisibility } from "@shared/mandali/types.js";

export interface CreateMandaliModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMandaliPayload) => Promise<{ success: boolean; error?: string }>;
}

const EMBLEMS = [
  { id: "pawn_amber", name: "Amber Pawn", icon: Trophy, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { id: "crown_gold", name: "Gold Crown", icon: Crown, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30" },
  { id: "flame_ruby", name: "Ruby Flame", icon: Flame, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" },
  { id: "shield_sapphire", name: "Sapphire Shield", icon: Shield, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
];

const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi"];

const AVAILABLE_TAGS = ["Casual", "Tournaments", "Ludo", "Hand Cricket", "Rummy", "UNO", "Weekend Play", "Voice Lounge"];

export const CreateMandaliModal: React.FC<CreateMandaliModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [emblem, setEmblem] = useState("crown_gold");
  const [language, setLanguage] = useState("Telugu");
  const [visibility, setVisibility] = useState<MandaliVisibility>("PUBLIC");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Casual", "Ludo"]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length < 4) {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };

  const handleHandleChange = (val: string) => {
    const clean = val.replace(/^@/, "").replace(/\s+/g, "-").toLowerCase();
    setHandle(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Mandali name is required.");
      return;
    }

    if (!handle.trim() || handle.length < 3) {
      setError("Handle must be at least 3 characters.");
      return;
    }

    setSubmitting(true);
    const res = await onSubmit({
      name: name.trim(),
      handle: handle.trim(),
      description: description.trim(),
      emblem,
      language,
      visibility,
      tags: selectedTags,
    });
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to create Mandali.");
    } else {
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabel="Create New Mandali">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto text-left shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Found a New Mandali (మండలి)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
              Create a persistent gaming community for your friends and squad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name & Handle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mandali Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hyderabad Royals"
                maxLength={40}
                className="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Handle (@handle) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 text-sm font-bold select-none">
                  @
                </span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => handleHandleChange(e.target.value)}
                  placeholder="hyderabad-royals"
                  maxLength={24}
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Motto
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes your Mandali special? Casual matches, tournament practice, or family hangout..."
              rows={2}
              maxLength={160}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none font-medium"
            />
          </div>

          {/* Emblem Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Community Emblem
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EMBLEMS.map((emb) => {
                const IconComponent = emb.icon;
                const isSelected = emblem === emb.id;
                return (
                  <button
                    key={emb.id}
                    type="button"
                    onClick={() => setEmblem(emb.id)}
                    className={`min-h-[54px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? `${emb.color} ring-2 ring-amber-500 shadow-sm`
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-[10px] font-bold truncate w-full text-center">
                      {emb.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Primary Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Joining Access
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("PUBLIC")}
                  className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    visibility === "PUBLIC"
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Public (Instant)
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("INVITE_ONLY")}
                  className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    visibility === "INVITE_ONLY"
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Invite Only
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Focus Tags (Pick up to 4)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <Zap className="w-4 h-4 fill-current" />
              {submitting ? "Establishing Mandali..." : "Establish Mandali Now"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
