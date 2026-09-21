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
        tags: ["Competitive", "Ludo Masters", "Speedrun"],
        visibility: "PUBLIC",
        memberCount: 24,
        maxMembers: 50,
        level: 4,
        xp: 3200,
        ownerId: "p_rajesh_ludo",
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
        updatedAt: Date.now(),
      },
      {
        id: "mandali_hc_warriors",
        handle: "hand-cricket-champs",
        name: "Street & Galli Hand Cricket League",
        description: "Childhood finger-cricket nostalgia! High-voltage death overs, boundary blitzes, and galli cricket tournaments every weekend evening.",
        emblem: "bat_cyan",
        bannerGradient: "from-emerald-600 via-teal-600 to-cyan-700",
        language: "Hindi",
        region: "All India",
        tags: ["Social", "Hand Cricket", "Nostalgia"],
        visibility: "PUBLIC",
        memberCount: 38,
        maxMembers: 60,
        level: 6,
        xp: 5800,
        ownerId: "p_vikram_hc",
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
        updatedAt: Date.now(),
      },
      {
        id: "mandali_rummy_royals",
        handle: "rummy-royals",
        name: "Classic Rummy Royals",
        description: "Mastery over pure sequences, second sequences, and disciplined drops. Where 0 penalty points is the only acceptable declaration.",
        emblem: "card_purple",
        bannerGradient: "from-purple-600 via-indigo-600 to-slate-900",
        language: "English",
        region: "Global",
        tags: ["Strategy", "Rummy", "Pure Show"],
        visibility: "DISCOVERABLE",
        memberCount: 19,
        maxMembers: 40,
        level: 3,
        xp: 2400,
        ownerId: "p_aditi_rummy",
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
        updatedAt: Date.now(),
      },
    ];

    for (const m of defaultMandalis) {
      this.saveMandali(m);

      // Seed Founder Member
      this.saveMember({
        memberId: `mem_${m.id}_owner`,
        mandaliId: m.id,
        playerId: m.ownerId,
        displayName: m.id.includes("ludo") ? "Rajesh Maharajah" : m.id.includes("hc") ? "Vikram Striker" : "Aditi Queen",
        avatar: "avatar_1",
        role: "OWNER",
        state: "ACTIVE",
        joinedAt: m.createdAt,
        presence: "online",
        activeGame: m.id.includes("ludo") ? "ludo" : m.id.includes("hc") ? "handcricket" : "rummy",
        contributionScore: 1200,
      });

      // Seed Channels
      const channels: MandaliChannel[] = [
        {
          channelId: `ch_${m.id}_announcements`,
          mandaliId: m.id,
          name: "announcements",
          type: "ANNOUNCEMENT",
          description: "Important community announcements, tournament schedules and notices.",
          slowModeSeconds: 0,
          isArchived: false,
          position: 0,
        },
        {
          channelId: `ch_${m.id}_lounge`,
          mandaliId: m.id,
          name: "lounge-chat",
          type: "TEXT",
          description: "Casual conversation, friendly banter, and match recaps.",
          slowModeSeconds: 0,
          isArchived: false,
          position: 1,
        },
        {
          channelId: `ch_${m.id}_party_finding`,
          mandaliId: m.id,
          name: "squad-formation",
          type: "PARTY_FINDING",
          description: "Assemble squads, find co-op teammates, and launch match rooms.",
          slowModeSeconds: 0,
          isArchived: false,
          position: 2,
        },
      ];

      for (const ch of channels) {
        this.saveChannel(ch);
      }

      // Seed Initial Welcome Message
      this.saveMessage({
        messageId: `msg_${m.id}_welcome`,
        channelId: `ch_${m.id}_announcements`,
        mandaliId: m.id,
        senderId: m.ownerId,
        senderName: "Mandali Herald",
        senderAvatar: "avatar_crown",
        senderRole: "OWNER",
        content: `Namaste and welcome to **${m.name}**! Join our parties, coordinate match sessions, and honor our shared lounge memories.`,
        reactions: { "🔥": [m.ownerId], "👑": [m.ownerId] },
        pinned: true,
        timestamp: m.createdAt,
      });

      // Seed Gnapakalu Memory
      this.saveMemory({
        memoryId: `mem_${m.id}_inception`,
        mandaliId: m.id,
        type: "COMMUNITY_MILESTONE",
        title: "Foundation of the Mandali",
        description: `${m.name} was officially established in BHALYAM Lounge.`,
        celebratedBy: [m.ownerId],
        timestamp: m.createdAt,
      });
    }
  }
}
