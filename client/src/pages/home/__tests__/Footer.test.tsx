import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import { capabilitiesFor, type Capabilities } from "@shared/permissions";
import type { LocaleId } from "../../../i18n/types";
import { Footer } from "../Footer";

const mocks = vi.hoisted(() => ({
  admin: false,
  locale: "en" as LocaleId,
}));
vi.mock("../../../store/authStore", async () => {
  const { capabilitiesFor } = await import("@shared/permissions");
  return { useAuthStore: (selector: (state: { capabilities: Capabilities }) => unknown) =>
    selector({ capabilities: capabilitiesFor(mocks.admin ? "super_admin" : "guest") }) };
});
vi.mock("../../../hooks/useTranslation", () => ({ useTranslation: () => ({ locale: mocks.locale }) }));
vi.mock("../../../components/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../../lib/socket", () => ({ getApiBaseUrl: () => "http://local-footer.test" }));

function show() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Footer /></MemoryRouter>);
}

beforeEach(() => {
  mocks.admin = false;
  mocks.locale = "en";
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline fixture")));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Nostalgia Network Hub footer", () => {
  it("opts out of flex shrinking at the footer's clipping boundary", () => {
    show();
    expect(screen.getByRole("contentinfo")).toHaveClass("shrink-0");
  });

  it("scopes its adaptive palette to the footer", () => {
    show();
    expect(screen.getByRole("contentinfo")).toHaveClass("bhalyam-footer");
  });

  it("groups real player destinations into Play, Community and Help & trust", () => {
    show();
    const groups = {
      Play: [["Games catalogue", "/games"], ["How to play", "/how-to-play"], ["My records", "/myrecords"]],
      Community: [
        ["Our story", "/about#our-story"], ["Player stories", "/testimonials"],
        ["Contact us", "/contact"], ["Leave feedback", "/feedback"],
      ],
      "Help & trust": [
        ["Safety centre", "/safety"], ["Community rules", "/community-rules"],
        ["Support & FAQs", "/support"], ["Privacy notice", "/privacy"],
      ],
    };
    for (const [title, links] of Object.entries(groups)) {
      const navigation = screen.getByRole("navigation", { name: `Footer ${title}` });
      expect(within(navigation).getByRole("heading", { name: title })).toBeInTheDocument();
      expect(within(navigation).getAllByRole("listitem")).toHaveLength(links.length);
      for (const [name, href] of links) {
        expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
      }
    }
  });

  it("keeps the navigation as plain lists, with no disclosure buttons or per-link cards", () => {
    show();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    for (const link of within(screen.getByRole("navigation", { name: "Footer Play" })).getAllByRole("link")) {
      expect(link.className).not.toMatch(/\bborder\b|rounded-(xl|2xl|3xl|full)/);
    }
  });

  it("keeps developer links out of the ordinary directory", () => {
    show();
    expect(screen.queryByRole("link", { name: "Design System" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnostics console" })).not.toBeInTheDocument();
    expect(screen.queryByText("Admin tools")).not.toBeInTheDocument();
  });

  it("preserves specialist destinations for accounts with the admin capability", () => {
    expect(capabilitiesFor("super_admin").accessAdminPanel).toBe(true);
    mocks.admin = true;
    show();
    const tools = screen.getByText("Admin tools").closest("details")!;
    // Staff tools live in their own strip, outside the player-facing footer landmark.
    expect(screen.getByRole("contentinfo")).not.toContainElement(tools);
    expect(screen.getByRole("contentinfo").nextElementSibling).toContainElement(tools);
    expect(within(tools).getByRole("link", { name: "Design System", hidden: true })).toHaveAttribute("href", "/design-system");
    expect(within(tools).getByRole("link", { name: "Diagnostics console", hidden: true })).toHaveAttribute("href", "/diagnostics");
  });

  it("closes with one Explore games call to action and shows no unavailable newsletter form", () => {
    show();
    expect(screen.getByRole("heading", { name: "Your next memory starts with a game." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore games/ })).toHaveAttribute("href", "/games");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/Dispatch|Signups aren't open|not collecting email/i)).not.toBeInTheDocument();
  });

  it("says Same games. Bigger memories. once", () => {
    show();
    expect(screen.getAllByText(/Bigger memories\./)).toHaveLength(1);
    expect(screen.queryByText(/Why BHALYAM feels different/i)).not.toBeInTheDocument();
  });

  it("keeps the decorative artwork out of the accessibility tree", () => {
    const { container } = show();
    for (const art of container.querySelectorAll("[data-footer-art]")) {
      expect(art.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(container.querySelectorAll("[data-footer-art]").length).toBeGreaterThan(0);
  });

  it("does not show the admin strip to an ordinary visitor", () => {
    show();
    expect(document.querySelector("[data-admin-strip]")).toBeNull();
  });

  it("shows the current year in the copyright line", () => {
    show();
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} BHALYAM`))).toBeInTheDocument();
  });

  it("uses the selected language rather than a hardcoded English chip", () => {
    mocks.locale = "te";
    show();
    const language = screen.getByRole("link", { name: "Language: Telugu. Open language settings" });
    expect(language).toHaveTextContent("తెలుగు");
    expect(language).toHaveAttribute("href", "/settings/preferences");
    expect(screen.queryByText("English (IN)")).not.toBeInTheDocument();
  });

  it("does not advertise fixed telemetry or impossible cheat/privacy guarantees", () => {
    show();
    // The System Pulse (a live /health latency readout) was removed: no panel, and no request.
    expect(screen.queryByRole("region", { name: "System pulse" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/All systems operational|~24ms|India gateway|Zero client cheat vectors|low-latency/i)).not.toBeInTheDocument();
    const principles = within(screen.getByRole("region", { name: "BHALYAM principles" }));
    for (const [label, claim] of [
      ["Fair play", "Server-checked moves"], ["Instant access", "Play in your browser"],
      ["Player-first", "No real-money gambling"], ["Room voice", "Optional in-room audio"],
    ]) {
      expect(principles.getByRole("heading", { name: label })).toBeInTheDocument();
      expect(principles.getByText(claim)).toBeInTheDocument();
    }
    expect(principles.queryAllByRole("link")).toHaveLength(0);
    // One shared container for all four, not four cards.
    const items = principles.getAllByRole("listitem");
    expect(new Set(items.map(item => item.parentElement)).size).toBe(1);
    expect(items[0].parentElement).toHaveClass("border", "rounded-2xl");
    for (const item of items) expect(item.className).not.toMatch(/\brounded/);
  });

  it("opens actual data/storage choices from the utility bar rather than appearance settings", () => {
    show();
    const legal = screen.getByRole("navigation", { name: "Footer legal" });
    expect(within(legal).getByRole("link", { name: "Cookie preferences" })).toHaveAttribute("href", "/settings/security");
  });

  it("offers named share and contact actions, not a generic Instagram homepage", () => {
    show();
    expect(screen.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Email support" })).toHaveAttribute("href", "mailto:hello@bhalyam.app");
    expect(document.querySelector('a[href="https://www.instagram.com/"]')).toBeNull();
  });

  it("hydrates safely before revealing a saved language or admin-only tools", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<StaticRouter location="/"><Footer /></StaticRouter>);
    document.body.appendChild(container);
    mocks.admin = true;
    mocks.locale = "te";
    const recoveries: unknown[] = [];
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Footer /></MemoryRouter>, {
          onRecoverableError: error => recoveries.push(error),
        });
      });
      expect(recoveries).toEqual([]);
      expect(errors.mock.calls.flat().join(" ")).not.toMatch(/hydration|did not match/i);
      expect(within(container).getByText("Admin tools")).toBeInTheDocument();
      expect(within(container).getByRole("link", { name: "Language: Telugu. Open language settings" })).toHaveTextContent("తెలుగు");
    } finally {
      act(() => root?.unmount());
      container.remove();
      errors.mockRestore();
    }
  });
});
