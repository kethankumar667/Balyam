import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useLeaveWhenMandaliGone } from "../useLeaveWhenMandaliGone";
import { useMandaliStore } from "../../../store/mandaliStore";

/**
 * A member is reading a Mandali when its owner deletes it. Nothing about that
 * page is true any more, so they are taken back to the list rather than left
 * looking at an empty chat — and only then: not while the page is still loading,
 * and not when they simply move from one Mandali to another.
 */

let path = "";
function Probe({ children }: { children: ReactNode }) {
  path = useLocation().pathname;
  return <>{children}</>;
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={["/mandali/ludo-lounge"]}>
    <Probe>{children}</Probe>
  </MemoryRouter>
);

const open = (id: string) => useMandaliStore.setState({ activeMandali: { id } as never });
const close = () => useMandaliStore.setState({ activeMandali: null });

describe("useLeaveWhenMandaliGone", () => {
  beforeEach(() => close());
  afterEach(() => {
    cleanup();
    close();
  });

  it("stays put while the Mandali has not loaded yet", () => {
    renderHook(() => useLeaveWhenMandaliGone(), { wrapper });

    expect(path).toBe("/mandali/ludo-lounge");
  });

  it("stays put while the Mandali is open", () => {
    renderHook(() => useLeaveWhenMandaliGone(), { wrapper });

    act(() => open("man1"));

    expect(path).toBe("/mandali/ludo-lounge");
  });

  it("takes the member back to the list the moment the open Mandali is deleted", () => {
    renderHook(() => useLeaveWhenMandaliGone(), { wrapper });
    act(() => open("man1"));

    act(() => {
      useMandaliStore.getState().applyMandaliDeleted("man1");
    });

    expect(path).toBe("/mandali");
  });

  it("does not leave when they move from one Mandali to another", () => {
    renderHook(() => useLeaveWhenMandaliGone(), { wrapper });
    act(() => open("man1"));

    act(() => open("man2"));

    expect(path).toBe("/mandali/ludo-lounge");
  });

  it("replaces the page rather than adding to history, so Back cannot return to a group that is gone", () => {
    let goBack: () => void = () => undefined;
    function Recorder({ children }: { children: ReactNode }) {
      path = useLocation().pathname;
      const navigate = useNavigate();
      goBack = () => navigate(-1);
      return <>{children}</>;
    }
    renderHook(() => useLeaveWhenMandaliGone(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/", "/mandali/ludo-lounge"]} initialIndex={1}>
          <Recorder>{children}</Recorder>
        </MemoryRouter>
      ),
    });
    act(() => open("man1"));
    act(() => close());
    expect(path).toBe("/mandali");

    act(() => goBack());

    // Had the list been pushed on top, Back would land on the deleted group's page again.
    expect(path).toBe("/");
  });

  it("leaves only once, however many times the store is touched afterwards", () => {
    renderHook(() => useLeaveWhenMandaliGone(), { wrapper });
    act(() => open("man1"));
    act(() => close());
    expect(path).toBe("/mandali");

    act(() => close());
    act(() => useMandaliStore.setState({ isLoading: true }));

    expect(path).toBe("/mandali");
  });
});
