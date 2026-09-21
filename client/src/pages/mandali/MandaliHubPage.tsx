/**
 * BHALYAM Mandali — Futuristic Hub Page (Responsive Router Container)
 *
 * Selects between MandaliHubDesktop and MandaliHubMobile using useViewport().
 * Coordinates realtime socket connection, membership joining, theme toggling,
 * and M-10 Game Launch handoffs.
 *
 * Requirements:
 * - Full Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Strictly NO usage of Sparkles from lucide-react. Uses Crown, Play, Trophy, Users, Zap, Sun, Moon.
 * - WCAG 2.1 AA compliant focus rings.
 */

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useViewport } from "../../lib/useViewport";
import { useMandaliStore } from "../../store/mandaliStore";
import { usePlayerId } from "../../lib/playerIdentity";
import { useTheme } from "../../lib/useTheme";
import { MandaliHubDesktop } from "./MandaliHubDesktop";
import { MandaliHubMobile } from "./MandaliHubMobile";
import { Play, Crown, Users, Zap, Sun, Moon } from "lucide-react";

export default function MandaliHubPage(): JSX.Element {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const viewport = useViewport();
  const { playerId } = usePlayerId();
  const [theme, toggleTheme] = useTheme();

  const {
    activeMandali,
    members,
    channels,
    activeChannelId,
    messages,
    parties,
    memories,
    activeGameLaunch,
    isLoading,
    errorMessage,
    fetchMandaliByHandleOrId,
    setActiveChannel,
    sendMessage,
    reactToMessage,
    createParty,
    joinParty,
    leaveParty,
    launchParty,
    joinMandali,
    leaveMandali,
    initMandaliSocket,
    cleanupMandaliSocket,
    clearActiveLaunch,
  } = useMandaliStore();

  useEffect(() => {
    if (handle) {
      fetchMandaliByHandleOrId(handle);
    }
  }, [handle, fetchMandaliByHandleOrId]);

  useEffect(() => {
    if (activeMandali?.id && playerId) {
      initMandaliSocket(activeMandali.id, playerId);
      return () => {
        cleanupMandaliSocket(activeMandali.id, playerId);
      };
    }
  }, [activeMandali?.id, playerId, initMandaliSocket, cleanupMandaliSocket]);

  if (!isLoading && errorMessage && !activeMandali) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Mandali Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate("/mandali")}
          className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm shadow-md"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  if (isLoading || !activeMandali) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm font-bold">Connecting to Mandali Lounge...</p>
      </div>
    );
  }


  const isCurrentMember = members.some((m) => m.playerId === playerId);
  const activeChannelMessages = activeChannelId ? messages[activeChannelId] || [] : [];

  const handleLaunchToRoom = () => {
    if (!activeGameLaunch) return;
    const targetRoom = activeGameLaunch.roomCode;
    clearActiveLaunch();
    navigate(`/room/${targetRoom}`);
  };

  const sharedProps = {
    mandali: activeMandali,
    members,
    channels,
    activeChannelId,
    messages: activeChannelMessages,
    parties,
    memories,
    currentUserId: playerId,
    onSelectChannel: setActiveChannel,
    onSendMessage: (content: string) => sendMessage(content),
    onReactMessage: (messageId: string, emoji: string) => reactToMessage(messageId, emoji),
    onCreateParty: (game: any, modeId: string, title: string, slots: number) =>
      createParty(game, modeId, title, slots),
    onJoinParty: (partyId: string) => joinParty(partyId),
    onLeaveParty: (partyId: string) => leaveParty(partyId),
    onLaunchParty: (partyId: string) => launchParty(partyId),
    onLeaveMandali: async () => {
      await leaveMandali(activeMandali.id);
      navigate("/mandali");
    },
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Visitor Banner if not yet a member */}
      {!isCurrentMember && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>You are previewing {activeMandali.name}. Join to chat in real-time and squad up!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 transition-colors"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await joinMandali(activeMandali.id);
                if (!res.success) {
                  alert(res.error || "Failed to join");
                }
              }}
              className="min-h-[36px] px-4 py-1 rounded-lg bg-slate-950 text-amber-400 font-extrabold hover:bg-slate-900 transition-colors shadow"
            >
              Join Mandali
            </button>
          </div>
        </div>
      )}

      {/* Floating Theme Switcher if already a member */}
      {isCurrentMember && (
        <div className="fixed bottom-4 right-4 z-40 hidden md:block">
          <button
            type="button"
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 shadow-lg flex items-center gap-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-amber-500"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            <span className="capitalize">{theme} Mode</span>
          </button>
        </div>
      )}

      {/* Responsive Viewport Switcher */}
      {viewport === "desktop" ? (
        <MandaliHubDesktop {...sharedProps} />
      ) : (
        <MandaliHubMobile {...sharedProps} />
      )}

      {/* M-10 Game Launch Handoff Overlay */}
      {activeGameLaunch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 mx-auto mb-4 shadow-inner">
              <Play className="w-8 h-8 fill-current" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 inline-block mb-2">
              Squad Match Launched!
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
              Your Squad is Entering the Arena
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium">
              Room Code:{" "}
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-base">
                {activeGameLaunch.roomCode}
              </span>{" "}
              ({activeGameLaunch.game.toUpperCase()})
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearActiveLaunch}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleLaunchToRoom}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Enter Arena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
