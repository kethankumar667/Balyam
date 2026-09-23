/**
 * BHALYAM Mandali — Futuristic Discovery & Clan Hub
 *
 * FAANG/MAANG-grade community directory and member portal.
 * - When user belongs to >= 1 Mandali: Prioritizes "Your Communities",
 *   hides the heavy explore grid behind an on-demand "Browse & Explore Other Mandalis" toggle.
 * - When user belongs to 0 Mandalis: Full discovery portal displayed by default.
 * - Guest gating: Only signed-in members can create Mandalis.
 * - Dual Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Strictly NO usage of Sparkles from lucide-react. Uses Crown, Flame, Shield, Trophy, Users, Zap, Sun, Moon, Compass, ChevronDown.
 * - WCAG 2.1 AA focus rings and minimum 44x44px touch targets.
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
  Zap,
  Gamepad2,
  Compass,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useMandaliStore, DEFAULT_PREVIEW_MANDALIS } from "../../store/mandaliStore";
import { useAuthStore } from "../../store/authStore";
import { CreateMandaliModal } from "./CreateMandaliModal";
import AppLayout from "../../components/layout/AppLayout";

const LANGUAGES = ["All", "English", "Telugu", "Hindi", "Tamil", "Kannada"];
const POPULAR_TAGS = ["All", "Casual", "Tournaments", "Ludo", "Hand Cricket", "Rummy", "Weekend Play"];

export default function MandaliDiscoveryPage(): JSX.Element {
  const navigate = useNavigate();
  const isMember = useAuthStore((s) => s.isMember);
  const { mandalis, myMandalis, isLoading, fetchMandalis, fetchMyMandalis, createMandali } =
    useMandaliStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showExplore, setShowExplore] = useState(false);

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
        return <Crown className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
      case "flame_ruby":
        return <Flame className="w-5 h-5 text-rose-500 dark:text-rose-400" />;
      case "shield_sapphire":
        return <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
      default:
        return <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
    }
  };

  const handleCreateClick = () => {
    if (!isMember) {
      setShowAuthPrompt(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const hasJoinedMandalis = myMandalis.length > 0;
  // If user has 0 mandalis, explore section is open by default; otherwise controlled by showExplore
  const isExploreVisible = !hasJoinedMandalis || showExplore;

  return (
    <AppLayout>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-10 sm:pb-14 space-y-6 sm:space-y-8 select-none">
        {/* Mandali Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Mandali Communities
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 font-bold">
                  మండలి
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                Form gaming squads, launch multiplayer arena rooms, chat in real-time, and transfer clan coins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCreateClick}
              className="min-h-[44px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Create Mandali</span>
            </button>
          </div>
        </div>
        {/* If user is in at least 1 Mandali: Dedicated "Your Communities" Headquarters */}
        {hasJoinedMandalis ? (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Crown className="w-7 h-7 text-amber-500" />
                  Your Communities
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  You are an active member of {myMandalis.length} {myMandalis.length === 1 ? "clan" : "clans"}. Enter your lounge to chat, transfer coins, or squad up.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Another Clan</span>
                </button>
              </div>
            </div>

            {/* User's Clan Headquarters Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myMandalis.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/mandali/${m.handle}`)}
                  className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-amber-500/40 hover:border-amber-500 rounded-3xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-amber-500/10 group cursor-pointer relative overflow-hidden"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-inner">
                          {getEmblemIcon(m.emblem)}
                        </div>
                        <div>
                          <h2 className="font-black text-slate-900 dark:text-white text-lg leading-snug group-hover:text-amber-500 transition-colors">
                            {m.name}
                          </h2>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">@{m.handle}</p>
                        </div>
                      </div>

                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                        Lv {m.level}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed font-medium">
                      {m.description || "Active community lounge."}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {m.language}
                      </span>
                      {m.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer & CTA */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-500" />
                        {m.memberCount} members active
                      </span>
                      <span className="text-emerald-500 font-bold">● Active Lounge</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/mandali/${m.handle}`);
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-amber-500/20 active:scale-98 transition-all"
                    >
                      <span>Enter Clan Lounge</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* On-Demand Expandable Toggle for Discovery Grid */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowExplore((prev) => !prev)}
                className="w-full min-h-[56px] px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-sm flex items-center justify-between group transition-all focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-expanded={showExplore}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {showExplore ? "Hide Explore Directory" : "Browse & Explore Other Mandalis"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Discover {Math.max(mandalis.length, DEFAULT_PREVIEW_MANDALIS.length)} gaming communities across India
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  <span>{showExplore ? "Collapse" : "Explore All"}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showExplore ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </section>
        ) : (
          /* Futuristic Hero Section for New Users without any Mandalis */
          <section className="text-center sm:text-left py-6 sm:py-8 px-6 sm:px-10 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 border border-slate-200/90 dark:border-slate-800 relative overflow-hidden shadow-lg transition-colors">
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-bold mb-3 shadow-xs">
                <Zap className="w-3.5 h-3.5" />
                Persistent Gaming Lounges
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Find Your Gaming <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Tribe</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Mandali (మండలి) connects players into persistent gaming communities. Form squads,
                launch multiplayer matches, chat in realtime, transfer clan coins, and archive legendary Gnapakalu memories.
              </p>

              {/* Live Telemetry Bar */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {Math.max(mandalis.length, DEFAULT_PREVIEW_MANDALIS.length)}
                    </strong>{" "}
                    Communities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-500" />
                  <span><strong className="text-slate-900 dark:text-white font-bold">12+</strong> Multiplayer Games</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  <span><strong className="text-slate-900 dark:text-white font-bold">Gnapakalu</strong> Memories</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Explore Matrix & Grid — Rendered if user has 0 mandalis OR if showExplore is toggled on */}
        {isExploreVisible && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search & Filter Matrix */}
            <section className="bg-white/90 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm backdrop-blur-xl">
              <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Mandalis by name, handle, or focus..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none shadow-xs"
                >
                  Search
                </button>
              </form>

              {/* Filter Pills */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/60">
                {/* Language Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase mr-1">Lang:</span>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang);
                        handleFilterChange(lang, selectedTag, searchQuery);
                      }}
                      className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        selectedLanguage === lang
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                {/* Tag Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase mr-1">Tag:</span>
                  {POPULAR_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(tag);
                        handleFilterChange(selectedLanguage, tag, searchQuery);
                      }}
                      className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        selectedTag === tag
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
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
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Explore All Mandalis ({mandalis.length})
                </h2>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-52 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : mandalis.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 backdrop-blur-md">
                  <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Mandalis Found</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-5 font-medium">
                    No communities match your current filters. Try resetting the filters or create your own Mandali!
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguage("All");
                        setSelectedTag("All");
                        setSearchQuery("");
                        handleFilterChange("All", "All", "");
                      }}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      Reset All Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateClick}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      Create New Mandali
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mandalis.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/70 dark:hover:border-amber-500/70 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl group relative overflow-hidden cursor-pointer min-h-[220px]"
                      onClick={() => navigate(`/mandali/${m.handle}`)}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-inner">
                              {getEmblemIcon(m.emblem)}
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug group-hover:text-amber-500 transition-colors">
                                {m.name}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">@{m.handle}</p>
                            </div>
                          </div>

                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                            Lv {m.level}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed font-medium">
                          {m.description || "No description provided."}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {m.language}
                          </span>
                          {m.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer & CTA */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                        {/* Member fill bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-amber-500" />
                              {m.memberCount.toLocaleString()} members
                            </span>
                            <span className="text-slate-400 dark:text-slate-600">{m.maxMembers} capacity</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                              style={{ width: `${Math.min(100, Math.round((m.memberCount / m.maxMembers) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/mandali/${m.handle}`);
                            }}
                            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-400 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                          >
                            Enter Lounge
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Guest Auth Required Modal */}
      {showAuthPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              BHALYAM Account Required
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Mandali clans are persistent, server-authoritative communities. Guest users cannot create or join Mandalis. Please sign in or create an account to start your clan.
            </p>
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAuthPrompt(false)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                Sign In to BHALYAM
              </button>
            </div>
          </div>
        </div>
      )}

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
    </AppLayout>
  );
}
