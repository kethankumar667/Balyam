/**
 * BHALYAM Mandali — the shelf.
 *
 * Where you land before you open a group. Your own Mandalis stand on the shelf
 * as albums (each with its own cloth, so you know yours by colour before you
 * read the name); finding someone else's Mandali is one quiet step below, never
 * the headline. A person with no Mandali yet gets a single warm invitation to
 * start one — not a directory.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - Touch targets at least 44 x 44 px, visible focus everywhere.
 * - Zero usage of Sparkles from lucide-react.
 * - Every visible string goes through t().
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Search, Users } from "lucide-react";
import { useMandaliStore } from "../../store/mandaliStore";
import { useAuthStore } from "../../store/authStore";
import { useMandaliInboxStore } from "../../store/mandaliInboxStore";
import { useTranslation } from "../../hooks/useTranslation";
import { CreateMandaliModal } from "./CreateMandaliModal";
import AppLayout from "../../components/layout/AppLayout";
import { AlbumButton, AlbumCover, AlbumSheet } from "../../components/mandali/album";
import { coverClothClass } from "../../components/mandali/album/coverCloth";

const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada"];
const TOPICS = ["Casual", "Ludo", "Hand Cricket", "Rummy", "Weekend Play"];
/** The sentinel both filter rows use for "no filter". */
const ANY = "All";

interface FilterRowProps {
  label: string;
  options: readonly string[];
  value: string;
  allLabel: string;
  onChange: (value: string) => void;
}

/** One row of choices. A real radio group, so it reads as "one of these" to a screen reader. */
function FilterRow({ label, options, value, allLabel, onChange }: FilterRowProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <span className="flex-shrink-0 pr-1 text-sm font-semibold text-album-ink3">{label}</span>
      {[ANY, ...options].map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`album-focus min-h-[44px] flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 text-[15px] font-medium transition-colors ${
              selected
                ? "bg-album-foilfill text-album-onfoil"
                : "border border-album-line bg-album-raised text-album-ink2 hover:bg-album-field"
            }`}
          >
            {option === ANY ? allLabel : option}
          </button>
        );
      })}
    </div>
  );
}

export default function MandaliDiscoveryPage(): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMember = useAuthStore((s) => s.isMember);
  const digests = useMandaliInboxStore((s) => s.digests);
  const { mandalis, myMandalis, isLoading, fetchMandalis, fetchMyMandalis, createMandali } = useMandaliStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [language, setLanguage] = useState(ANY);
  const [topic, setTopic] = useState(ANY);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showFind, setShowFind] = useState(false);

  useEffect(() => {
    fetchMyMandalis();
    fetchMandalis();
  }, [fetchMyMandalis, fetchMandalis]);

  const applyFilters = (nextLanguage: string, nextTopic: string, nextSearch: string) => {
    fetchMandalis({
      language: nextLanguage !== ANY ? nextLanguage : undefined,
      tag: nextTopic !== ANY ? nextTopic : undefined,
      search: nextSearch.trim() ? nextSearch.trim() : undefined,
    });
  };

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    applyFilters(language, topic, searchQuery);
  };

  const resetFilters = () => {
    setLanguage(ANY);
    setTopic(ANY);
    setSearchQuery("");
    applyFilters(ANY, ANY, "");
  };

  const handleCreateClick = () => {
    if (!isMember) setShowAuthPrompt(true);
    else setShowCreateModal(true);
  };

  const hasMandalis = myMandalis.length > 0;
  // With nothing on the shelf yet, finding one is the next useful thing; otherwise it stays tucked away.
  const findVisible = !hasMandalis || showFind;
  const open = (handle: string) => navigate(`/mandali/${handle}`);

  return (
    <AppLayout>
      <div className="album-surface flex-1">
        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="m-0 flex flex-wrap items-baseline gap-x-3 text-3xl font-semibold leading-tight text-album-ink sm:text-4xl">
                {t("mandali.shelf.title")}
                <span className="album-hand text-4xl font-normal text-album-foil">{t("mandali.shelf.script")}</span>
              </h1>
              <p className="mb-0 mt-2 max-w-xl text-base leading-relaxed text-album-ink2">{t("mandali.shelf.subtitle")}</p>
            </div>
            {hasMandalis && (
              <AlbumButton variant="primary" onClick={handleCreateClick} icon={<Plus className="h-4 w-4" aria-hidden="true" />} className="self-start sm:self-auto">
                {t("mandali.shelf.startAnother")}
              </AlbumButton>
            )}
          </header>

          {hasMandalis ? (
            <section aria-label={t("mandali.shelf.title")}>
              <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {myMandalis.map((m) => {
                  const digest = digests.find((d) => d.mandaliId === m.id);
                  // A muted Mandali keeps quiet on the shelf too.
                  const unread = digest && digest.level !== "MUTED" ? digest.unreadCount : 0;
                  const latest = digest?.latest?.preview ? `${digest.latest.senderName}: ${digest.latest.preview}` : "";
                  return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => open(m.handle)}
                      aria-label={t("mandali.shelf.open", { name: m.name })}
                      className="album-focus group block w-full cursor-pointer rounded-2xl text-left transition-transform duration-200 hover:-translate-y-1"
                    >
                      <AlbumCover
                        variant="tile"
                        mandaliId={m.id}
                        name={m.name}
                        unread={unread}
                        unreadLabel={t("mandali.shelf.unread", { count: unread })}
                        subtitle={
                          <>
                            <span className="block">{t("mandali.shelf.people", { count: m.memberCount })}</span>
                            {latest && <span className="mt-1 block truncate">{latest}</span>}
                          </>
                        }
                      />
                    </button>
                  </li>
                  );
                })}
              </ul>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setShowFind((value) => !value)}
                  aria-expanded={showFind}
                  className="album-focus flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-album-line bg-album-raised px-5 text-left transition-colors hover:bg-album-field"
                >
                  <span>
                    <span className="block text-base font-semibold text-album-ink">
                      {showFind ? t("mandali.shelf.find.hide") : t("mandali.shelf.find.show")}
                    </span>
                    <span className="block text-sm text-album-ink3">{t("mandali.shelf.find.hint")}</span>
                  </span>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-album-ink3 transition-transform ${showFind ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </div>
            </section>
          ) : (
            <section className="mx-auto max-w-lg px-2 py-6 text-center sm:py-12">
              <h2 className="m-0 text-2xl font-semibold leading-snug text-album-ink">{t("mandali.shelf.empty.title")}</h2>
              <p className="mx-auto mb-7 mt-3 max-w-md text-base leading-relaxed text-album-ink2">{t("mandali.shelf.empty.body")}</p>
              <AlbumButton variant="primary" size="lg" onClick={handleCreateClick} icon={<Plus className="h-5 w-5" aria-hidden="true" />}>
                {t("mandali.shelf.empty.action")}
              </AlbumButton>
              <p className="mb-0 mt-6 text-sm text-album-ink3">{t("mandali.shelf.empty.or")}</p>
            </section>
          )}

          {findVisible && (
            <section aria-labelledby="mandali-find" className="space-y-5 border-t border-album-line pt-8">
              <h2 id="mandali-find" className="m-0 text-xl font-semibold text-album-ink">
                {t("mandali.shelf.find.title")}
              </h2>

              <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-album-ink3" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("mandali.shelf.search")}
                    aria-label={t("mandali.shelf.search")}
                    className="album-focus min-h-[48px] w-full rounded-2xl border border-album-line bg-album-field pl-11 pr-4 text-[15px] text-album-ink placeholder:text-album-ink3 focus-visible:border-album-foil"
                  />
                </div>
                <AlbumButton type="submit" variant="quiet" size="lg">
                  {t("mandali.shelf.search.action")}
                </AlbumButton>
              </form>

              <div className="space-y-1">
                <FilterRow
                  label={t("mandali.shelf.language")}
                  options={LANGUAGES}
                  value={language}
                  allLabel={t("mandali.shelf.filter.all")}
                  onChange={(next) => {
                    setLanguage(next);
                    applyFilters(next, topic, searchQuery);
                  }}
                />
                <FilterRow
                  label={t("mandali.shelf.topic")}
                  options={TOPICS}
                  value={topic}
                  allLabel={t("mandali.shelf.filter.all")}
                  onChange={(next) => {
                    setTopic(next);
                    applyFilters(language, next, searchQuery);
                  }}
                />
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-2xl bg-album-field motion-reduce:animate-none" />
                  ))}
                </div>
              ) : mandalis.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-album-line px-6 py-12 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-album-ink3" aria-hidden="true" />
                  <h3 className="m-0 text-lg font-semibold text-album-ink">{t("mandali.shelf.none.title")}</h3>
                  <p className="mx-auto mb-5 mt-2 max-w-sm text-[15px] leading-relaxed text-album-ink2">{t("mandali.shelf.none.body")}</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <AlbumButton variant="quiet" onClick={resetFilters}>
                      {t("mandali.shelf.none.reset")}
                    </AlbumButton>
                    <AlbumButton variant="primary" onClick={handleCreateClick}>
                      {t("mandali.shelf.create")}
                    </AlbumButton>
                  </div>
                </div>
              ) : (
                <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
                  {mandalis.map((m) => {
                    const spaceLeft = Math.max(0, m.maxMembers - m.memberCount);
                    return (
                      <li key={m.id} className="flex flex-col rounded-2xl border border-album-line bg-album-raised p-4">
                        <div className="flex items-start gap-3">
                          <span aria-hidden="true" className={`${coverClothClass(m.id)} h-12 w-12 flex-shrink-0 rounded-xl`} />
                          <div className="min-w-0">
                            <h3 className="m-0 truncate text-base font-semibold leading-snug text-album-ink">{m.name}</h3>
                            <p className="m-0 truncate text-[13px] text-album-ink3">@{m.handle}</p>
                          </div>
                        </div>
                        <p className="mb-0 mt-3 line-clamp-2 flex-1 text-[15px] leading-relaxed text-album-ink2">
                          {m.description || t("mandali.shelf.about.none")}
                        </p>
                        <p className="mb-0 mt-3 text-[13px] text-album-ink3">
                          {t("mandali.shelf.people", { count: m.memberCount })} · {m.language}
                          {" · "}
                          {spaceLeft > 0 ? t("mandali.shelf.capacity", { count: spaceLeft }) : t("mandali.shelf.full")}
                        </p>
                        <AlbumButton variant="quiet" className="mt-3 w-full" onClick={() => open(m.handle)}>
                          {t("mandali.shelf.visit")}
                        </AlbumButton>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <AlbumSheet
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title={t("mandali.auth.title")}
        footer={
          <div className="flex gap-3">
            <AlbumButton variant="quiet" className="flex-1" onClick={() => setShowAuthPrompt(false)}>
              {t("mandali.auth.cancel")}
            </AlbumButton>
            <AlbumButton variant="primary" className="flex-1" onClick={() => navigate("/login")}>
              {t("mandali.auth.signIn")}
            </AlbumButton>
          </div>
        }
      >
        <p className="m-0 text-[15px] leading-relaxed text-album-ink2">{t("mandali.auth.body")}</p>
      </AlbumSheet>

      {showCreateModal && (
        <CreateMandaliModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (payload) => {
            const res = await createMandali(payload);
            if (res.success && res.mandali) {
              navigate(`/mandali/${res.mandali.handle}`);
            }
            return res;
          }}
        />
      )}
    </AppLayout>
  );
}
