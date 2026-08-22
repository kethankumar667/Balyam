import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Gamepad2,
  Compass,
  Settings,
  User,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  History,
  DoorOpen,
  X,
  ArrowRight,
  Sparkles,
  Command,
} from "lucide-react";
import { BHALYAM_GAMES, type BhalyamGameCard, type BhalyamGameSlug } from "../bhalyam/data";
import { useTheme } from "../../lib/useTheme";
import { useRoomStore } from "../../store/roomStore";
import { useRecentlyPlayed } from "../../hooks/useRecentlyPlayed";
import { useFavourites } from "../../hooks/useFavourites";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenGameSheet?: (slug: BhalyamGameSlug) => void;
  onOpenJoinRoom?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: "games" | "navigation" | "actions" | "rooms";
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
}

const RECENT_COMMANDS_KEY = "bhalyam.recent_commands";

export default function CommandPalette({
  open,
  onClose,
  onOpenGameSheet,
  onOpenJoinRoom,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const roomCode = useRoomStore((s) => s.roomState?.code);
  const { recentItems } = useRecentlyPlayed();
  const { favourites } = useFavourites();

  // Load recent commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      if (stored) {
        setRecentCommandIds(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const saveRecentCommand = useCallback((id: string) => {
    try {
      setRecentCommandIds((prev) => {
        const next = [id, ...prev.filter((item) => item !== id)].slice(0, 5);
        localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  // Build the complete registry of commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // 1. Games (all BHALYAM games)
    for (const game of BHALYAM_GAMES) {
      list.push({
        id: `game-${game.slug}`,
        title: game.title,
        category: "games",
        subtitle: game.blurb || `${game.playerRange || "Multiplayer"} · ${game.tags.join(", ")}`,
        icon: <Gamepad2 className="w-4 h-4 text-amber-500" />,
        keywords: [game.slug, ...game.tags, "play", "match"],
        action: () => {
          if (onOpenGameSheet) {
            onOpenGameSheet(game.slug);
          } else {
            navigate(`/games?c=${game.tags[0] || "all"}`);
          }
        },
      });
    }

    // 2. Navigation Pages
    list.push(
      {
        id: "nav-all-games",
        title: "All Games Catalog",
        category: "navigation",
        subtitle: "Browse the complete collection of nostalgic 90s games",
        icon: <Compass className="w-4 h-4 text-sky-400" />,
        keywords: ["games", "catalog", "library", "browse"],
        action: () => navigate("/games"),
      },
      {
        id: "nav-favorites",
        title: "Favorites",
        category: "navigation",
        subtitle: `Your starred favorite games (${favourites.length})`,
        icon: <Sparkles className="w-4 h-4 text-rose-400" />,
        keywords: ["favorites", "starred", "loved", "liked"],
        action: () => navigate("/favorites"),
      },
      {
        id: "nav-recent",
        title: "Recently Played",
        category: "navigation",
        subtitle: `Jump back into recently played matches (${recentItems.length})`,
        icon: <History className="w-4 h-4 text-amber-400" />,
        keywords: ["history", "recent", "played"],
        action: () => navigate("/recently-played"),
      },
      {
        id: "nav-profile",
        title: "My Profile & Stats",
        category: "navigation",
        subtitle: "View your stats, achievements, and player history",
        icon: <User className="w-4 h-4 text-purple-400" />,
        keywords: ["profile", "stats", "achievements", "matches", "account"],
        action: () => navigate("/profile"),
      },
      {
        id: "nav-leaderboard",
        title: "Leaderboard",
        category: "navigation",
        subtitle: "Global rankings and competitive ladder",
        icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
        keywords: ["leaderboard", "ranks", "trophy", "ladder", "top"],
        action: () => navigate("/leaderboard"),
      },
      {
        id: "nav-settings",
        title: "Settings & Preferences",
        category: "navigation",
        subtitle: "Manage themes, audio, language, and privacy",
        icon: <Settings className="w-4 h-4 text-zinc-400" />,
        keywords: ["settings", "preferences", "config", "audio", "theme"],
        action: () => navigate("/settings/preferences"),
      }
    );

    // 3. Quick Actions
    list.push(
      {
        id: "action-toggle-theme",
        title: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
        category: "actions",
        subtitle: `Currently in ${isDark ? "Dark" : "Light"} parchment mode`,
        icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        shortcut: "Theme",
        keywords: ["dark", "light", "mode", "theme", "color"],
        action: () => toggleTheme(),
      },
      {
        id: "action-join-room",
        title: "Join Room by Code",
        category: "rooms",
        subtitle: "Enter a 6-character room code to join friends",
        icon: <DoorOpen className="w-4 h-4 text-emerald-400" />,
        keywords: ["join", "room", "code", "multiplayer", "enter"],
        action: () => {
          if (onOpenJoinRoom) {
            onOpenJoinRoom();
          } else {
            navigate("/games");
          }
        },
      }
    );

    if (roomCode && !location.pathname.startsWith(`/room/${roomCode}`)) {
      list.push({
        id: "action-active-room",
        title: `Resume Active Room (#${roomCode})`,
        category: "rooms",
        subtitle: "You have an ongoing match waiting",
        icon: <DoorOpen className="w-4 h-4 text-amber-400 animate-pulse" />,
        keywords: ["rejoin", "active", "match", "room", roomCode.toLowerCase()],
        action: () => navigate(`/room/${roomCode}`),
      });
    }

    return list;
  }, [favourites.length, isDark, location.pathname, navigate, onOpenGameSheet, onOpenJoinRoom, recentItems.length, roomCode, toggleTheme]);

  // If the query looks like a 6-char room code (e.g. "ABC123" or "join ABC123")
  const directRoomCode = useMemo(() => {
    const trimmed = query.trim().toUpperCase();
    const joinMatch = trimmed.match(/^(?:JOIN\s+)?([A-Z0-9]{4,8})$/);
    if (joinMatch && !allCommands.some((c) => c.title.toUpperCase() === trimmed)) {
      return joinMatch[1];
    }
    return null;
  }, [allCommands, query]);

  // Filter commands by query
  const filteredCommands = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // If empty query, show recent commands + top suggested
      if (recentCommandIds.length > 0) {
        const recents = recentCommandIds
          .map((id) => allCommands.find((c) => c.id === id))
          .filter((c): c is CommandItem => Boolean(c));
        const others = allCommands.filter((c) => !recentCommandIds.includes(c.id));
        return [...recents, ...others];
      }
      return allCommands;
    }

    return allCommands.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(q)) return true;
      if (cmd.subtitle?.toLowerCase().includes(q)) return true;
      if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [allCommands, query, recentCommandIds]);

  // Active command items list including direct room join item
  const displayItems = useMemo<CommandItem[]>(() => {
    const items = [...filteredCommands];
    if (directRoomCode) {
      items.unshift({
        id: `direct-join-${directRoomCode}`,
        title: `Join Room #${directRoomCode}`,
        category: "rooms",
        subtitle: "Jump straight into this game room",
        icon: <DoorOpen className="w-4 h-4 text-emerald-400" />,
        action: () => {
          navigate(`/room/${directRoomCode}`);
        },
      });
    }
    return items;
  }, [directRoomCode, filteredCommands, navigate]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (displayItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % displayItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = displayItems[selectedIndex];
      if (item) {
        saveRecentCommand(item.id);
        onClose();
        item.action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--chrome-border)] bg-[var(--chrome-panel)] text-[var(--chrome-ink)] flex flex-col max-h-[80vh] z-10"
        >
          {/* Input Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-control)]/30">
            <Search className="w-5 h-5 text-[var(--chrome-ink-soft)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search games, pages, actions, or enter a room code..."
              className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-[var(--chrome-ink)] placeholder:text-[var(--chrome-ink-soft)]/60 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="p-1 rounded-md text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--chrome-ink-soft)] bg-[var(--chrome-control)] rounded border border-[var(--chrome-border)]">
                ESC
              </kbd>
            )}
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px] focus:outline-none"
          >
            {displayItems.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2 text-[var(--chrome-ink-soft)]">
                <Gamepad2 className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-sm font-semibold">No commands matching &ldquo;{query}&rdquo;</p>
                <p className="text-xs opacity-70">
                  Try searching for &ldquo;Ludo&rdquo;, &ldquo;Dark Mode&rdquo;, &ldquo;Profile&rdquo;, or typing a room code.
                </p>
              </div>
            ) : (
              displayItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      saveRecentCommand(item.id);
                      onClose();
                      item.action();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] shadow-2xs border border-[var(--chrome-border)]"
                        : "text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--chrome-control)] border border-[var(--chrome-border)]">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold truncate">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-[var(--chrome-ink-soft)] truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.shortcut && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)]">
                          {item.shortcut}
                        </span>
                      )}
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 text-[var(--chrome-accent)] animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts Help */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-control)]/20 text-[11px] text-[var(--chrome-ink-soft)] select-none">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--chrome-control)] border border-[var(--chrome-border)] font-mono text-[9px] font-bold">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--chrome-control)] border border-[var(--chrome-border)] font-mono text-[9px] font-bold">
                  ↵
                </kbd>
                <span>Select</span>
              </span>
            </div>
            <div className="text-[10px] font-semibold opacity-75">
              BHALYAM Spotlight
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
