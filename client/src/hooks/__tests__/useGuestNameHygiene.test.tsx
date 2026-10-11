import { describe, it, expect, beforeEach } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useGuestNameHygiene } from "../useGuestNameHygiene";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";

let go: (to: string) => void = () => {};

function Harness() {
  useGuestNameHygiene();
  go = useNavigate();
  return null;
}

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

function setSession(isMember: boolean, ready = true) {
  useAuthStore.setState({ isMember, ready } as never);
}

describe("useGuestNameHygiene", () => {
  beforeEach(() => {
    localStorage.clear();
    useRoomStore.setState({ playerName: "" });
  });

  it("keeps a guest's name while they are inside a room, including after a refresh", () => {
    setSession(false);
    useRoomStore.setState({ playerName: "Ravi" });

    mount("/room/ABC123");

    expect(useRoomStore.getState().playerName).toBe("Ravi");
  });

  it("clears a guest's name when they leave the room for any other page", () => {
    setSession(false);
    useRoomStore.setState({ playerName: "Ravi" });
    mount("/room/ABC123");

    act(() => go("/"));

    expect(useRoomStore.getState().playerName).toBe("");
  });

  it("clears a name left behind by an older build when a guest lands outside a room", () => {
    setSession(false);
    useRoomStore.setState({ playerName: "StaleName" });

    mount("/");

    expect(useRoomStore.getState().playerName).toBe("");
  });

  it("does not clear the name a guest types at the lobby before they walk into a room", () => {
    setSession(false);
    mount("/");
    act(() => useRoomStore.setState({ playerName: "Ravi" }));

    act(() => go("/room/ABC123"));

    expect(useRoomStore.getState().playerName).toBe("Ravi");
  });

  it("never touches an account's name", () => {
    setSession(true);
    useRoomStore.setState({ playerName: "Asha" });
    mount("/room/ABC123");

    act(() => go("/"));

    expect(useRoomStore.getState().playerName).toBe("Asha");
  });

  it("waits for the session to settle before deciding anyone is a guest", () => {
    setSession(false, false);
    useRoomStore.setState({ playerName: "Asha" });

    mount("/");

    expect(useRoomStore.getState().playerName).toBe("Asha");
  });
});
