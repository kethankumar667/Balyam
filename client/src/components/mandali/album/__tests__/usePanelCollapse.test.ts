import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { recordConsent } from "../../../../lib/privacy/consent";
import { usePanelCollapse } from "../usePanelCollapse";

const KEY = "bhalyam.mandali.layout";

describe("usePanelCollapse", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("starts with both panels open", () => {
    const { result } = renderHook(() => usePanelCollapse());
    expect(result.current.collapsed).toEqual({ left: false, right: false });
  });

  it("folds one side at a time and unfolds it again", () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => result.current.toggle("left"));
    expect(result.current.collapsed).toEqual({ left: true, right: false });

    act(() => result.current.toggle("right"));
    expect(result.current.collapsed).toEqual({ left: true, right: true });

    act(() => result.current.toggle("left"));
    expect(result.current.collapsed).toEqual({ left: false, right: true });
  });

  it("stays the way the person left it on the next visit", () => {
    recordConsent("granted");
    const first = renderHook(() => usePanelCollapse());
    act(() => first.result.current.toggle("right"));
    first.unmount();

    const second = renderHook(() => usePanelCollapse());
    expect(second.result.current.collapsed).toEqual({ left: false, right: true });
  });

  it("is kept only for the tab session after 'Only what's essential', never in localStorage", () => {
    recordConsent("essential-only");
    const { result } = renderHook(() => usePanelCollapse());
    act(() => result.current.toggle("left"));

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(KEY) ?? "{}")).toEqual({ left: true, right: false });
  });

  it("ignores a corrupted saved value instead of breaking the page", () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => usePanelCollapse());
    expect(result.current.collapsed).toEqual({ left: false, right: false });
  });
});
