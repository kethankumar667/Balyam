import { Router } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";

/**
 * Community reports & support tickets.
 *
 * ── What this replaces ─────────────────────────────────────────────────
 * `CommunityRulesPage.tsx` and `SupportFaqsPage.tsx` used to generate a
 * ticket id (`BHAL-REP-######`) entirely client-side and show it to the
 * player as confirmation — nothing was ever sent anywhere. A player
 * reporting real harassment, or asking for real help, was told "our team
 * will investigate" when no team could, because there was nothing for them
 * to look at. These routes make that true: a submission is persisted
 * server-side and the ticket id returned is the id of a real record.
 *
 * There is still no human moderation queue or admin UI reading this store —
 * that is a separate, larger feature. What changed is narrower and load-
 * bearing: the promise on the confirmation screen is no longer false.
 *
 * In-memory only, matching how the rest of this dev-stage server holds
 * non-critical state — swap for a real table alongside the other
 * `ProgressionRepository`-style persistence work if this needs to survive
 * a restart or be reviewable by a moderator later.
 */

export interface CommunityReportRecord {
  id: string;
  ticket: string;
  category: string;
  targetName: string | null;
  roomCode: string | null;
  details: string;
  reporterId: string | null;
  createdAt: number;
}

export interface SupportTicketRecord {
  id: string;
  ticket: string;
  category: string;
  email: string;
  roomCode: string | null;
  message: string;
  submitterId: string | null;
  createdAt: number;
}

const communityReports: CommunityReportRecord[] = [];
const supportTickets: SupportTicketRecord[] = [];

/** Exposed for tests — not a public read API (these can carry PII). */
export function _allCommunityReports(): readonly CommunityReportRecord[] {
  return communityReports;
}
export function _allSupportTickets(): readonly SupportTicketRecord[] {
  return supportTickets;
}

function genTicket(prefix: "REP" | "TKT"): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `BHAL-${prefix}-${n}`;
}

function trimmedOrNull(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, max) : null;
}

export const supportRouter = Router();

/** POST /api/support/reports — Community Rules "Report an Issue" form. */
supportRouter.post("/reports", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const details = trimmedOrNull(body.details, 2000);
  if (!details) {
    res.status(400).json({ error: "Details are required" });
    return;
  }

  const record: CommunityReportRecord = {
    id: randomUUID(),
    ticket: genTicket("REP"),
    category: trimmedOrNull(body.category, 60) ?? "Other",
    targetName: trimmedOrNull(body.targetName, 60),
    roomCode: trimmedOrNull(body.roomCode, 12)?.toUpperCase() ?? null,
    details,
    reporterId: req.player?.playerId ?? null,
    createdAt: Date.now(),
  };
  communityReports.push(record);
  logger.info({ message: "Community report submitted", module: "support", playerId: record.reporterId ?? undefined, ticket: record.ticket, category: record.category });

  res.status(201).json({ ticket: record.ticket });
});

/** POST /api/support/tickets — Support & FAQs "Contact Support" form. */
supportRouter.post("/tickets", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = trimmedOrNull(body.email, 200);
  const message = trimmedOrNull(body.message, 2000);
  if (!email || !message) {
    res.status(400).json({ error: "Email and message are required" });
    return;
  }

  const record: SupportTicketRecord = {
    id: randomUUID(),
    ticket: genTicket("TKT"),
    category: trimmedOrNull(body.category, 60) ?? "Other",
    email,
    roomCode: trimmedOrNull(body.roomCode, 12)?.toUpperCase() ?? null,
    message,
    submitterId: req.player?.playerId ?? null,
    createdAt: Date.now(),
  };
  supportTickets.push(record);
  logger.info({ message: "Support ticket submitted", module: "support", playerId: record.submitterId ?? undefined, ticket: record.ticket, category: record.category });

  res.status(201).json({ ticket: record.ticket });
});
