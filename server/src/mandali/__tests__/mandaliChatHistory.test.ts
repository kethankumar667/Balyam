import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createMandaliRouter } from "../MandaliController.js";

/**
 * Chat history over real HTTP.
 *
 * The bug this pins: the messages route replied `{ messages }` with no
 * `success` field while the client only applied a reply that had one, so
 * after any page refresh the history was fetched and thrown away and only
 * live messages ever appeared. A browser refresh is exactly "call this route
 * again", so this test does that.
 */

const MANDALI = "mandali_ludo_kings";
const MEMBER = "p_sai_kittu";
const OWNER = "p_rajesh_ludo";

let server: Server;
let baseUrl: string;
let channelId: string;
let currentPlayer: string | null = MEMBER;

beforeAll(async () => {
  const repository = new MandaliRepository();
  const service = new MandaliService(repository);
  channelId = (await service.getChannels(MANDALI)).find((c) => c.type === "TEXT")!.channelId;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (currentPlayer) (req as unknown as { player: unknown }).player = { playerId: currentPlayer, kind: "member" };
    next();
  });
  app.use("/api/mandali", createMandaliRouter(service));

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const url = () => `${baseUrl}/api/mandali/${MANDALI}/channels/${channelId}/messages`;

describe("Mandali chat history from Supabase (production)", () => {
  const row = (id: string, sequence: number, sender: string, content: string) => ({
    message_id: id, mandali_id: "m_prod", channel_id: "c_prod", sequence, sender_identity_id: sender,
    sender_role: "MEMBER", kind: "TEXT", content, reply_to_id: null, pinned: false, deleted_at: null,
    created_at: `2026-09-24T10:00:0${sequence}Z`,
  });

  it("returns stored messages oldest-first with the sender's name, from the newest-first query", async () => {
    const { MandaliRepository: Repo } = await import("../MandaliRepository.js");
    const selects: string[] = [];
    const client = {
      select: async (table: string, query: string) => {
        selects.push(`${table}?${query}`);
        if (table === "mandali_messages") {
          // What Postgres returns for `order=sequence.desc`: newest first.
          return [row("m3", 3, "acct_b", "hi from B"), row("m2", 2, "acct_a", "hi from A"), row("m1", 1, "acct_a", "first")];
        }
        return [
          { mandali_id: "m_prod", identity_id: "acct_a", display_name: "Account A", avatar: "a1", role: "MEMBER", state: "ACTIVE", joined_at: "2026-01-01T00:00:00Z" },
          { mandali_id: "m_prod", identity_id: "acct_b", display_name: "Account B", avatar: "a2", role: "MEMBER", state: "ACTIVE", joined_at: "2026-01-01T00:00:00Z" },
        ];
      },
      rpc: async () => ({}),
    };
    const service = new MandaliService(new Repo(client as never));

    const messages = await service.getMessages("c_prod", 50);

    expect(messages.map((m) => m.content)).toEqual(["first", "hi from A", "hi from B"]);
    expect(messages.map((m) => m.senderName)).toEqual(["Account A", "Account A", "Account B"]);
    expect(selects[0]).toContain("channel_id=eq.c_prod");
    expect(selects[0]).toContain("order=sequence.desc");
  });

  it("does not show the text of a message that was deleted for everyone", async () => {
    const { MandaliRepository: Repo } = await import("../MandaliRepository.js");
    const deleted = { ...row("m1", 1, "acct_a", "old text"), deleted_at: "2026-09-24T11:00:00Z" };
    const client = {
      select: async (table: string) => (table === "mandali_messages" ? [deleted] : []),
      rpc: async () => ({}),
    };
    const service = new MandaliService(new Repo(client as never));

    const [message] = await service.getMessages("c_prod", 50);

    expect(message.content).toBe("");
  });
});

describe("Mandali chat history (what a page refresh reads)", () => {
  it("replies with success:true and the message list", async () => {
    currentPlayer = MEMBER;

    const res = await fetch(url());
    const body = (await res.json()) as { success?: boolean; messages?: unknown[] };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("returns a message that was sent earlier, oldest first, when the page is loaded again", async () => {
    currentPlayer = MEMBER;
    for (const content of ["hi from A", "hi from B"]) {
      const sent = await fetch(url(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, senderName: "Sai", senderAvatar: "a1" }),
      });
      expect(sent.status).toBe(201);
    }

    // "Refresh": a brand-new request, with nothing carried over from the send.
    const body = (await (await fetch(url())).json()) as { messages: Array<{ content: string; senderId: string }> };

    const texts = body.messages.map((m) => m.content);
    expect(texts).toContain("hi from A");
    expect(texts).toContain("hi from B");
    expect(texts.indexOf("hi from A")).toBeLessThan(texts.indexOf("hi from B"));
    expect(body.messages.find((m) => m.content === "hi from A")?.senderId).toBe(MEMBER);
  });

  it("shows the same history to the other member", async () => {
    currentPlayer = OWNER;

    const body = (await (await fetch(url())).json()) as { messages: Array<{ content: string }> };

    expect(body.messages.map((m) => m.content)).toContain("hi from A");
  });

  it("keeps chat private to active members", async () => {
    currentPlayer = "p_stranger";

    const res = await fetch(url());

    expect(res.status).toBe(403);
  });
});
