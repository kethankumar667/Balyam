import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Player } from "@shared/types";
import { buildBotProfile, pickBotCosmetics } from "@shared/bot-profile";
import SeatProfileButton from "../SeatProfileButton";
import PlayerList from "../../PlayerList";
import GameOverScreen from "../../GameOverScreen";

vi.mock("../../../animations/particles/comicBursts", () => ({ fireFireworksBurst: vi.fn() }));
vi.mock("../../../animations/comic/ComicBurstText", () => ({ default: () => null }));

const human = (over: Partial<Player> = {}): Player => ({
  id: "p_1",
  name: "Anand",
  isHost: false,
  isReady: true,
  isConnected: true,
  level: 7,
  ...over,
});

const bot = (over: Partial<Player> = {}): Player => ({
  id: "bot_1",
  name: "Pintu",
  isHost: false,
  isReady: true,
  isConnected: true,
  isBot: true,
  level: 5,
  botProfile: buildBotProfile("ludo", "Pintu", { level: 5 }),
  cosmetics: pickBotCosmetics("ludo", "Pintu"),
  ...over,
});

/**
 * A profile for anyone at the table, human or bot, opened from one small button.
 *
 * A human's card shows only what the table already sees of them: name, avatar and aura, level,
 * title, whether they are the host, a guest, or here right now. Nothing new is sent for it.
 */
describe("SeatProfileButton", () => {
  it("opens a human player's card with their name, level, role and state", () => {
    render(<SeatProfileButton player={human({ isHost: true, isGuest: true, cosmetics: { podiumTitle: "title_grandmaster" } })} />);

    fireEvent.click(screen.getByRole("button", { name: "View Anand's profile" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Anand")).toBeInTheDocument();
    expect(within(dialog).getByText("Level 7")).toBeInTheDocument();
    expect(within(dialog).getByText("Host")).toBeInTheDocument();
    expect(within(dialog).getByText("Guest")).toBeInTheDocument();
    expect(within(dialog).getByText("Grandmaster")).toBeInTheDocument();
    expect(within(dialog).getByText("Online")).toBeInTheDocument();
  });

  it("says when a player has dropped, and when the seat is your own", () => {
    render(<SeatProfileButton player={human({ isConnected: false })} isSelf />);

    fireEvent.click(screen.getByRole("button", { name: "View Anand's profile" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("You")).toBeInTheDocument();
    expect(within(dialog).getByText("Reconnecting")).toBeInTheDocument();
  });

  it("does not claim a bot is a person: a bot opens the practice-bot card", () => {
    const b = bot();
    render(<SeatProfileButton player={b} />);

    fireEvent.click(screen.getByRole("button", { name: "View Pintu's profile" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Practice bot")).toBeInTheDocument();
    expect(within(dialog).getByText(new RegExp(b.botProfile!.tagline))).toBeInTheDocument();
  });

  it("offers nothing for a bot that has no profile", () => {
    const { container } = render(<SeatProfileButton player={bot({ botProfile: undefined })} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("closes again", () => {
    render(<SeatProfileButton player={human()} />);

    fireEvent.click(screen.getByRole("button", { name: "View Anand's profile" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close profile" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the tap off the seat it sits on, because a seat's own tap sends a reaction", () => {
    const onSeatTap = vi.fn();
    render(
      <div onClick={onSeatTap}>
        <SeatProfileButton player={human()} />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "View Anand's profile" }));

    expect(onSeatTap).not.toHaveBeenCalled();
  });
});

describe("the player list", () => {
  it("offers a profile for every other player, not only bots", () => {
    render(<PlayerList players={[human({ id: "me", name: "Kethan" }), human({ id: "p_2", name: "Babji" }), bot()]} selfId="me" onTapPlayer={vi.fn()} />);

    expect(screen.getByRole("button", { name: "View Babji's profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Pintu's profile" })).toBeInTheDocument();
  });

  it("opens a human's card from the list", () => {
    render(<PlayerList players={[human({ id: "me", name: "Kethan" }), human({ id: "p_2", name: "Babji", level: 12 })]} selfId="me" />);

    fireEvent.click(screen.getByRole("button", { name: "View Babji's profile" }));

    expect(within(screen.getByRole("dialog")).getByText("Level 12")).toBeInTheDocument();
  });
});

describe("the generic game-over screen", () => {
  it("carries a winning bot's character through to the end, like the other results screens", () => {
    const b = bot({ cosmetics: { podiumTitle: "title_grandmaster" } });
    render(<GameOverScreen players={[human({ id: "me", name: "Kethan" }), b]} selfId="me" onLeave={vi.fn()} deadlineMs={Date.now() + 60_000} winnerName="Pintu" gameName="Ludo" />);

    expect(screen.getByText(b.botProfile!.tagline)).toBeInTheDocument();
  });

  it("shows nothing extra when a person won", () => {
    render(<GameOverScreen players={[human({ id: "me", name: "Kethan" }), human({ id: "p_2", name: "Babji" })]} selfId="me" onLeave={vi.fn()} deadlineMs={Date.now() + 60_000} winnerName="Babji" gameName="Ludo" />);

    expect(screen.queryByText(/practice bot/i)).toBeNull();
  });
});
