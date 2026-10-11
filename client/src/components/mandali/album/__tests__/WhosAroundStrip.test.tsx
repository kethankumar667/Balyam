import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { MandaliMember, MandaliMessage } from "@shared/mandali/types.js";

const join = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/roomJoin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/roomJoin")>()),
  joinRoomByCode: join,
}));

import { WhosAroundStrip } from "../WhosAroundStrip";
import { useRoomInviteStatusStore } from "../../../../store/roomInviteStatusStore";

const member = (id: string, presence: MandaliMember["presence"], over: Partial<MandaliMember> = {}): MandaliMember => ({
  memberId: `mem_${id}`,
  mandaliId: "m1",
  playerId: id,
  displayName: id[0].toUpperCase() + id.slice(1),
  avatar: `${id}.png`,
  role: "MEMBER",
  state: "ACTIVE",
  joinedAt: 1,
  presence,
  contributionScore: 0,
  ...over,
});

const invite = (code: string, over: Partial<MandaliMessage> = {}): MandaliMessage =>
  ({
    messageId: `msg_${code}`,
    channelId: "c1",
    mandaliId: "m1",
    senderId: "asha",
    senderName: "Asha",
    senderAvatar: "asha.png",
    senderRole: "MEMBER",
    content: `room ${code}`,
    reactions: {},
    timestamp: Date.now() - 60_000,
    kind: "ROOM_INVITE",
    roomCode: code,
    roomInvite: { game: "ludo", gameName: "Ludo 🎲", maxPlayers: 4, roomName: "Sunday night Ludo", hostName: "Asha" },
    ...over,
  }) as MandaliMessage;

const setStatuses = (statuses: Record<string, Record<string, unknown>>) =>
  useRoomInviteStatusStore.setState({
    statuses: Object.fromEntries(
      Object.entries(statuses).map(([code, s]) => [code, { code, state: "OPEN", players: 2, maxPlayers: 4, youAreIn: false, ...s }]),
    ) as never,
    // Keep the real poller out of the way — these tests decide what the status is.
    subscribe: () => () => undefined,
    refresh: vi.fn(async () => undefined),
  });

const renderStrip = (members: MandaliMember[], messages: MandaliMessage[] = [], selfId: string | null = "me") =>
  render(
    <MemoryRouter initialEntries={["/mandali/x"]}>
      <Routes>
        <Route path="/mandali/x" element={<WhosAroundStrip members={members} messages={messages} selfId={selfId} />} />
        <Route path="/room/:code" element={<div>IN THE ROOM</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("WhosAroundStrip", () => {
  beforeEach(() => {
    join.mockReset();
    join.mockResolvedValue({ ok: true, code: "LDO482" });
    setStatuses({});
  });
  afterEach(cleanup);

  it("takes no room at all when nobody is around and no table is open", () => {
    const { container } = renderStrip([member("me", "online"), member("bala", "offline")]);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows who is here right now and who is mid-match, in words", () => {
    renderStrip([member("me", "online"), member("asha", "online"), member("bala", "in-game", { activeGame: "ludo" })]);

    expect(screen.getByText("2 here now · Bala is playing Ludo")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Who is around" })).toBeInTheDocument();
  });

  it("gives each face a name and a presence a screen reader can read, so colour is never the only signal", () => {
    renderStrip([member("me", "online"), member("asha", "online"), member("bala", "in-game", { activeGame: "ludo" })]);

    expect(screen.getByAltText("Asha, Here now")).toBeInTheDocument();
    expect(screen.getByAltText("Bala, Playing")).toBeInTheDocument();
  });

  it("does not count or show yourself", () => {
    renderStrip([member("me", "online"), member("asha", "online")]);

    expect(screen.getByText("1 here now")).toBeInTheDocument();
    expect(screen.queryByAltText(/^Me,/)).toBeNull();
  });

  it("never offers Join for someone who is mid-match: a running match cannot take new players", () => {
    renderStrip([member("me", "online"), member("bala", "in-game", { activeGame: "ludo" })]);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("folds extra faces into +N", () => {
    const people = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => member(id, "online"));
    renderStrip([member("me", "online"), ...people]);

    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("8 here now")).toBeInTheDocument();
  });

  it("offers an open table with a one-tap Join that takes you straight in", async () => {
    setStatuses({ LDO482: {} });
    renderStrip([member("me", "online")], [invite("LDO482")]);

    const tables = screen.getByRole("list", { name: "Open tables" });
    expect(within(tables).getByText("Sunday night Ludo")).toBeInTheDocument();
    expect(within(tables).getByText("Ludo · 2 of 4 seats")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Join Sunday night Ludo, hosted by Asha" }));

    await waitFor(() => expect(screen.getByText("IN THE ROOM")).toBeInTheDocument());
    expect(join).toHaveBeenCalledWith("LDO482");
  });

  it("shows the table even when nobody else is around", () => {
    setStatuses({ LDO482: {} });
    renderStrip([member("me", "online")], [invite("LDO482")]);

    expect(screen.getByRole("button", { name: /Join Sunday night Ludo/ })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Who is around" })).toBeNull();
  });

  it.each(["FULL", "IN_PROGRESS", "CLOSED"])("stops offering a table once it is %s", (state) => {
    setStatuses({ LDO482: { state } });
    const { container } = renderStrip([member("me", "online")], [invite("LDO482")]);

    expect(container).toBeEmptyDOMElement();
  });

  it("says in words when the table filled up between the tap and the answer, and refreshes it", async () => {
    join.mockResolvedValue({ ok: false, reason: "FULL", error: "Room is full" });
    setStatuses({ LDO482: {} });
    renderStrip([member("me", "online")], [invite("LDO482")]);
    const refresh = useRoomInviteStatusStore.getState().refresh as ReturnType<typeof vi.fn>;

    fireEvent.click(screen.getByRole("button", { name: /Join Sunday night Ludo/ }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/just filled up/));
    expect(refresh).toHaveBeenCalledWith(["LDO482"]);
    expect(screen.queryByText("IN THE ROOM")).toBeNull();
  });

  it("does not send two joins from a double tap", async () => {
    let finish: (v: unknown) => void = () => undefined;
    join.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    setStatuses({ LDO482: {} });
    renderStrip([member("me", "online")], [invite("LDO482")]);

    const button = screen.getByRole("button", { name: /Join Sunday night Ludo/ });
    fireEvent.click(button);
    fireEvent.click(button);
    finish({ ok: true, code: "LDO482" });

    await waitFor(() => expect(screen.getByText("IN THE ROOM")).toBeInTheDocument());
    expect(join).toHaveBeenCalledTimes(1);
  });
});

describe("WhosAroundStrip: watching a friend's match", () => {
  beforeEach(() => {
    setStatuses({});
  });
  afterEach(cleanup);

  const playing = (id: string, code?: string, over: Partial<MandaliMember> = {}) =>
    member(id, "in-game", { activeGame: "ludo", ...(code ? { watchCode: code } : {}), ...over });

  function renderWithWatchRoute(members: MandaliMember[]) {
    return render(
      <MemoryRouter initialEntries={["/mandali/x"]}>
        <Routes>
          <Route path="/mandali/x" element={<WhosAroundStrip members={members} messages={[]} selfId="me" />} />
          <Route path="/watch/:code" element={<div>IN THE AUDIENCE</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("offers Watch for a friend mid-match, and it takes you into the audience of that room", async () => {
    renderWithWatchRoute([member("me", "online"), playing("bala", "LDO482")]);

    expect(screen.getByRole("list", { name: "Live matches" })).toBeInTheDocument();
    expect(screen.getByText("Bala is playing Ludo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Watch Bala's match live" }));

    await waitFor(() => expect(screen.getByText("IN THE AUDIENCE")).toBeInTheDocument());
  });

  it("does not repeat who is playing in the summary line when a Watch row says it", () => {
    renderWithWatchRoute([member("me", "online"), member("asha", "online"), playing("bala", "LDO482")]);

    expect(screen.getByText("2 here now")).toBeInTheDocument();
    expect(screen.getAllByText(/Bala is playing Ludo/)).toHaveLength(1);
  });

  it("names the first friend and counts the rest when several are in one match", () => {
    renderWithWatchRoute([member("me", "online"), playing("bala", "LDO482"), playing("asha", "LDO482")]);

    expect(screen.getByText("Bala and 1 more are playing")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Watch/ })).toHaveLength(1);
  });

  it("offers no Watch for a friend whose room takes no audience (no watch code)", () => {
    renderWithWatchRoute([member("me", "online"), playing("bala")]);

    expect(screen.queryByRole("button", { name: /Watch/ })).toBeNull();
    expect(screen.getByText(/Bala is playing Ludo/)).toBeInTheDocument();
  });

  it("does not offer to watch yourself", () => {
    renderWithWatchRoute([playing("me", "LDO482"), member("asha", "online")]);

    expect(screen.queryByRole("button", { name: /Watch/ })).toBeNull();
  });
});
