/**
 * BHALYAM Mandali — Discovery Page
 *
 * Directory and search portal for persistent gaming communities.
 *
 * Rules:
 * - Strictly NO usage of Sparkles from lucide-react. Uses Crown, Flame, Shield, Trophy, Users.
 * - WCAG 2.1 AA focus rings.
 * - Touch targets >= 44x44px.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Crown,
  Shield,
  Trophy,
  Flame,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useMandaliStore } from "../../store/mandaliStore";
import { CreateMandaliModal } from "./CreateMandaliModal";
import type { Mandali } from "@shared/mandali/types.js";

const LANGUAGES = ["All", "English", "Telugu", "Hindi", "Tamil", "Kannada"];
const POPULAR_TAGS = ["All", "Casual", "Tournaments", "Ludo", "Hand Cricket", "Rummy", "Weekend Play"];

export default function MandaliDiscoveryPage(): JSX.Element {
  const navigate = useNavigate();
  const { mandalis, myMandalis, isLoading, fetchMandalis, fetchMyMandalis, createMandali } =
    useMandaliStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchMyMandalis();
    fetchMandalis();
  }, [fetchMyMandalis, fetchMandalis]);

  const handleFilterChange = (lang: string, tag: string, search: string) => {
    fetchMandalis({
      language: lang !== "All" ? lang : undefined,
      tag: tag !== "All" ? tag : undefined,
      search: search.trim() ? search.trim() : undefined,
    });
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange(selectedLanguage, selectedTag, searchQuery);
  };

  const getEmblemIcon = (emblemId?: string) => {
    switch (emblemId) {
      case "crown_gold":
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case "flame_ruby":
        return <Flame className="w-5 h-5 text-rose-400" />;
      case "shield_sapphire":
        return <Shield className="w-5 h-5 text-blue-400" />;
      default:
        return <Trophy className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-black text-lg text-white hover:text-amber-400 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none rounded-lg p-1"
          >
            <img src="/logo.png" alt="BHALYAM" className="w-8 h-8 rounded-lg" />
            <span className="tracking-tight">BHALYAM</span>
          </Link>
          <span className="text-slate-600 font-bold">/</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <Crown className="w-3.5 h-3.5" />
            Mandali (మండలి)
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Found a</span> Mandali
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center sm:text-left py-6 px-6 sm:px-10 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              Social Clans & Lounges
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Find Your Gaming <span className="text-amber-400">Tribe</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Mandali (మండలి) connects players into persistent gaming communities. Form squads,
              launch multiplayer matches, chat in realtime, and archive legendary Gnapakalu memories.
            </p>
          </div>
        </section>

        {/* My Mandalis Ribbon (if any) */}
        {myMandalis.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                Your Communities
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myMandalis.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/mandali/${m.handle}`)}
                  className="bg-slate-900/90 border border-amber-500/30 hover:border-amber-400/80 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-500/10 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {getEmblemIcon(m.emblem)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                        {m.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">@{m.handle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter Matrix */}
        <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Mandalis by name, handle, or focus..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
            >
              Search
            </button>
          </form>

          {/* Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-800/60">
            {/* Language Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs text-slate-500 font-semibold uppercase mr-1">Lang:</span>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(lang);
                    handleFilterChange(lang, selectedTag, searchQuery);
                  }}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedLanguage === lang
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs text-slate-500 font-semibold uppercase mr-1">Tag:</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tag);
                    handleFilterChange(selectedLanguage, tag, searchQuery);
                  }}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Discovery Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Explore All Mandalis ({mandalis.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : mandalis.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Mandalis Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                We could not find any communities matching your filters. Found the first one!
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Create Mandali
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {mandalis.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                          {getEmblemIcon(m.emblem)}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug group-hover:text-amber-400 transition-colors">
                            {m.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">@{m.handle}</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 border border-slate-700">
                        Lv {m.level}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                      {m.description || "No description provided."}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {m.language}
                      </span>
                      {m.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/40 text-slate-400 border border-slate-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer & CTA */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {m.memberCount} / {m.maxMembers}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/mandali/${m.handle}`)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-bold text-xs flex items-center gap-1 border border-amber-500/30 transition-all focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                    >
                      Enter Lounge
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Modal */}
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
    </div>
  );
}
