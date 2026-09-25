import { useEffect, useMemo, useState } from "react";
import type {
  Mandali,
  MandaliChannel,
  MandaliMember,
  MandaliMemory,
  MandaliMessage,
  MandaliParty,
} from "@shared/mandali/types.js";
import { MandaliHubDesktop } from "./mandali/MandaliHubDesktop";
import { MandaliHubMobile } from "./mandali/MandaliHubMobile";
import MandaliDiscoveryPage from "./mandali/MandaliDiscoveryPage";
import GroupInfoModal from "../components/mandali/GroupInfoModal";
import LeaveMandaliDialog from "../components/mandali/LeaveMandaliDialog";
import InviteShareSheet from "../components/mandali/InviteShareSheet";
import MemberManagementSheet from "../components/mandali/MemberManagementSheet";
import NotificationLevelSheet from "../components/mandali/NotificationLevelSheet";
import { CreateMandaliModal } from "./mandali/CreateMandaliModal";
import { useMandaliStore } from "../store/mandaliStore";
import { useMandaliInboxStore } from "../store/mandaliInboxStore";

/**
 * Development-only design preview for the Mandali screens.
 *
 *   /preview/mandali?view=mobile|desktop&theme=light|dark
 *
 * The real Mandali sits behind a member login that local development cannot
 * provide, so this renders the same components with SYNTHETIC data — made-up
 * people and lines, never anything from a real group. It exists so the design
 * can be looked at, at real phone and desktop sizes, in both themes.
 * Registered only when `import.meta.env.DEV` (see App.tsx).
 */

const MINUTE = 60_000;
const NOW = Date.now();
const at = (minutesAgo: number): number => NOW - minutesAgo * MINUTE;

const mandali = {
  id: "mandali_preview_nellore",
  handle: "nellore-gang",
  name: "Nellore Gang",
  description: "Old friends, new games.",
  level: 3,
  xp: 240,
  memberCount: 6,
} as unknown as Mandali;

const person = (
  id: string,
  displayName: string,
  role: MandaliMember["role"],
  presence: MandaliMember["presence"],
  avatar: string,
): MandaliMember => ({
  memberId: `mem_${id}`,
  mandaliId: mandali.id,
  playerId: id,
  displayName,
  avatar,
  role,
  state: "ACTIVE",
  joinedAt: at(60 * 24 * 40),
  presence,
  contributionScore: 0,
});

const members: MandaliMember[] = [
  person("me", "Kethan", "OWNER", "online", "file_0000000084c48208b1f893419d784cf2_1.jpg"),
  person("asha", "Asha", "MEMBER", "online", "file_0000000084c48208b1f893419d784cf2_3.jpg"),
  person("bala", "Bala", "MEMBER", "in-game", "file_0000000084c48208b1f893419d784cf2_5.jpg"),
  person("charan", "Charan", "LEADER", "offline", "file_0000000084c48208b1f893419d784cf2_8.jpg"),
  person("devi", "దేవి", "MEMBER", "idle", "file_0000000084c48208b1f893419d784cf2_10.jpg"),
  person("eswar", "Eswar Rao", "MEMBER", "offline", "file_0000000084c48208b1f893419d784cf2_12.jpg"),
];

const channels = [
  { channelId: "c_lounge", mandaliId: mandali.id, name: "lounge-chat", description: "Everyday conversation", type: "TEXT" },
  { channelId: "c_play", mandaliId: mandali.id, name: "play-together", description: "Start a game and rally the group", type: "PARTY_FINDING" },
  { channelId: "c_news", mandaliId: mandali.id, name: "announcements", description: "Things everyone should see", type: "ANNOUNCEMENT" },
] as unknown as MandaliChannel[];

let counter = 0;
const line = (
  senderId: string,
  content: string,
  minutesAgo: number,
  extra: Partial<MandaliMessage> = {},
): MandaliMessage => {
  const sender = members.find((m) => m.playerId === senderId) ?? members[0];
  counter += 1;
  return {
    messageId: `msg_${counter}`,
    channelId: "c_lounge",
    mandaliId: mandali.id,
    senderId,
    senderName: sender.displayName,
    senderAvatar: sender.avatar,
    senderRole: sender.role,
    content,
    reactions: {},
    timestamp: at(minutesAgo),
    ...extra,
  };
};

const messages: MandaliMessage[] = [
  line("asha", "Anyone free this Sunday? Amma is making pulihora and I want the whole gang here.", 60 * 30),
  line("bala", "Count me in! I'll bring the Ludo board, the real one.", 60 * 29.8, { reactions: { "❤️": ["me", "asha"], "😂": ["charan"] } }),
  line("devi", "అందరికీ శుభోదయం! ఈ ఆదివారం రాత్రి లూడో ఆడదామా?", 60 * 29.5),
  line("me", "Sunday is perfect. Bala, you are on the losing team again, sorry in advance.", 60 * 29.2),
  line("charan", "Charan joined the Mandali", 60 * 28, { kind: "SYSTEM" }),
  line("asha", "Everyone: Sunday, 8 pm, video off, cameras on. No excuses this time.", 60 * 6, { pinned: true, reactions: { "👍": ["me", "bala", "devi"] } }),
  line("bala", "Reached home. Tired but happy.", 42),
  line("bala", "Also, who moved my token last time? Asking for a friend.", 41),
  line("charan", "That was Eswar. He denies everything.", 38, { reactions: { "😂": ["me", "asha", "bala"] } }),
  line("me", "Good morning, family. Here is to Sunday.", 6),
  line("asha", "Bringing the sweets 🍬 — Devi, please don't forget the chairs.", 4),
  line("devi", "మర్చిపోను! 😄", 2),
];

const parties: MandaliParty[] = [
  {
    partyId: "party_1", mandaliId: mandali.id, leaderId: "asha", leaderName: "Asha", game: "ludo", modeId: "casual",
    title: "Sunday night Ludo", slots: 4, status: "FORMING", createdAt: at(30),
    members: [
      { playerId: "asha", displayName: "Asha", avatar: "file_0000000084c48208b1f893419d784cf2_3.jpg", isReady: true },
      { playerId: "bala", displayName: "Bala", avatar: "file_0000000084c48208b1f893419d784cf2_5.jpg", isReady: true },
    ],
  },
  {
    partyId: "party_2", mandaliId: mandali.id, leaderId: "me", leaderName: "Kethan", game: "rummy", modeId: "casual",
    title: "Rummy after dinner", slots: 6, status: "FORMING", createdAt: at(12),
    members: [
      { playerId: "me", displayName: "Kethan", avatar: "file_0000000084c48208b1f893419d784cf2_1.jpg", isReady: true },
    ],
  },
];
const memories: MandaliMemory[] = [
  {
    memoryId: "mem_1", mandaliId: mandali.id, type: "GAME_VICTORY", title: "Bala finally wins a Ludo night",
    description: "After eleven losses in a row, four tokens home first. The whole gang was on the call for it.",
    game: "ludo", highlightStat: "Won by two moves", celebratedBy: ["me", "asha", "charan"], timestamp: at(60 * 24 * 9),
  },
  {
    memoryId: "mem_2", mandaliId: mandali.id, type: "ANNIVERSARY", title: "One year of the Nellore Gang",
    description: "It began as a five-person group chat. Today there are six of us and a shared Sunday.",
    celebratedBy: ["me", "asha", "bala", "charan", "devi"], timestamp: at(60 * 24 * 41),
  },
  {
    memoryId: "mem_3", mandaliId: mandali.id, type: "EVENT_MILESTONE", title: "The Ugadi game night",
    description: "Everyone played from their own home and ate pachadi together over the call.",
    celebratedBy: ["me"], timestamp: at(60 * 24 * 190),
  },
];

type View = "mobile" | "desktop" | "shelf" | "shelf-empty";
type Theme = "light" | "dark";
type Sheet = "none" | "info" | "leave" | "invite" | "members" | "notify" | "create";

function readParam<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(name);
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback;
}

const noop = () => undefined;
const noopAsync = async () => ({ success: true });

/** A few shelf entries so the shelf can be seen full; the store's fetches are swapped for no-ops. */
function seedShelf(withGroups: boolean) {
  const group = (id: string, name: string, handle: string, memberCount: number) =>
    ({ ...mandali, id, name, handle, memberCount, maxMembers: 50, language: "Telugu", tags: ["Casual"] }) as unknown as Mandali;
  const mine = withGroups
    ? [
        group("3f6a9b18-5e42-4d07-8c1b-92e7d04a6f35", "Nellore Gang", "nellore-gang", 6),
        group("7c1e4d0a-2b9f-4c53-9a61-d3f0b8e51a27", "Amma's Family", "ammas-family", 14),
        group("e94b7a12-6d03-4f8e-b1c5-0a7d93c2f684", "Saturday Cricket", "saturday-cricket", 9),
      ]
    : [];
  const digest = (mandaliId: string, unreadCount: number, senderName: string, preview: string) =>
    ({ mandaliId, handle: "x", name: "x", emblem: "", level: "ALL", lastReadAt: "", unreadCount, senderCount: 1, topSenders: [], latest: { senderName, kind: "TEXT", preview, at: "" }, invites: [] });
  const seedDigests = () => useMandaliInboxStore.setState({
    digests: withGroups
      ? [digest("3f6a9b18-5e42-4d07-8c1b-92e7d04a6f35", 4, "Asha", "Anyone free this Sunday?"), digest("7c1e4d0a-2b9f-4c53-9a61-d3f0b8e51a27", 12, "Amma", "Dinner at 8, everyone!")]
      : [],
    loaded: true,
  } as never);
  seedDigests();
  // The app shell's own inbox load clears these a moment later; put them back for the screenshot.
  setTimeout(seedDigests, 1200);
  useMandaliStore.setState({
    myMandalis: mine,
    mandalis: [group("mandali_preview_pune", "Pune Ludo Club", "pune-ludo", 22), group("mandali_preview_hyd", "Hyderabad Rummy Night", "hyd-rummy", 50)],
    isLoading: false,
    fetchMyMandalis: async () => undefined,
    fetchMandalis: async () => undefined,
  } as never);
}

export default function PreviewMandali() {
  const view = readParam<View>("view", ["mobile", "desktop", "shelf", "shelf-empty"], "mobile");
  const theme = readParam<Theme>("theme", ["light", "dark"], "dark");
  const sheet = readParam<Sheet>("sheet", ["none", "info", "leave", "invite", "members", "notify", "create"], "none");
  useState(() => {
    if (view === "shelf" || view === "shelf-empty") seedShelf(view === "shelf");
    return null;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const [activeChannelId, setActiveChannelId] = useState("c_lounge");

  const shared = useMemo(
    () => ({
      mandali,
      members,
      channels,
      activeChannelId,
      messages,
      parties,
      memories,
      currentUserId: "me",
      selfId: "me",
      isOwner: true,
      canManageMembers: true,
      canEditInfo: true,
      pendingRequestCount: 2,
      coinRequests: {},
      onSelectChannel: setActiveChannelId,
      onSendMessage: noop,
      onReactMessage: noop,
      onCreateParty: noop,
      onJoinParty: noop,
      onLeaveParty: noop,
      onLaunchParty: noop,
      onOpenCoinTransfer: noop,
      onRequestCoins: noop,
      onPayCoinRequest: noopAsync,
      onPinMessage: noopAsync,
      onDeleteMessage: noopAsync,
      onOpenInvite: noop,
      onOpenGroupInfo: noop,
      onOpenMembers: noop,
      onOpenPendingRequests: noop,
      onLeaveMandali: noop,
      notificationLevel: "ALL" as const,
      onOpenNotificationSettings: noop,
    }),
    [activeChannelId],
  );

  if (view === "shelf" || view === "shelf-empty") return <MandaliDiscoveryPage />;

  const close = noop;
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden" data-preview={`${view}-${theme}`}>
      {view === "mobile" ? <MandaliHubMobile {...shared} /> : <MandaliHubDesktop {...shared} />}
      <GroupInfoModal open={sheet === "info"} onClose={close} mandali={mandali} canEditInfo isOwner onSave={noopAsync} onDelete={noopAsync} />
      <LeaveMandaliDialog
        open={sheet === "leave"}
        onClose={close}
        mandaliName={mandali.name}
        isOwner
        candidates={members.slice(1).map((m) => ({ playerId: m.playerId, displayName: m.displayName, role: m.role }))}
        onLeave={noopAsync}
        onDeleteInstead={noop}
      />
      <InviteShareSheet open={sheet === "invite"} onClose={close} mandaliName={mandali.name} mandaliHandle={mandali.handle} onCreateLink={async () => ({ success: true, url: "https://bhalyam.example/join/x7Kp2Q" }) as never} />
      <MemberManagementSheet
        open={sheet === "members"}
        onClose={close}
        members={members}
        selfId="me"
        onPromote={noopAsync}
        onDemote={noopAsync}
        onKick={noopAsync}
        onBan={noopAsync}
        onTransferOwnership={noopAsync}
      />
      <NotificationLevelSheet open={sheet === "notify"} onClose={close} mandaliName={mandali.name} level="ALL" onChange={noopAsync as never} />
      <CreateMandaliModal open={sheet === "create"} onClose={close} onSubmit={noopAsync} />
    </div>
  );
}
