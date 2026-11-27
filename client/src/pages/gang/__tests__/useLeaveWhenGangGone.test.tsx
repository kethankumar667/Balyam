import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useLeaveWhenGangGone } from "../useLeaveWhenGangGone";
import { useGangStore } from "../../../store/gangStore";

/**
 * A member is reading a Gang when its owner deletes it. Nothing about that
 * page is true any more, so they are taken back to the list rather than left
 * looking at an empty chat — and only then: not while the page is still loading,
 * and not when they simply move from one Gang to another.
 */

let path = "";
function Probe({ children }: { children: ReactNode }) {
  path = useLocation().pathname;
  return <>{children}</>;
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={["/gang/ludo-lounge"]}>
    <Probe>{children}</Probe>
  </MemoryRouter>
);

const open = (id: string) => useGangStore.setState({ activeGang: { id } as never });
const close = () => useGangStore.setState({ activeGang: null });

describe("useLeaveWhenGangGone", () => {
  beforeEach(() => close());
  afterEach(() => {
    cleanup();
    close();
  });

  it("stays put while the Gang has not loaded yet", () => {
    renderHook(() => useLeaveWhenGangGone(), { wrapper });

    expect(path).toBe("/gang/ludo-lounge");
  });

  it("stays put while the Gang is open", () => {
    renderHook(() => useLeaveWhenGangGone(), { wrapper });

    act(() => open("man1"));

    expect(path).toBe("/gang/ludo-lounge");
  });

  it("takes the member back to the list the moment the open Gang is deleted", () => {
    renderHook(() => useLeaveWhenGangGone(), { wrapper });
    act(() => open("man1"));

    act(() => {
      useGangStore.getState().applyGangDeleted("man1");
    });

    expect(path).toBe("/gang");
  });

  it("does not leave when they move from one Gang to another", () => {
    renderHook(() => useLeaveWhenGangGone(), { wrapper });
    act(() => open("man1"));

    act(() => open("man2"));

    expect(path).toBe("/gang/ludo-lounge");
  });

  it("replaces the page rather than adding to history, so Back cannot return to a group that is gone", () => {
    let goBack: () => void = () => undefined;
    function Recorder({ children }: { children: ReactNode }) {
      path = useLocation().pathname;
      const navigate = useNavigate();
      goBack = () => navigate(-1);
      return <>{children}</>;
    }
    renderHook(() => useLeaveWhenGangGone(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/", "/gang/ludo-lounge"]} initialIndex={1}>
          <Recorder>{children}</Recorder>
        </MemoryRouter>
      ),
    });
    act(() => open("man1"));
    act(() => close());
    expect(path).toBe("/gang");

    act(() => goBack());

    // Had the list been pushed on top, Back would land on the deleted group's page again.
    expect(path).toBe("/");
  });

  it("leaves only once, however many times the store is touched afterwards", () => {
    renderHook(() => useLeaveWhenGangGone(), { wrapper });
    act(() => open("man1"));
    act(() => close());
    expect(path).toBe("/gang");

    act(() => close());
    act(() => useGangStore.setState({ isLoading: true }));

    expect(path).toBe("/gang");
  });
});
