import { describe, it, expect, afterEach } from "vitest";
import { useEffect } from "react";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useStructuredData } from "../useStructuredData";
import { useMetadata } from "../useMetadata";
import { getStructuredDataForRoute } from "../structuredData";
import { PUBLIC_ROUTES_METADATA } from "../metadata";

afterEach(() => {
  cleanup();
  document.getElementById("bhalyam-jsonld")?.remove();
});

/**
 * Regression coverage for the "audit the working tree" pass: both hooks were
 * added in the same diff and wired into App.tsx with no per-route props, but
 * only useStructuredData had a bug in that no-args path — see each test for
 * the specific failure mode it guards against.
 */

function StructuredDataHarness() {
  useStructuredData();
  return null;
}

describe("useStructuredData() called with no arguments (App.tsx's actual call site)", () => {
  it("resolves the current route's schema instead of always writing an empty {} payload", () => {
    render(
      <MemoryRouter initialEntries={["/games"]}>
        <StructuredDataHarness />
      </MemoryRouter>,
    );

    const script = document.getElementById("bhalyam-jsonld");
    expect(script).not.toBeNull();
    const parsed = JSON.parse(script!.textContent ?? "null");

    // Would previously be `{}` — the bug made `data !== undefined` true for
    // the default `{}` options, so getStructuredDataForRoute() was skipped.
    expect(parsed).not.toEqual({});

    const routeSchemas = getStructuredDataForRoute("/games");
    const expectedTypes = routeSchemas.map((s) => (s as { "@type": string })["@type"]).sort();
    const graph = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
    const actualTypes = graph.map((s: { "@type": string }) => s["@type"]).sort();
    expect(actualTypes).toEqual(expectedTypes);
  });
});

function MetadataHarness({ onReady }: { onReady: (navigate: (path: string) => void) => void }) {
  useMetadata();
  const navigate = useNavigate();
  useEffect(() => {
    onReady(navigate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("useMetadata() on a route with no PUBLIC_ROUTES_METADATA entry", () => {
  it("falls back to the home route's tags instead of leaving the previous route's title/meta stale", () => {
    let navigate: (path: string) => void = () => {};

    render(
      <MemoryRouter initialEntries={["/games"]}>
        <MetadataHarness onReady={(nav) => { navigate = nav; }} />
      </MemoryRouter>,
    );

    expect(document.title).toBe(PUBLIC_ROUTES_METADATA["/games"].title);

    // /room/:code has no catalog entry (rooms are private, per-session).
    act(() => {
      navigate("/room/ABC123");
    });

    // Bug: `if (!meta) return;` left document.title (and every OG/Twitter
    // tag) exactly as /games had set them, forever, for any uncatalogued
    // route reached from a catalogued one.
    expect(document.title).not.toBe(PUBLIC_ROUTES_METADATA["/games"].title);
    expect(document.title).toBe(PUBLIC_ROUTES_METADATA["/"].title);

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toBe(PUBLIC_ROUTES_METADATA["/"].canonical);
  });
});
