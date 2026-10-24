import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("groups real player destinations into Play, Community and Trust", () => {
    show();
    const navigation = screen.getByRole("navigation", { name: "Footer navigation" });
    for (const name of ["Play", "Community", "Trust"]) {
      expect(within(navigation).getByRole("heading", { name })).toBeInTheDocument();
    }
    const destinations = [
      ["Games catalog", "/games"], ["How to play", "/how-to-play"],
      ["My Records", "/myrecords"], ["Tournaments", "/tournaments"],
      ["Social Hub", "/social"], ["Our story", "/about#our-story"],
      ["Player testimonials", "/testimonials"], ["Write a review", "/reviews/write"],
      ["Contact us", "/contact"], ["Leave feedback", "/feedback"],
      ["Safety Center", "/safety"],
      ["Community rules", "/community-rules"], ["Support & FAQs", "/support"],
      ["Privacy notice", "/privacy"], ["Terms", "/terms"],
      ["Your data choices", "/settings/security"], ["Cookie preferences", "/settings/security"],
    ];
    for (const [name, href] of destinations) {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("gives each mobile navigation group a labelled disclosure and retains its links", () => {
    show();
    const trigger = screen.getByRole("button", { name: "Play" });
    const panel = document.getElementById(trigger.getAttribute("aria-controls")!);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveClass("hidden");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveClass("hidden");
    expect(within(panel!).getByRole("link", { name: "My Records" })).toHaveAttribute("href", "/myrecords");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
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
    expect(within(tools).getByRole("link", { name: "Design System", hidden: true })).toHaveAttribute("href", "/design-system");
    expect(within(tools).getByRole("link", { name: "Diagnostics console", hidden: true })).toHaveAttribute("href", "/diagnostics");
  });

  it("explicitly marks Dispatch unavailable without accepting or pretending to save an email", () => {
    show();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Join Dispatch" })).toBeDisabled();
    expect(screen.getByText("Signups aren't open yet.")).toBeInTheDocument();
    expect(screen.getByText(/not collecting email addresses/i)).toBeInTheDocument();
    expect(screen.queryByText(/You're in!|Welcome to the Veranda Dispatch|Latest transmission:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore games" })).toHaveAttribute("href", "/games");
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
    expect(screen.getByRole("region", { name: "System pulse" })).toBeInTheDocument();
    expect(screen.queryByText(/All systems operational|~24ms|India gateway|Zero client cheat vectors|low-latency/i)).not.toBeInTheDocument();
    for (const label of ["Fair play engine", "Instant access", "Player-first", "Room voice"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
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
