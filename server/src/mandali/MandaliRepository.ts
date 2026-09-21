import type {
  Mandali,
  MandaliMember,
  MandaliChannel,
  MandaliMessage,
  MandaliParty,
  MandaliEvent,
  MandaliMemory,
  MandaliAuditLog,
  MandaliApplication,
  MandaliInvitation,
} from "@shared/mandali/types.js";
import { pickAvatarForName } from "@shared/avatars.js";

export class MandaliRepository {
  private mandalis = new Map<string, Mandali>();
  private mandalisByHandle = new Map<string, string>(); // handle.toLowerCase() -> id
  private members = new Map<string, Map<string, MandaliMember>>(); // mandaliId -> (playerId -> member)
  private applications = new Map<string, MandaliApplication[]>(); // mandaliId -> applications
  private invitations = new Map<string, MandaliInvitation[]>(); // mandaliId -> invitations
  private channels = new Map<string, MandaliChannel[]>(); // mandaliId -> channels
  private messages = new Map<string, MandaliMessage[]>(); // channelId -> messages
  private parties = new Map<string, MandaliParty>(); // partyId -> party
  private mandaliParties = new Map<string, Set<string>>(); // mandaliId -> Set<partyId>
  private events = new Map<string, MandaliEvent[]>(); // mandaliId -> events
  private memories = new Map<string, MandaliMemory[]>(); // mandaliId -> memories (Gnapakalu)
  private auditLogs = new Map<string, MandaliAuditLog[]>(); // mandaliId -> logs

  constructor() {
    this.seedDefaultMandalis();
  }

  /* ── Mandali Core ── */

  public getById(id: string): Mandali | undefined {
    return this.mandalis.get(id);
  }

  public getByHandle(handle: string): Mandali | undefined {
    const id = this.mandalisByHandle.get(handle.toLowerCase().replace(/^@/, ""));
    return id ? this.mandalis.get(id) : undefined;
  }

  public getAll(filter?: {
    search?: string;
    language?: string;
    tag?: string;
  }): Mandali[] {
    let list = Array.from(this.mandalis.values()).filter(
      (m) => m.visibility !== "HIDDEN"
    );

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.handle.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    if (filter?.language && filter.language !== "All") {
      list = list.filter((m) => m.language.toLowerCase() === filter.language?.toLowerCase());
    }

    if (filter?.tag) {
      list = list.filter((m) => m.tags.includes(filter.tag!));
    }

    return list.sort((a, b) => b.memberCount - a.memberCount);
  }

  public saveMandali(mandali: Mandali): void {
    this.mandalis.set(mandali.id, mandali);
    this.mandalisByHandle.set(mandali.handle.toLowerCase(), mandali.id);
  }

  /* ── Members ── */

  public getMembers(mandaliId: string): MandaliMember[] {
    const memberMap = this.members.get(mandaliId);
    return memberMap ? Array.from(memberMap.values()) : [];
  }

  public getMember(mandaliId: string, playerId: string): MandaliMember | undefined {
    return this.members.get(mandaliId)?.get(playerId);
  }

  public saveMember(member: MandaliMember): void {
    if (!this.members.has(member.mandaliId)) {
      this.members.set(member.mandaliId, new Map());
    }
    this.members.get(member.mandaliId)!.set(member.playerId, member);

    // Update memberCount
    const mandali = this.mandalis.get(member.mandaliId);
    if (mandali) {
      const activeCount = Array.from(this.members.get(member.mandaliId)!.values()).filter(
        (m) => m.state === "ACTIVE"
      ).length;
      mandali.memberCount = activeCount;
      mandali.updatedAt = Date.now();
    }
  }

  public removeMember(mandaliId: string, playerId: string): boolean {
    const memberMap = this.members.get(mandaliId);
    if (!memberMap) return false;
    const removed = memberMap.delete(playerId);
    if (removed) {
      const mandali = this.mandalis.get(mandaliId);
      if (mandali) {
        mandali.memberCount = memberMap.size;
      }
    }
    return removed;
  }

  public getPlayerMandalis(playerId: string): Mandali[] {
    const result: Mandali[] = [];
    for (const [mandaliId, memberMap] of this.members.entries()) {
      const member = memberMap.get(playerId);
      if (member && member.state === "ACTIVE") {
        const m = this.mandalis.get(mandaliId);
        if (m) result.push(m);
      }
    }
    return result;
  }

  /* ── Applications & Invitations ── */

  public getApplications(mandaliId: string): MandaliApplication[] {
    return this.applications.get(mandaliId) ?? [];
  }

  public saveApplication(app: MandaliApplication): void {
    const list = this.applications.get(app.mandaliId) ?? [];
    const idx = list.findIndex((a) => a.id === app.id);
    if (idx >= 0) {
      list[idx] = app;
    } else {
      list.push(app);
    }
    this.applications.set(app.mandaliId, list);
  }

  public getInvitations(mandaliId: string): MandaliInvitation[] {
    return this.invitations.get(mandaliId) ?? [];
  }

  public saveInvitation(inv: MandaliInvitation): void {
    const list = this.invitations.get(inv.mandaliId) ?? [];
    const idx = list.findIndex((i) => i.id === inv.id);
    if (idx >= 0) {
      list[idx] = inv;
    } else {
      list.push(inv);
    }
    this.invitations.set(inv.mandaliId, list);
  }

  /* ── Channels & Messages ── */

  public getChannels(mandaliId: string): MandaliChannel[] {
    return this.channels.get(mandaliId) ?? [];
  }

  public saveChannel(channel: MandaliChannel): void {
    const list = this.channels.get(channel.mandaliId) ?? [];
    const idx = list.findIndex((c) => c.channelId === channel.channelId);
    if (idx >= 0) {
      list[idx] = channel;
    } else {
      list.push(channel);
    }
    this.channels.set(channel.mandaliId, list.sort((a, b) => a.position - b.position));
  }

  public getMessages(channelId: string, limit = 50): MandaliMessage[] {
    const msgs = this.messages.get(channelId) ?? [];
    return msgs.slice(-limit);
  }

  public saveMessage(message: MandaliMessage): void {
    const msgs = this.messages.get(message.channelId) ?? [];
    const idx = msgs.findIndex((m) => m.messageId === message.messageId);
    if (idx >= 0) {
      msgs[idx] = message;
    } else {
      msgs.push(message);
      // Sliding window of max 150 messages per channel in memory
      if (msgs.length > 150) {
        msgs.shift();
      }
    }
    this.messages.set(message.channelId, msgs);
  }

  /* ── Parties ── */

  public getParty(partyId: string): MandaliParty | undefined {
    return this.parties.get(partyId);
  }

  public getParties(mandaliId: string): MandaliParty[] {
    const partyIds = this.mandaliParties.get(mandaliId);
    if (!partyIds) return [];
    const res: MandaliParty[] = [];
    for (const pid of partyIds) {
      const p = this.parties.get(pid);
      if (p && p.status !== "DISBANDED") {
        res.push(p);
      }
    }
    return res;
  }

  public saveParty(party: MandaliParty): void {
    this.parties.set(party.partyId, party);
    if (!this.mandaliParties.has(party.mandaliId)) {
      this.mandaliParties.set(party.mandaliId, new Set());
    }
    this.mandaliParties.get(party.mandaliId)!.add(party.partyId);
  }

  /* ── Events ── */

  public getEvents(mandaliId: string): MandaliEvent[] {
    return this.events.get(mandaliId) ?? [];
  }

  public saveEvent(event: MandaliEvent): void {
    const list = this.events.get(event.mandaliId) ?? [];
    const idx = list.findIndex((e) => e.eventId === event.eventId);
    if (idx >= 0) {
      list[idx] = event;
    } else {
      list.push(event);
    }
    this.events.set(event.mandaliId, list.sort((a, b) => a.scheduledAt - b.scheduledAt));
  }

  /* ── Gnapakalu Memories ── */

  public getMemories(mandaliId: string): MandaliMemory[] {
    return this.memories.get(mandaliId) ?? [];
  }

  public saveMemory(memory: MandaliMemory): void {
    const list = this.memories.get(memory.mandaliId) ?? [];
    list.unshift(memory);
    if (list.length > 50) list.pop();
    this.memories.set(memory.mandaliId, list);
  }

  /* ── Audit Logs ── */

  public getAuditLogs(mandaliId: string, limit = 50): MandaliAuditLog[] {
    const logs = this.auditLogs.get(mandaliId) ?? [];
    return logs.slice(-limit).reverse();
  }

  public saveAuditLog(log: MandaliAuditLog): void {
    const list = this.auditLogs.get(log.mandaliId) ?? [];
    list.push(log);
    if (list.length > 200) list.shift();
    this.auditLogs.set(log.mandaliId, list);
  }

  /* ── Default Seed Data ── */

  private seedDefaultMandalis(): void {
    const now = Date.now();
    const HOUR = 1000 * 60 * 60;
    const DAY = HOUR * 24;

    const defaultMandalis: Mandali[] = [
      {
        id: "mandali_ludo_kings",
        handle: "ludo-maharajas",
        name: "Ludo Lounge Maharajas",
        description: "Dedicated to precision dice rolls, cut-throat tactical blockades, and high-stakes speedrun circuits across Indian lounge boards.",
        emblem: "pawn_amber",
        bannerGradient: "from-amber-600 via-yellow-600 to-orange-700",
        language: "Telugu",
        region: "Telangana & AP",
        tags: ["Tournaments", "Ludo", "Competitive", "Weekend Play"],
        visibility: "PUBLIC",
        memberCount: 28,
        maxMembers: 50,
        level: 4,
        xp: 3450,
        ownerId: "p_rajesh_ludo",
        createdAt: now - DAY * 30,
        updatedAt: now,
      },
      {
        id: "mandali_hc_warriors",
        handle: "hand-cricket-champs",
        name: "Street & Galli Hand Cricket League",
        description: "Childhood finger-cricket nostalgia! High-voltage death overs, boundary blitzes, and galli cricket tournaments every weekend evening.",
        emblem: "flame_ruby",
        bannerGradient: "from-rose-600 via-red-600 to-amber-700",
        language: "Hindi",
        region: "All India",
        tags: ["Hand Cricket", "Casual", "Weekend Play", "Voice Lounge"],
        visibility: "PUBLIC",
        memberCount: 42,
        maxMembers: 60,
        level: 6,
        xp: 6200,
        ownerId: "p_vikram_hc",
        createdAt: now - DAY * 45,
        updatedAt: now,
      },
      {
        id: "mandali_rummy_royals",
        handle: "rummy-royals",
        name: "Classic Rummy Royals",
        description: "Mastery over pure sequences, second sequences, and disciplined drops. Where 0 penalty points is the only acceptable declaration.",
        emblem: "crown_gold",
        bannerGradient: "from-purple-600 via-indigo-600 to-slate-900",
        language: "English",
        region: "Global",
        tags: ["Rummy", "Tournaments", "Competitive"],
        visibility: "DISCOVERABLE",
        memberCount: 31,
        maxMembers: 50,
        level: 5,
        xp: 4800,
        ownerId: "p_aditi_rummy",
        createdAt: now - DAY * 25,
        updatedAt: now,
      },
      {
        id: "mandali_snl_explorers",
        handle: "snakes-and-ladders-club",
        name: "Paramapada Sopanam (Vaikuntapali Club)",
        description: "Sacred boards, fateful 99-snake drops, and miraculous ladder ascents. Reliving traditional Indian board games with hearty laughter.",
        emblem: "shield_sapphire",
        bannerGradient: "from-emerald-600 via-teal-600 to-cyan-700",
        language: "Telugu",
        region: "South India",
        tags: ["Casual", "Weekend Play", "Voice Lounge"],
        visibility: "PUBLIC",
        memberCount: 18,
        maxMembers: 40,
        level: 3,
        xp: 2150,
        ownerId: "p_venkat_v",
        createdAt: now - DAY * 18,
        updatedAt: now,
      },
      {
        id: "mandali_uno_champs",
        handle: "uno-frenzy",
        name: "Wild Draw-4 Blitz Guild",
        description: "Stacking +4 cards, ruthless colour switches, and split-second 'UNO!' calls. Friendly chaos and fast-paced party games every night.",
        emblem: "flame_ruby",
        bannerGradient: "from-cyan-600 via-blue-600 to-indigo-800",
        language: "English",
        region: "Bangalore & Hyderabad",
        tags: ["UNO", "Casual", "Voice Lounge"],
        visibility: "PUBLIC",
        memberCount: 24,
        maxMembers: 45,
        level: 4,
        xp: 3900,
        ownerId: "p_sneha_w",
        createdAt: now - DAY * 22,
        updatedAt: now,
      },
    ];

    for (const m of defaultMandalis) {
      this.saveMandali(m);
    }

    /* ══════════════════════════════════════════════════════════
       1. SEED: LUDO LOUNGE MAHARAJAS
       ══════════════════════════════════════════════════════════ */
    const ludoId = "mandali_ludo_kings";
    const ludoMembers: MandaliMember[] = [
      {
        memberId: `mem_${ludoId}_1`,
        mandaliId: ludoId,
        playerId: "p_rajesh_ludo",
        displayName: "Rajesh Maharajah",
        avatar: pickAvatarForName("Rajesh Maharajah"),
        role: "OWNER",
        state: "ACTIVE",
        joinedAt: now - DAY * 30,
        presence: "online",
        activeGame: "ludo",
        contributionScore: 2840,
      },
      {
        memberId: `mem_${ludoId}_2`,
        mandaliId: ludoId,
        playerId: "p_sai_kittu",
        displayName: "Sai Krishna (Kittu)",
        avatar: pickAvatarForName("Sai Krishna (Kittu)"),
        role: "LEADER",
        state: "ACTIVE",
        joinedAt: now - DAY * 28,
        presence: "in-game",
        activeGame: "ludo",
        contributionScore: 2150,
      },
      {
        memberId: `mem_${ludoId}_3`,
        mandaliId: ludoId,
        playerId: "p_ananya_s",
        displayName: "Ananya Sharma",
        avatar: pickAvatarForName("Ananya Sharma"),
        role: "OFFICER",
        state: "ACTIVE",
        joinedAt: now - DAY * 20,
        presence: "online",
        contributionScore: 1820,
      },
      {
        memberId: `mem_${ludoId}_4`,
        mandaliId: ludoId,
        playerId: "p_kavitha_r",
        displayName: "Kavitha Reddy",
        avatar: pickAvatarForName("Kavitha Reddy"),
        role: "MODERATOR",
        state: "ACTIVE",
        joinedAt: now - DAY * 15,
        presence: "idle",
        contributionScore: 1450,
      },
      {
        memberId: `mem_${ludoId}_5`,
        mandaliId: ludoId,
        playerId: "p_rahul_d",
        displayName: "Rahul Dravid Fan",
        avatar: pickAvatarForName("Rahul Dravid Fan"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 10,
        presence: "online",
        activeGame: "ludo",
        contributionScore: 980,
      },
      {
        memberId: `mem_${ludoId}_6`,
        mandaliId: ludoId,
        playerId: "p_harish_r",
        displayName: "Harish Rao",
        avatar: pickAvatarForName("Harish Rao"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 8,
        presence: "offline",
        contributionScore: 760,
      },
      {
        memberId: `mem_${ludoId}_7`,
        mandaliId: ludoId,
        playerId: "p_swathi_k",
        displayName: "Swathi K",
        avatar: pickAvatarForName("Swathi K"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 5,
        presence: "online",
        contributionScore: 620,
      },
    ];
    for (const mem of ludoMembers) this.saveMember(mem);

    const ludoChannels: MandaliChannel[] = [
      {
        channelId: `ch_${ludoId}_announcements`,
        mandaliId: ludoId,
        name: "announcements",
        type: "ANNOUNCEMENT",
        description: "Official notifications, weekend tournament schedule, and hall of fame notes.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 0,
      },
      {
        channelId: `ch_${ludoId}_lounge`,
        mandaliId: ludoId,
        name: "lounge-chat",
        type: "TEXT",
        description: "Casual chatter, match highlights, and friendly banter.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 1,
      },
      {
        channelId: `ch_${ludoId}_party_finding`,
        mandaliId: ludoId,
        name: "squad-formation",
        type: "PARTY_FINDING",
        description: "Form 4-player lobbies and launch into live Ludo match rooms.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 2,
      },
      {
        channelId: `ch_${ludoId}_tactics`,
        mandaliId: ludoId,
        name: "dice-tactics",
        type: "TEXT",
        description: "Safe-zone management, blockade strategy, and token pacing discussion.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 3,
      },
    ];
    for (const ch of ludoChannels) this.saveChannel(ch);

    // Messages
    this.saveMessage({
      messageId: `msg_${ludoId}_a1`,
      channelId: `ch_${ludoId}_announcements`,
      mandaliId: ludoId,
      senderId: "p_rajesh_ludo",
      senderName: "Rajesh Maharajah",
      senderAvatar: pickAvatarForName("Rajesh Maharajah"),
      senderRole: "OWNER",
      content: "👑 **Welcome to Ludo Lounge Maharajas!** The weekend speedrun bracket opens this Saturday at 8:00 PM IST. Top 4 players unlock the Gold Crown insignia. Respect table etiquette and no stalling on turns!",
      reactions: { "👑": ["p_rajesh_ludo", "p_sai_kittu", "p_ananya_s"], "🔥": ["p_rahul_d", "p_swathi_k"] },
      pinned: true,
      timestamp: now - DAY * 2,
    });

    const ludoChat: MandaliMessage[] = [
      {
        messageId: `msg_${ludoId}_c1`,
        channelId: `ch_${ludoId}_lounge`,
        mandaliId: ludoId,
        senderId: "p_sai_kittu",
        senderName: "Sai Krishna (Kittu)",
        senderAvatar: pickAvatarForName("Sai Krishna (Kittu)"),
        senderRole: "LEADER",
        content: "Anyone up for a 4-player classic Ludo round right now? Need 1 more person so we don't have to fill with bots! 🎲",
        reactions: { "🎯": ["p_ananya_s", "p_rajesh_ludo"] },
        timestamp: now - HOUR * 3,
      },
      {
        messageId: `msg_${ludoId}_c2`,
        channelId: `ch_${ludoId}_lounge`,
        mandaliId: ludoId,
        senderId: "p_ananya_s",
        senderName: "Ananya Sharma",
        senderAvatar: pickAvatarForName("Ananya Sharma"),
        senderRole: "OFFICER",
        content: "I'm in! Let me just finish my tea. Save a yellow token seat for me!",
        reactions: { "❤️": ["p_sai_kittu"] },
        replyToId: `msg_${ludoId}_c1`,
        timestamp: now - HOUR * 2 - 45 * 60 * 1000,
      },
      {
        messageId: `msg_${ludoId}_c3`,
        channelId: `ch_${ludoId}_lounge`,
        mandaliId: ludoId,
        senderId: "p_rahul_d",
        senderName: "Rahul Dravid Fan",
        senderAvatar: pickAvatarForName("Rahul Dravid Fan"),
        senderRole: "MEMBER",
        content: "Rey Kittu, remember yesterday's match? You rolled three sixes in a row and cut my master token right outside home 😭 That was ruthless!",
        reactions: { "🔥": ["p_rajesh_ludo"], "😂": ["p_sai_kittu", "p_ananya_s"] },
        timestamp: now - HOUR * 2 - 10 * 60 * 1000,
      },
      {
        messageId: `msg_${ludoId}_c4`,
        channelId: `ch_${ludoId}_lounge`,
        mandaliId: ludoId,
        senderId: "p_sai_kittu",
        senderName: "Sai Krishna (Kittu)",
        senderAvatar: pickAvatarForName("Sai Krishna (Kittu)"),
        senderRole: "LEADER",
        content: "Haha Rahul, calculated risk! Never leave a lonely token 6 spaces behind an open pawn! Come to squad-formation, party is created!",
        reactions: { "👑": ["p_rahul_d"] },
        replyToId: `msg_${ludoId}_c3`,
        timestamp: now - HOUR * 1 - 50 * 60 * 1000,
      },
      {
        messageId: `msg_${ludoId}_c5`,
        channelId: `ch_${ludoId}_lounge`,
        mandaliId: ludoId,
        senderId: "p_swathi_k",
        senderName: "Swathi K",
        senderAvatar: pickAvatarForName("Swathi K"),
        senderRole: "MEMBER",
        content: "Joining squad now! Let's play 4-player classic!",
        reactions: { "👏": ["p_sai_kittu"] },
        timestamp: now - 25 * 60 * 1000,
      },
    ];
    for (const msg of ludoChat) this.saveMessage(msg);

    // Parties
    this.saveParty({
      partyId: `party_${ludoId}_weekend`,
      mandaliId: ludoId,
      leaderId: "p_rajesh_ludo",
      leaderName: "Rajesh Maharajah",
      game: "ludo",
      modeId: "Classic 4P",
      title: "Hyderabad Weekend Ludo Cup",
      slots: 4,
      members: [
        {
          playerId: "p_rajesh_ludo",
          displayName: "Rajesh Maharajah",
          avatar: pickAvatarForName("Rajesh Maharajah"),
          isReady: true,
        },
        {
          playerId: "p_sai_kittu",
          displayName: "Sai Krishna (Kittu)",
          avatar: pickAvatarForName("Sai Krishna (Kittu)"),
          isReady: true,
        },
        {
          playerId: "p_ananya_s",
          displayName: "Ananya Sharma",
          avatar: pickAvatarForName("Ananya Sharma"),
          isReady: true,
        },
      ],
      status: "FORMING",
      createdAt: now - 35 * 60 * 1000,
    });

    this.saveParty({
      partyId: `party_${ludoId}_speed`,
      mandaliId: ludoId,
      leaderId: "p_rahul_d",
      leaderName: "Rahul Dravid Fan",
      game: "ludo",
      modeId: "Speedrun 2P",
      title: "Midnight 2P Quick Clash",
      slots: 2,
      members: [
        {
          playerId: "p_rahul_d",
          displayName: "Rahul Dravid Fan",
          avatar: pickAvatarForName("Rahul Dravid Fan"),
          isReady: true,
        },
        {
          playerId: "p_swathi_k",
          displayName: "Swathi K",
          avatar: pickAvatarForName("Swathi K"),
          isReady: true,
        },
      ],
      status: "IN_GAME",
      roomCode: "LUDO88",
      createdAt: now - HOUR * 1,
    });

    // Gnapakalu Memories
    this.saveMemory({
      memoryId: `mem_${ludoId}_sweep`,
      mandaliId: ludoId,
      type: "GAME_VICTORY",
      title: "Epic 4-Token House Sweep in 22 Turns",
      description: "Sai Krishna pulled off an impossible sub-25 turn victory after cutting 6 enemy tokens in 3 consecutive rolls.",
      game: "ludo",
      matchId: "ludo_match_4920",
      highlightStat: "22 Turns Speedrun Record",
      celebratedBy: ["p_rajesh_ludo", "p_ananya_s", "p_rahul_d", "p_kavitha_r", "p_swathi_k"],
      timestamp: now - DAY * 3,
    });

    this.saveMemory({
      memoryId: `mem_${ludoId}_milestone`,
      mandaliId: ludoId,
      type: "COMMUNITY_MILESTONE",
      title: "Mandali Crossed 25 Active Warriors",
      description: "Ludo Lounge Maharajas officially reached Level 4 with over 2,000 matches hosted in BHALYAM!",
      highlightStat: "2,000+ Completed Matches",
      celebratedBy: ["p_rajesh_ludo", "p_sai_kittu", "p_ananya_s", "p_kavitha_r"],
      timestamp: now - DAY * 12,
    });

    this.saveMemory({
      memoryId: `mem_${ludoId}_inception`,
      mandaliId: ludoId,
      type: "ANNIVERSARY",
      title: "Grand Foundation of the Mandali",
      description: "Ludo Lounge Maharajas established in BHALYAM with solemn oath to uphold fair-play and pure tactical dice gaming.",
      celebratedBy: ["p_rajesh_ludo", "p_sai_kittu"],
      timestamp: now - DAY * 30,
    });


    /* ══════════════════════════════════════════════════════════
       2. SEED: HAND CRICKET LEAGUE
       ══════════════════════════════════════════════════════════ */
    const hcId = "mandali_hc_warriors";
    const hcMembers: MandaliMember[] = [
      {
        memberId: `mem_${hcId}_1`,
        mandaliId: hcId,
        playerId: "p_vikram_hc",
        displayName: "Vikram Striker",
        avatar: pickAvatarForName("Vikram Striker"),
        role: "OWNER",
        state: "ACTIVE",
        joinedAt: now - DAY * 45,
        presence: "online",
        activeGame: "handcricket",
        contributionScore: 3400,
      },
      {
        memberId: `mem_${hcId}_2`,
        mandaliId: hcId,
        playerId: "p_rohit_6",
        displayName: "Rohit Sixer",
        avatar: pickAvatarForName("Rohit Sixer"),
        role: "LEADER",
        state: "ACTIVE",
        joinedAt: now - DAY * 40,
        presence: "online",
        contributionScore: 2750,
      },
      {
        memberId: `mem_${hcId}_3`,
        mandaliId: hcId,
        playerId: "p_amit_b",
        displayName: "Amit GalliBowler",
        avatar: pickAvatarForName("Amit GalliBowler"),
        role: "OFFICER",
        state: "ACTIVE",
        joinedAt: now - DAY * 32,
        presence: "in-game",
        activeGame: "handcricket",
        contributionScore: 1980,
      },
      {
        memberId: `mem_${hcId}_4`,
        mandaliId: hcId,
        playerId: "p_neha_y",
        displayName: "Neha Yorker",
        avatar: pickAvatarForName("Neha Yorker"),
        role: "MODERATOR",
        state: "ACTIVE",
        joinedAt: now - DAY * 24,
        presence: "online",
        contributionScore: 1650,
      },
      {
        memberId: `mem_${hcId}_5`,
        mandaliId: hcId,
        playerId: "p_suresh_r",
        displayName: "Suresh Raina Fan",
        avatar: pickAvatarForName("Suresh Raina Fan"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 14,
        presence: "offline",
        contributionScore: 1100,
      },
      {
        memberId: `mem_${hcId}_6`,
        mandaliId: hcId,
        playerId: "p_deepa_s",
        displayName: "Deepa Sundaram",
        avatar: pickAvatarForName("Deepa Sundaram"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 7,
        presence: "online",
        contributionScore: 890,
      },
    ];
    for (const mem of hcMembers) this.saveMember(mem);

    const hcChannels: MandaliChannel[] = [
      {
        channelId: `ch_${hcId}_announcements`,
        mandaliId: hcId,
        name: "announcements",
        type: "ANNOUNCEMENT",
        description: "Galli tournament brackets, Super Over rules, and leaderboard updates.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 0,
      },
      {
        channelId: `ch_${hcId}_lounge`,
        mandaliId: hcId,
        name: "lounge-chat",
        type: "TEXT",
        description: "Galli cricket banter, finger prediction mind games, and cheers.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 1,
      },
      {
        channelId: `ch_${hcId}_party_finding`,
        mandaliId: hcId,
        name: "squad-formation",
        type: "PARTY_FINDING",
        description: "Set up 1v1 duel matches and mini series.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 2,
      },
      {
        channelId: `ch_${hcId}_tactics`,
        mandaliId: hcId,
        name: "bowling-mind-games",
        type: "TEXT",
        description: "Psychological tactics to outsmart the batsman on the 6th delivery.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 3,
      },
    ];
    for (const ch of hcChannels) this.saveChannel(ch);

    this.saveMessage({
      messageId: `msg_${hcId}_a1`,
      channelId: `ch_${hcId}_announcements`,
      mandaliId: hcId,
      senderId: "p_vikram_hc",
      senderName: "Vikram Striker",
      senderAvatar: pickAvatarForName("Vikram Striker"),
      senderRole: "OWNER",
      content: "🏏 **Galli Super Over Championship is LIVE!** Rules: 6 balls per innings, numbers 1 through 6. Tied score goes to sudden-death ball. Post your scores in #lounge-chat!",
      reactions: { "🔥": ["p_vikram_hc", "p_rohit_6", "p_amit_b"], "👑": ["p_neha_y"] },
      pinned: true,
      timestamp: now - DAY * 1,
    });

    const hcChat: MandaliMessage[] = [
      {
        messageId: `msg_${hcId}_c1`,
        channelId: `ch_${hcId}_lounge`,
        mandaliId: hcId,
        senderId: "p_vikram_hc",
        senderName: "Vikram Striker",
        senderAvatar: pickAvatarForName("Vikram Striker"),
        senderRole: "OWNER",
        content: "Who wants a 1v1 death-over showdown? 3 overs, let's see who can defend under pressure! 🔥",
        reactions: { "🎯": ["p_rohit_6"] },
        timestamp: now - HOUR * 2,
      },
      {
        messageId: `msg_${hcId}_c2`,
        channelId: `ch_${hcId}_lounge`,
        mandaliId: hcId,
        senderId: "p_rohit_6",
        senderName: "Rohit Sixer",
        senderAvatar: pickAvatarForName("Rohit Sixer"),
        senderRole: "LEADER",
        content: "Challenge accepted Vikram bhai! You cannot read my finger numbers today, I changed my rhythm completely!",
        reactions: { "🔥": ["p_vikram_hc", "p_amit_b"] },
        replyToId: `msg_${hcId}_c1`,
        timestamp: now - HOUR * 1 - 40 * 60 * 1000,
      },
      {
        messageId: `msg_${hcId}_c3`,
        channelId: `ch_${hcId}_lounge`,
        mandaliId: hcId,
        senderId: "p_neha_y",
        senderName: "Neha Yorker",
        senderAvatar: pickAvatarForName("Neha Yorker"),
        senderRole: "MODERATOR",
        content: "Streaming this duel in voice lounge! Amit, who are you betting on?",
        reactions: { "❤️": ["p_deepa_s"] },
        timestamp: now - HOUR * 1 - 10 * 60 * 1000,
      },
      {
        messageId: `msg_${hcId}_c4`,
        channelId: `ch_${hcId}_lounge`,
        mandaliId: hcId,
        senderId: "p_deepa_s",
        senderName: "Deepa Sundaram",
        senderAvatar: pickAvatarForName("Deepa Sundaram"),
        senderRole: "MEMBER",
        content: "Vikram's consecutive boundary streak is crazy! 32 runs in 8 balls in his last match!",
        reactions: { "👏": ["p_vikram_hc", "p_neha_y"] },
        timestamp: now - 30 * 60 * 1000,
      },
    ];
    for (const msg of hcChat) this.saveMessage(msg);

    this.saveParty({
      partyId: `party_${hcId}_duel`,
      mandaliId: hcId,
      leaderId: "p_vikram_hc",
      leaderName: "Vikram Striker",
      game: "handcricket",
      modeId: "Super Over 1v1",
      title: "Death Overs 1v1 Showdown",
      slots: 2,
      members: [
        {
          playerId: "p_vikram_hc",
          displayName: "Vikram Striker",
          avatar: pickAvatarForName("Vikram Striker"),
          isReady: true,
        },
      ],
      status: "FORMING",
      createdAt: now - 20 * 60 * 1000,
    });

    this.saveParty({
      partyId: `party_${hcId}_derby`,
      mandaliId: hcId,
      leaderId: "p_rohit_6",
      leaderName: "Rohit Sixer",
      game: "handcricket",
      modeId: "Classic 3 Overs",
      title: "Galli Champions Super Over",
      slots: 2,
      members: [
        {
          playerId: "p_rohit_6",
          displayName: "Rohit Sixer",
          avatar: pickAvatarForName("Rohit Sixer"),
          isReady: true,
        },
        {
          playerId: "p_amit_b",
          displayName: "Amit GalliBowler",
          avatar: pickAvatarForName("Amit GalliBowler"),
          isReady: true,
        },
      ],
      status: "IN_GAME",
      roomCode: "CRIC77",
      createdAt: now - 50 * 60 * 1000,
    });

    this.saveMemory({
      memoryId: `mem_${hcId}_six`,
      mandaliId: hcId,
      type: "GAME_VICTORY",
      title: "Super-Over Last Ball Six Miracle",
      description: "Vikram hit a 6 on the final ball needing 5 runs to win against Amit's pinpoint yorker line!",
      game: "handcricket",
      highlightStat: "24 Runs in 6 Balls",
      celebratedBy: ["p_vikram_hc", "p_rohit_6", "p_neha_y", "p_deepa_s"],
      timestamp: now - DAY * 2,
    });

    this.saveMemory({
      memoryId: `mem_${hcId}_lvl6`,
      mandaliId: hcId,
      type: "COMMUNITY_MILESTONE",
      title: "Mandali Reached Level 6 Championship Tier",
      description: "Street & Galli Hand Cricket League surpassed 6,000 community XP, unlocking custom animated emblems.",
      highlightStat: "Level 6 Unlocked",
      celebratedBy: ["p_vikram_hc", "p_rohit_6", "p_amit_b", "p_neha_y", "p_suresh_r"],
      timestamp: now - DAY * 10,
    });


    /* ══════════════════════════════════════════════════════════
       3. SEED: CLASSIC RUMMY ROYALS
       ══════════════════════════════════════════════════════════ */
    const rummyId = "mandali_rummy_royals";
    const rummyMembers: MandaliMember[] = [
      {
        memberId: `mem_${rummyId}_1`,
        mandaliId: rummyId,
        playerId: "p_aditi_rummy",
        displayName: "Aditi Queen",
        avatar: pickAvatarForName("Aditi Queen"),
        role: "OWNER",
        state: "ACTIVE",
        joinedAt: now - DAY * 25,
        presence: "online",
        activeGame: "rummy",
        contributionScore: 3100,
      },
      {
        memberId: `mem_${rummyId}_2`,
        mandaliId: rummyId,
        playerId: "p_farhan_k",
        displayName: "Farhan Ace",
        avatar: pickAvatarForName("Farhan Ace"),
        role: "LEADER",
        state: "ACTIVE",
        joinedAt: now - DAY * 22,
        presence: "online",
        contributionScore: 2450,
      },
      {
        memberId: `mem_${rummyId}_3`,
        mandaliId: rummyId,
        playerId: "p_pooja_d",
        displayName: "Pooja Deshmukh",
        avatar: pickAvatarForName("Pooja Deshmukh"),
        role: "OFFICER",
        state: "ACTIVE",
        joinedAt: now - DAY * 18,
        presence: "in-game",
        activeGame: "rummy",
        contributionScore: 2100,
      },
      {
        memberId: `mem_${rummyId}_4`,
        mandaliId: rummyId,
        playerId: "p_karthik_j",
        displayName: "Karthik Joker",
        avatar: pickAvatarForName("Karthik Joker"),
        role: "MODERATOR",
        state: "ACTIVE",
        joinedAt: now - DAY * 12,
        presence: "online",
        contributionScore: 1540,
      },
      {
        memberId: `mem_${rummyId}_5`,
        mandaliId: rummyId,
        playerId: "p_ramesh_m",
        displayName: "Ramesh Melder",
        avatar: pickAvatarForName("Ramesh Melder"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 6,
        presence: "idle",
        contributionScore: 920,
      },
    ];
    for (const mem of rummyMembers) this.saveMember(mem);

    const rummyChannels: MandaliChannel[] = [
      {
        channelId: `ch_${rummyId}_announcements`,
        mandaliId: rummyId,
        name: "announcements",
        type: "ANNOUNCEMENT",
        description: "Pool Rummy tournaments, pure show guidelines, and penalty scoring updates.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 0,
      },
      {
        channelId: `ch_${rummyId}_lounge`,
        mandaliId: rummyId,
        name: "lounge-chat",
        type: "TEXT",
        description: "Card strategy banter, declaration analysis, and high-roller discussions.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 1,
      },
      {
        channelId: `ch_${rummyId}_party_finding`,
        mandaliId: rummyId,
        name: "squad-formation",
        type: "PARTY_FINDING",
        description: "Assemble 2-to-6 player tables for Points and Pool Rummy.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 2,
      },
    ];
    for (const ch of rummyChannels) this.saveChannel(ch);

    this.saveMessage({
      messageId: `msg_${rummyId}_a1`,
      channelId: `ch_${rummyId}_announcements`,
      mandaliId: rummyId,
      senderId: "p_aditi_rummy",
      senderName: "Aditi Queen",
      senderAvatar: pickAvatarForName("Aditi Queen"),
      senderRole: "OWNER",
      content: "🃏 **Welcome to Classic Rummy Royals.** Reminder: A valid declaration strictly requires at least ONE Pure Sequence without a wildcard Joker. Practice disciplined initial drops if your hand is unbound!",
      reactions: { "👑": ["p_aditi_rummy", "p_farhan_k"], "🔥": ["p_pooja_d"] },
      pinned: true,
      timestamp: now - DAY * 5,
    });

    const rummyChat: MandaliMessage[] = [
      {
        messageId: `msg_${rummyId}_c1`,
        channelId: `ch_${rummyId}_lounge`,
        mandaliId: rummyId,
        senderId: "p_farhan_k",
        senderName: "Farhan Ace",
        senderAvatar: pickAvatarForName("Farhan Ace"),
        senderRole: "LEADER",
        content: "Setting up a 6-player 101 Pool Rummy table in squad-formation. Who is ready for some serious card play?",
        reactions: { "🎯": ["p_pooja_d", "p_karthik_j"] },
        timestamp: now - HOUR * 2,
      },
      {
        messageId: `msg_${rummyId}_c2`,
        channelId: `ch_${rummyId}_lounge`,
        mandaliId: rummyId,
        senderId: "p_aditi_rummy",
        senderName: "Aditi Queen",
        senderAvatar: pickAvatarForName("Aditi Queen"),
        senderRole: "OWNER",
        content: "I'll join. Please keep turn timers strict at 30s so the tempo stays crisp.",
        reactions: { "👏": ["p_farhan_k"] },
        replyToId: `msg_${rummyId}_c1`,
        timestamp: now - HOUR * 1 - 30 * 60 * 1000,
      },
      {
        messageId: `msg_${rummyId}_c3`,
        channelId: `ch_${rummyId}_lounge`,
        mandaliId: rummyId,
        senderId: "p_karthik_j",
        senderName: "Karthik Joker",
        senderAvatar: pickAvatarForName("Karthik Joker"),
        senderRole: "MODERATOR",
        content: "Joined! 4 slots filled now, 2 more open for anyone looking to test their card reading skills!",
        reactions: { "🔥": ["p_aditi_rummy"] },
        timestamp: now - 45 * 60 * 1000,
      },
    ];
    for (const msg of rummyChat) this.saveMessage(msg);

    this.saveParty({
      partyId: `party_${rummyId}_pool`,
      mandaliId: rummyId,
      leaderId: "p_aditi_rummy",
      leaderName: "Aditi Queen",
      game: "rummy",
      modeId: "101 Pool",
      title: "High-Roller 101 Pool Rummy",
      slots: 6,
      members: [
        {
          playerId: "p_aditi_rummy",
          displayName: "Aditi Queen",
          avatar: pickAvatarForName("Aditi Queen"),
          isReady: true,
        },
        {
          playerId: "p_farhan_k",
          displayName: "Farhan Ace",
          avatar: pickAvatarForName("Farhan Ace"),
          isReady: true,
        },
        {
          playerId: "p_pooja_d",
          displayName: "Pooja Deshmukh",
          avatar: pickAvatarForName("Pooja Deshmukh"),
          isReady: true,
        },
        {
          playerId: "p_karthik_j",
          displayName: "Karthik Joker",
          avatar: pickAvatarForName("Karthik Joker"),
          isReady: true,
        },
      ],
      status: "FORMING",
      createdAt: now - 50 * 60 * 1000,
    });

    this.saveMemory({
      memoryId: `mem_${rummyId}_zero`,
      mandaliId: rummyId,
      type: "GAME_VICTORY",
      title: "Zero-Point Pure Show on Turn 3",
      description: "Aditi declared with two pure sequences and a royal set on turn 3 without picking a single discard card.",
      game: "rummy",
      highlightStat: "0 Penalty Points Show",
      celebratedBy: ["p_aditi_rummy", "p_farhan_k", "p_pooja_d"],
      timestamp: now - DAY * 4,
    });


    /* ══════════════════════════════════════════════════════════
       4. SEED: PARAMAPADA SOPANAM (SNAKES & LADDERS)
       ══════════════════════════════════════════════════════════ */
    const snlId = "mandali_snl_explorers";
    const snlMembers: MandaliMember[] = [
      {
        memberId: `mem_${snlId}_1`,
        mandaliId: snlId,
        playerId: "p_venkat_v",
        displayName: "Venkatesh Vaikuntam",
        avatar: pickAvatarForName("Venkatesh Vaikuntam"),
        role: "OWNER",
        state: "ACTIVE",
        joinedAt: now - DAY * 18,
        presence: "online",
        activeGame: "snl",
        contributionScore: 2200,
      },
      {
        memberId: `mem_${snlId}_2`,
        mandaliId: snlId,
        playerId: "p_meera_d",
        displayName: "Meera DiceMaster",
        avatar: pickAvatarForName("Meera DiceMaster"),
        role: "LEADER",
        state: "ACTIVE",
        joinedAt: now - DAY * 15,
        presence: "online",
        contributionScore: 1850,
      },
      {
        memberId: `mem_${snlId}_3`,
        mandaliId: snlId,
        playerId: "p_arjun_l",
        displayName: "Arjun LadderClimber",
        avatar: pickAvatarForName("Arjun LadderClimber"),
        role: "OFFICER",
        state: "ACTIVE",
        joinedAt: now - DAY * 10,
        presence: "idle",
        contributionScore: 1300,
      },
      {
        memberId: `mem_${snlId}_4`,
        mandaliId: snlId,
        playerId: "p_divya_s",
        displayName: "Divya SnakeBitten",
        avatar: pickAvatarForName("Divya SnakeBitten"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 6,
        presence: "online",
        contributionScore: 880,
      },
    ];
    for (const mem of snlMembers) this.saveMember(mem);

    const snlChannels: MandaliChannel[] = [
      {
        channelId: `ch_${snlId}_announcements`,
        mandaliId: snlId,
        name: "announcements",
        type: "ANNOUNCEMENT",
        description: "Traditional board gaming lore and weekend Paramapada meetups.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 0,
      },
      {
        channelId: `ch_${snlId}_lounge`,
        mandaliId: snlId,
        name: "lounge-chat",
        type: "TEXT",
        description: "Shared stories, laughter, and lamentations over 99-tile snake drops.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 1,
      },
      {
        channelId: `ch_${snlId}_party_finding`,
        mandaliId: snlId,
        name: "squad-formation",
        type: "PARTY_FINDING",
        description: "Find casual 4-player Snakes and Ladders rooms.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 2,
      },
    ];
    for (const ch of snlChannels) this.saveChannel(ch);

    this.saveMessage({
      messageId: `msg_${snlId}_a1`,
      channelId: `ch_${snlId}_announcements`,
      mandaliId: snlId,
      senderId: "p_venkat_v",
      senderName: "Venkatesh Vaikuntam",
      senderAvatar: pickAvatarForName("Venkatesh Vaikuntam"),
      senderRole: "OWNER",
      content: "🐍 **Welcome to Vaikuntapali Club!** In ancient times, Paramapada Sopanam reminded us that life is full of steep ladders and humbling snakes. Enjoy every turn with good grace and friendship!",
      reactions: { "👑": ["p_venkat_v"], "❤️": ["p_meera_d", "p_arjun_l"] },
      pinned: true,
      timestamp: now - DAY * 3,
    });

    this.saveMessage({
      messageId: `msg_${snlId}_c1`,
      channelId: `ch_${snlId}_lounge`,
      mandaliId: snlId,
      senderId: "p_meera_d",
      senderName: "Meera DiceMaster",
      senderAvatar: pickAvatarForName("Meera DiceMaster"),
      senderRole: "LEADER",
      content: "Who is up for a cozy 4-player game this evening? Let's see if anyone can beat the big snake on tile 98! 😂",
      reactions: { "🔥": ["p_divya_s"] },
      timestamp: now - HOUR * 1,
    });

    this.saveParty({
      partyId: `party_${snlId}_classic`,
      mandaliId: snlId,
      leaderId: "p_venkat_v",
      leaderName: "Venkatesh Vaikuntam",
      game: "snl",
      modeId: "Traditional 100",
      title: "Paramapada Sunday Evening 4P",
      slots: 4,
      members: [
        {
          playerId: "p_venkat_v",
          displayName: "Venkatesh Vaikuntam",
          avatar: pickAvatarForName("Venkatesh Vaikuntam"),
          isReady: true,
        },
        {
          playerId: "p_meera_d",
          displayName: "Meera DiceMaster",
          avatar: pickAvatarForName("Meera DiceMaster"),
          isReady: true,
        },
      ],
      status: "FORMING",
      createdAt: now - 40 * 60 * 1000,
    });

    this.saveMemory({
      memoryId: `mem_${snlId}_miracle`,
      mandaliId: snlId,
      type: "GAME_VICTORY",
      title: "Miraculous Ladder Ascent from Tile 12 to 98",
      description: "Meera rolled three consecutive sixes and climbed twin ladders to leap from last place straight to victory in 2 turns!",
      game: "snl",
      highlightStat: "Tile 12 to 98 Leap",
      celebratedBy: ["p_venkat_v", "p_meera_d", "p_arjun_l"],
      timestamp: now - DAY * 5,
    });


    /* ══════════════════════════════════════════════════════════
       5. SEED: WILD DRAW-4 BLITZ GUILD (UNO)
       ══════════════════════════════════════════════════════════ */
    const unoId = "mandali_uno_champs";
    const unoMembers: MandaliMember[] = [
      {
        memberId: `mem_${unoId}_1`,
        mandaliId: unoId,
        playerId: "p_sneha_w",
        displayName: "Sneha WildCard",
        avatar: pickAvatarForName("Sneha WildCard"),
        role: "OWNER",
        state: "ACTIVE",
        joinedAt: now - DAY * 22,
        presence: "online",
        activeGame: "uno",
        contributionScore: 2950,
      },
      {
        memberId: `mem_${unoId}_2`,
        mandaliId: unoId,
        playerId: "p_varun_d",
        displayName: "Varun DrawFour",
        avatar: pickAvatarForName("Varun DrawFour"),
        role: "LEADER",
        state: "ACTIVE",
        joinedAt: now - DAY * 20,
        presence: "online",
        contributionScore: 2300,
      },
      {
        memberId: `mem_${unoId}_3`,
        mandaliId: unoId,
        playerId: "p_priyanka_r",
        displayName: "Priyanka Reverse",
        avatar: pickAvatarForName("Priyanka Reverse"),
        role: "OFFICER",
        state: "ACTIVE",
        joinedAt: now - DAY * 14,
        presence: "in-game",
        activeGame: "uno",
        contributionScore: 1720,
      },
      {
        memberId: `mem_${unoId}_4`,
        mandaliId: unoId,
        playerId: "p_manas_s",
        displayName: "Manas SkipKing",
        avatar: pickAvatarForName("Manas SkipKing"),
        role: "MEMBER",
        state: "ACTIVE",
        joinedAt: now - DAY * 9,
        presence: "online",
        contributionScore: 1250,
      },
    ];
    for (const mem of unoMembers) this.saveMember(mem);

    const unoChannels: MandaliChannel[] = [
      {
        channelId: `ch_${unoId}_announcements`,
        mandaliId: unoId,
        name: "announcements",
        type: "ANNOUNCEMENT",
        description: "UNO blitz schedules, special house rules, and weekly MVP spotlights.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 0,
      },
      {
        channelId: `ch_${unoId}_lounge`,
        mandaliId: unoId,
        name: "lounge-chat",
        type: "TEXT",
        description: "UNO chaos chatter, +4 vengeance, and colour swap strategies.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 1,
      },
      {
        channelId: `ch_${unoId}_party_finding`,
        mandaliId: unoId,
        name: "squad-formation",
        type: "PARTY_FINDING",
        description: "Quick 4-player UNO rooms.",
        slowModeSeconds: 0,
        isArchived: false,
        position: 2,
      },
    ];
    for (const ch of unoChannels) this.saveChannel(ch);

    this.saveMessage({
      messageId: `msg_${unoId}_a1`,
      channelId: `ch_${unoId}_announcements`,
      mandaliId: unoId,
      senderId: "p_sneha_w",
      senderName: "Sneha WildCard",
      senderAvatar: pickAvatarForName("Sneha WildCard"),
      senderRole: "OWNER",
      content: "🔥 **Welcome to Wild Draw-4 Blitz Guild!** No mercy on +4 stacks. If you hold one card, remember to shout UNO before the next turn or draw 2 penalty cards!",
      reactions: { "🔥": ["p_sneha_w", "p_varun_d"], "👑": ["p_priyanka_r"] },
      pinned: true,
      timestamp: now - DAY * 2,
    });

    this.saveMessage({
      messageId: `msg_${unoId}_c1`,
      channelId: `ch_${unoId}_lounge`,
      mandaliId: unoId,
      senderId: "p_varun_d",
      senderName: "Varun DrawFour",
      senderAvatar: pickAvatarForName("Varun DrawFour"),
      senderRole: "LEADER",
      content: "Party created in squad-formation! Need 1 more to launch a 4-player blitz. Who is ready? 💥",
      reactions: { "🎯": ["p_sneha_w", "p_manas_s"] },
      timestamp: now - 35 * 60 * 1000,
    });

    this.saveParty({
      partyId: `party_${unoId}_mayhem`,
      mandaliId: unoId,
      leaderId: "p_sneha_w",
      leaderName: "Sneha WildCard",
      game: "uno",
      modeId: "Chaos Blitz 4P",
      title: "Draw 4 Stacking Mayhem",
      slots: 4,
      members: [
        {
          playerId: "p_sneha_w",
          displayName: "Sneha WildCard",
          avatar: pickAvatarForName("Sneha WildCard"),
          isReady: true,
        },
        {
          playerId: "p_varun_d",
          displayName: "Varun DrawFour",
          avatar: pickAvatarForName("Varun DrawFour"),
          isReady: true,
        },
        {
          playerId: "p_manas_s",
          displayName: "Manas SkipKing",
          avatar: pickAvatarForName("Manas SkipKing"),
          isReady: true,
        },
      ],
      status: "FORMING",
      createdAt: now - 30 * 60 * 1000,
    });

    this.saveMemory({
      memoryId: `mem_${unoId}_chain`,
      mandaliId: unoId,
      type: "GAME_VICTORY",
      title: "+16 Card Chain Reaction Survival",
      description: "Varun survived a four-way consecutive +4 card stack and laid down a reverse card to clinch the round.",
      game: "uno",
      highlightStat: "+16 Card Stack Miracle",
      celebratedBy: ["p_sneha_w", "p_varun_d", "p_priyanka_r"],
      timestamp: now - DAY * 1,
    });
  }
}

