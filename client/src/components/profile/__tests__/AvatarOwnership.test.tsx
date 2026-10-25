import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEffectiveLoadout } from "@shared/cosmetics";
import type { Player, RoomPublicState } from "@shared/types";
import SeatAvatar from "../SeatAvatar";
import SelfAvatar from "../SelfAvatar";
import { AlbumAvatar } from "../../mandali/album/AlbumAvatar";
import { useRoomStore } from "../../../store/roomStore";
import { useAuthStore } from "../../../store/authStore";
import { useCosmeticsStore } from "../../../store/cosmeticsStore";
import { apiFetch } from "../../../lib/playerIdentity";
import { AvatarPlayersContext } from "../../cosmetics/frames/SeatFrame";
import DotsBoxesScorecardModal from "../../../games/dotsboxes/DotsBoxesScorecardModal";
import { DOTSBOXES_NEON_THEMES } from "../../../games/dotsboxes/dotsboxes-theme";
import { TvGameArena } from "../../../pages/party/TvGameArena";

vi.mock("../../../lib/playerIdentity", async importOriginal => ({
  ...await importOriginal<typeof import("../../../lib/playerIdentity")>(),
  apiFetch: vi.fn(),
  peekPlayerCredential: () => null,
}));

const api = vi.mocked(apiFetch);
const empty = resolveEffectiveLoadout({ tableThemes: {}, tokenSkins: {}, diceSkins: {}, cardBacks: {} });
const seat = (id: string, avatarAura?: string): Player => ({ id, name: "Same name", avatar: "avatar-01.png", isHost: false, isReady: true, isConnected: true, cosmetics: { avatarAura } });
const room = (players: Player[]): RoomPublicState => ({
  code: "ABC123", game: "ludo", hostId: players[0].id, phase: "lobby", players, maxPlayers: 4,
  name: null, history: [], champion: null, unoHistory: [], unoChampion: null,
  bingoHistory: [], ludoHistory: [], sealed: false, entryStakeCoins: 0,
});

beforeEach(() => {
  useRoomStore.setState({ roomState: null });
  useAuthStore.setState({ userId: null });
  useCosmeticsStore.setState({ resolved: empty });
  api.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useRoomStore.setState({ roomState: null }); });

describe("avatar decoration belongs to its owner", () => {
  it("batches and deduplicates other-player reads, independent of identical names and pictures", async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ auras: { "remote-one": "frame_royal_crown", "remote-two": null } })));
    const { container, unmount } = render(<>
      <SeatAvatar playerId="remote-one" name="Same name" />
      <SeatAvatar playerId="remote-two" name="Same name" />
      <AlbumAvatar playerId="remote-one" name="Same name" presence="online" />
    </>);
    await waitFor(() => expect(container.querySelectorAll('[data-frame="frame_royal_crown"]')).toHaveLength(2));
    expect(api).toHaveBeenCalledOnce();
    expect(decodeURIComponent(String(api.mock.calls[0][0]))).toContain("playerIds=remote-one,remote-two");
    expect(container.querySelector("[data-presence=online]")).toBeInTheDocument();
    unmount();
    const again = render(<SeatAvatar playerId="remote-one" name="Same name" />);
    expect(again.container.querySelector('[data-frame="frame_royal_crown"]')).toBeInTheDocument();
    expect(api).toHaveBeenCalledOnce();
  });

  it("uses live seats, including bots, and removes a frame on the server's unequip echo without a public request", () => {
    useRoomStore.setState({ roomState: room([seat("bot-one", "frame_diya_glow"), seat("local-one")]) });
    const { container } = render(<><SeatAvatar playerId="bot-one" name="Bot" /><SeatAvatar playerId="local-one" name="Local" /></>);
    expect(container.querySelectorAll("[data-frame]")).toHaveLength(1);
    act(() => useRoomStore.setState({ roomState: room([seat("bot-one"), seat("local-one")]) }));
    expect(container.querySelector("[data-frame]")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it("updates self avatars immediately on equip and unequip; explicit none overrides live room cosmetics", () => {
    useAuthStore.setState({ userId: "self-one" });
    const { container } = render(<><SeatAvatar playerId="self-one" name="You" /><SelfAvatar /></>);
    act(() => useCosmeticsStore.setState({ resolved: { ...empty, avatarAura: "aura_nostalgia_gold" } }));
    expect(container.querySelectorAll("[data-frame]")).toHaveLength(2);
    act(() => useCosmeticsStore.setState({ resolved: empty }));
    expect(container.querySelector("[data-frame]")).toBeNull();
    expect(api).not.toHaveBeenCalled();
    act(() => useRoomStore.setState({ roomState: room([seat("framed-seat", "frame_royal_crown")]) }));
    const explicit = render(<SeatAvatar playerId="framed-seat" aura="aura_none" name="Plain" />);
    expect(explicit.container.querySelector("[data-frame]")).toBeNull();
  });

  it("uses the spectator screen's public roster without treating seat IDs as profile IDs", () => {
    const { container } = render(<AvatarPlayersContext.Provider value={[seat("spectator-bot", "frame_diya_glow")]}>
      <SeatAvatar playerId="spectator-bot" name="Bot" />
    </AvatarPlayersContext.Provider>);
    expect(container.querySelector('[data-frame="frame_diya_glow"]')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("keeps the frame and accessible presence when a Mandali image fails", () => {
    useRoomStore.setState({ roomState: room([seat("album-seat", "frame_diya_glow")]) });
    const { container, getByAltText } = render(<AlbumAvatar playerId="album-seat" avatar="missing.png" name="Player" presence="idle" />);
    fireEvent.error(getByAltText("Player"));
    expect(getByAltText("Player")).toHaveAttribute("src", "/Bhalyam-logo.png");
    expect(container.querySelectorAll("[data-frame]")).toHaveLength(1);
    expect(container.querySelector("[data-presence=idle]")).toBeInTheDocument();
    expect(container.querySelector("[data-presence=idle]")).toHaveClass("z-20");
  });

  it("frames Dots & Boxes winner and standings initials even when no avatar was chosen", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const players = [seat("dots-framed", "frame_diya_glow"), seat("dots-plain")].map(player => ({ ...player, avatar: undefined }));
    useRoomStore.setState({ roomState: room(players) });
    const rankedPlayers = players.map((player, index) => ({
      pid: player.id, name: player.name, score: 4 - index, rank: index + 1, theme: DOTSBOXES_NEON_THEMES[index],
    }));
    const { baseElement } = render(<DotsBoxesScorecardModal open onClose={() => {}} rankedPlayers={rankedPlayers}
      winner={rankedPlayers[0]} isTie={false} selfId="dots-framed" players={players} totalBoxes={7} moveCount={12} />);
    expect(baseElement.querySelectorAll('[data-frame="frame_diya_glow"]')).toHaveLength(2);
    expect(api).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2])("keeps the spectator RPS arena safe with %i available seats", count => {
    const players = [seat("tv-one", "frame_diya_glow"), seat("tv-two")].slice(0, count);
    const roster = { ...room([seat("tv-one")]), game: "rps" as const, phase: "playing" as const, players };
    const { container } = render(<AvatarPlayersContext.Provider value={players}>
      <TvGameArena room={roster} gameState={{}} activeTurn={{ playerId: "", name: "Waiting", deadlineMs: null }} />
    </AvatarPlayersContext.Provider>);
    expect(container).toHaveTextContent("RPS Grand Showdown Arena");
    expect(container.querySelectorAll('[data-frame="frame_diya_glow"]')).toHaveLength(count ? 1 : 0);
    expect(api).not.toHaveBeenCalled();
  });

  it("logs lookup failure instead of treating it as a successful empty loadout", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    api.mockResolvedValue(new Response("failure", { status: 503 }));
    const { container, unmount } = render(<SeatAvatar playerId="remote-unavailable" name="Player" />);
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("could not be loaded"), expect.any(Error)));
    expect(container.querySelector("[data-frame]")).toBeNull();
    unmount();
    api.mockResolvedValue(new Response(JSON.stringify({ auras: { "remote-unavailable": "frame_diya_glow" } })));
    const retry = render(<SeatAvatar playerId="remote-unavailable" name="Player" />);
    await waitFor(() => expect(retry.container.querySelector("[data-frame]")).toBeInTheDocument());
    expect(api).toHaveBeenCalledTimes(2);
  });

  it("does not partially cache a malformed batch", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    api.mockResolvedValue(new Response(JSON.stringify({ auras: {
      "invalid-batch-one": "frame_royal_crown", "invalid-batch-two": 7,
    } })));
    const { unmount } = render(<><SeatAvatar playerId="invalid-batch-one" name="One" /><SeatAvatar playerId="invalid-batch-two" name="Two" /></>);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    unmount();
    api.mockResolvedValue(new Response(JSON.stringify({ auras: { "invalid-batch-one": null } })));
    const retry = render(<SeatAvatar playerId="invalid-batch-one" name="One" />);
    expect(retry.container.querySelector("[data-frame]")).toBeNull();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(retry.container.querySelector("[data-frame]")).toBeNull();
  });

  it("bounds every request to 25 unique owners", async () => {
    api.mockImplementation(async path => {
      const ids = new URL(String(path), "http://fixture").searchParams.get("playerIds")!.split(",");
      return new Response(JSON.stringify({ auras: Object.fromEntries(ids.map(id => [id, null])) }));
    });
    render(<>{Array.from({ length: 51 }, (_, i) => <SeatAvatar key={i} playerId={`batch-owner-${i}`} name="Player" />)}</>);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
    const batches = api.mock.calls.map(([path]) => new URL(String(path), "http://fixture").searchParams.get("playerIds")!.split(","));
    expect(batches.map(batch => batch.length)).toEqual([25, 25, 1]);
    expect(new Set(batches.flat()).size).toBe(51);
  });

  it("does not issue a public read for picker samples, explicit auras, or ownerless placeholders", () => {
    render(<><SeatAvatar name="Sample" /><SeatAvatar playerId="explicit-only" name="Preview" aura="frame_diya_glow" /></>);
    expect(api).not.toHaveBeenCalled();
  });
});
