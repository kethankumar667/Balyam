import { describe, it, expect, beforeEach } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { supportRouter, _allCommunityReports, _allSupportTickets, _allFeedbackSubmissions } from "../SupportController.js";

/**
 * `/reports` and `/tickets` accept fully anonymous submissions by design
 * (see this router's own header comment) — `/feedback` (Reviews & Testimonials
 * V1) is built to the same stance, so its test is written the same shape.
 */

let server: TestServer;

beforeEach(async () => {
  server = await startTestServer((app) => {
    app.use("/api/support", supportRouter);
  });
});

describe("POST /api/support/reports", () => {
  it("accepts an anonymous submission and returns a ticket id", async () => {
    const res = await server.request("/api/support/reports", {
      method: "POST",
      body: JSON.stringify({ details: "Someone was rude in chat." }),
    });
    expect(res.status).toBe(201);
    const body = res.body as { ticket: string };
    expect(body.ticket).toMatch(/^BHAL-REP-\d{6}$/);
    expect(_allCommunityReports().some((r) => r.ticket === body.ticket)).toBe(true);
  });

  it("400s when details are missing", async () => {
    const res = await server.request("/api/support/reports", { method: "POST", body: JSON.stringify({}) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/support/tickets", () => {
  it("accepts an anonymous submission and returns a ticket id", async () => {
    const res = await server.request("/api/support/tickets", {
      method: "POST",
      body: JSON.stringify({ email: "player@example.com", message: "I need help with my account." }),
    });
    expect(res.status).toBe(201);
    const body = res.body as { ticket: string };
    expect(body.ticket).toMatch(/^BHAL-TKT-\d{6}$/);
    expect(_allSupportTickets().some((t) => t.ticket === body.ticket)).toBe(true);
  });
});

describe("POST /api/support/feedback", () => {
  it("accepts an anonymous bug report", async () => {
    const res = await server.request("/api/support/feedback", {
      method: "POST",
      body: JSON.stringify({ category: "bug", message: "The dice animation flickers." }),
    });
    expect(res.status).toBe(201);
    const body = res.body as { id: string };
    expect(_allFeedbackSubmissions().some((f) => f.id === body.id)).toBe(true);
  });

  it("400s when the category is not bug/suggestion/other", async () => {
    const res = await server.request("/api/support/feedback", {
      method: "POST",
      body: JSON.stringify({ category: "praise", message: "Love the app!" }),
    });
    expect(res.status).toBe(400);
  });

  it("400s when the message is missing", async () => {
    const res = await server.request("/api/support/feedback", {
      method: "POST",
      body: JSON.stringify({ category: "suggestion" }),
    });
    expect(res.status).toBe(400);
  });

  it("429s once the per-IP rate limit is exhausted", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await server.request("/api/support/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "other", message: `Message ${i}` }),
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
