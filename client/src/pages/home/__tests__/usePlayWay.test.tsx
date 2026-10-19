import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { usePlayWay } from "../usePlayWay";
import { PLAY_WAY_STORAGE_KEY } from "../playWay";

function wrapperAt(url: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
  };
}

/** Reads the hook and the router's current query string in one render. */
function useProbe() {
  const [way, choose] = usePlayWay();
  const { search } = useLocation();
  return { way, choose, search };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("usePlayWay", () => {
  it("starts with nothing chosen on a first visit", () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/") });
    expect(result.current.way).toBeNull();
  });

  it("restores the remembered choice when the URL has none", () => {
    window.localStorage.setItem(PLAY_WAY_STORAGE_KEY, "solo");
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/") });
    expect(result.current.way).toBe("solo");
  });

  it("lets a link parameter beat the remembered choice, without overwriting it", () => {
    window.localStorage.setItem(PLAY_WAY_STORAGE_KEY, "solo");
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/?way=friends") });
    expect(result.current.way).toBe("friends");
    expect(window.localStorage.getItem(PLAY_WAY_STORAGE_KEY)).toBe("solo");
  });

  it("ignores an unknown parameter value", () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/?way=nonsense") });
    expect(result.current.way).toBeNull();
  });

  it("writes a deliberate choice to state, the URL and storage", () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/") });

    act(() => result.current.choose("friends"));

    expect(result.current.way).toBe("friends");
    expect(result.current.search).toBe("?way=friends");
    expect(window.localStorage.getItem(PLAY_WAY_STORAGE_KEY)).toBe("friends");
  });

  it("keeps unrelated query parameters when it sets the way", () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/?ref=invite") });

    act(() => result.current.choose("solo"));

    expect(new URLSearchParams(result.current.search).get("ref")).toBe("invite");
    expect(new URLSearchParams(result.current.search).get("way")).toBe("solo");
  });

  it("clears state, URL and storage together", () => {
    window.localStorage.setItem(PLAY_WAY_STORAGE_KEY, "solo");
    const { result } = renderHook(useProbe, { wrapper: wrapperAt("/?way=solo") });

    act(() => result.current.choose(null));

    expect(result.current.way).toBeNull();
    expect(result.current.search).toBe("");
    expect(window.localStorage.getItem(PLAY_WAY_STORAGE_KEY)).toBeNull();
  });
});
