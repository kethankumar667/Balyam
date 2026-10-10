import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Player } from "@shared/types";
import { buildBotProfile, pickBotCosmetics } from "@shared/bot-profile";
import BotProfileCard from "../BotProfileCard";
import BotStyleChip from "../BotStyleChip";
import ParticipantRow from "../ParticipantRow";
import BotResultNote from "../BotResultNote";
import PlayerList from "../../PlayerList";
import WinnerCelebration from "../../../games/ludo/WinnerCelebration";

function makeBot(over: Partial<Player> = {}): Player {
  return {
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
  };
}

const human = (over: Partial<Player> = {}): Player => ({
  id: "p_1",
  name: "Anand",
  isHost: false,
  isReady: true,
  isConnected: true,
  ...over,
});

vi.mock("../../../animations/particles/comicBursts", () => ({ fireFireworksBurst: vi.fn() }));
vi.mock("../../../animations/comic/ComicBurstText", () => ({ default: () => null }));

describe("BotResultNote", () => {
  it("shows a bot's title and tagline", () => {
    const bot = makeBot({ cosmetics: { podiumTitle: "title_grandmaster" } });
    render(<BotResultNote player={bot} />);

    expect(screen.getByText("Grandmaster")).toBeInTheDocument();
    expect(screen.getByText(bot.botProfile!.tagline)).toBeInTheDocument();
  });

  it("shows just the tagline when the bot has no title", () => {
    const bot = makeBot({ cosmetics: {} });
    render(<BotResultNote player={bot} />);

    expect(screen.getByText(bot.botProfile!.tagline)).toBeInTheDocument();
    expect(screen.queryByText(/master/i)).toBeNull();
  });

  it("renders nothing for a human, a missing player, or a bot with no profile", () => {
    const { container: human } = render(<BotResultNote player={{ id: "p", name: "A", isHost: false, isReady: true, isConnected: true }} />);
    const { container: none } = render(<BotResultNote player={undefined} />);
    const { container: bare } = render(<BotResultNote player={makeBot({ botProfile: undefined })} />);

    expect(human).toBeEmptyDOMElement();
    expect(none).toBeEmptyDOMElement();
    expect(bare).toBeEmptyDOMElement();
  });

  it("never shows a title it does not know", () => {
    render(<BotResultNote player={makeBot({ cosmetics: { podiumTitle: "title_not_in_the_catalogue" } })} />);

    expect(screen.queryByText(/not_in_the_catalogue/)).toBeNull();
  });
});

describe("Ludo winner banner — a bot champion", () => {
  it("carries the bot's character to the champion screen", () => {
    const bot = makeBot();
    render(<WinnerCelebration winner={bot} color="red" />);

    expect(screen.getByText("Pintu")).toBeInTheDocument();
    expect(screen.getByText(bot.botProfile!.tagline)).toBeInTheDocument();
  });

  it("shows only the name for a human champion", () => {
    render(<WinnerCelebration winner={human()} color="red" />);

    expect(screen.getByText("Anand")).toBeInTheDocument();
    expect(screen.queryByText(/Counts|Never|Always/)).toBeNull();
  });
});

describe("PlayerList — a bot in a running game", () => {
  it("shows the bot's play style next to its name", () => {
    const bot = makeBot();
    render(<PlayerList players={[bot]} selfId="p_self" />);

    expect(screen.getByText(bot.botProfile!.playStyle)).toBeInTheDocument();
  });

  it("opens the bot's profile from its own button", () => {
    render(<PlayerList players={[makeBot()]} selfId="p_self" />);

    fireEvent.click(screen.getByRole("button", { name: "View Pintu's profile" }));

    expect(screen.getByRole("dialog", { name: "Pintu" })).toBeInTheDocument();
  });

  it("keeps the profile button apart from the row's reaction tap", () => {
    const onTapPlayer = vi.fn();
    render(<PlayerList players={[makeBot()]} selfId="p_self" onTapPlayer={onTapPlayer} />);

    fireEvent.click(screen.getByRole("button", { name: "View Pintu's profile" }));
    expect(onTapPlayer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Pintu", { selector: "span.truncate" }));
    expect(onTapPlayer).toHaveBeenCalledWith("bot_1");
  });

  it("gives a human a profile button, but no bot style chip", () => {
    render(<PlayerList players={[human()]} selfId="p_self" />);

    // Humans have a profile now (see SeatProfile.test.tsx); what they must not get is a bot's play style.
    expect(screen.getByRole("button", { name: /profile/i })).toBeInTheDocument();
    expect(screen.queryByText("Cautious")).toBeNull();
  });

  it("shows a bot with no profile exactly as before", () => {
    render(<PlayerList players={[makeBot({ botProfile: undefined })]} selfId="p_self" />);

    expect(screen.queryByRole("button", { name: /profile/i })).toBeNull();
    expect(screen.getByText("Bot")).toBeInTheDocument();
  });
});

describe("BotStyleChip", () => {
  it("names a real difficulty as a difficulty", () => {
    render(<BotStyleChip profile={{ playStyle: "Sharp", styleIsReal: true }} />);

    expect(screen.getByText("Sharp")).toHaveAttribute("title", "Difficulty: Sharp");
  });

  it("calls a persona a persona, and says why", () => {
    render(<BotStyleChip profile={{ playStyle: "Daring", styleIsReal: false }} />);

    expect(screen.getByText("Daring").getAttribute("title")).toMatch(/Persona: Daring.*no difficulty setting/);
  });
});

describe("BotProfileCard", () => {
  it("shows who the bot is, where it is from, and how it plays", () => {
    const bot = makeBot();
    render(<BotProfileCard player={bot} onClose={() => undefined} />);

    const dialog = screen.getByRole("dialog", { name: "Pintu" });
    expect(within(dialog).getByText("Practice bot")).toBeInTheDocument();
    expect(within(dialog).getByText(`“${bot.botProfile!.tagline}”`)).toBeInTheDocument();
    expect(within(dialog).getByText(`From ${bot.botProfile!.hometown}`)).toBeInTheDocument();
    expect(within(dialog).getByText(bot.botProfile!.playStyle)).toBeInTheDocument();
  });

  it("labels the record as simulated, so a practice bot is not passed off as a person", () => {
    render(<BotProfileCard player={makeBot()} onClose={() => undefined} />);

    expect(screen.getByLabelText("Simulated record")).toBeInTheDocument();
    expect(screen.getByText(/Simulated record, just for fun/)).toBeInTheDocument();
    expect(screen.getByText(/not real players/)).toBeInTheDocument();
  });

  it("shows the record's numbers from the bot's profile", () => {
    const bot = makeBot();
    const { matches, wins, bestStreak } = bot.botProfile!.stats;
    render(<BotProfileCard player={bot} onClose={() => undefined} />);

    const record = screen.getByLabelText("Simulated record");
    expect(within(record).getByText(String(matches))).toBeInTheDocument();
    expect(within(record).getByText(String(wins))).toBeInTheDocument();
    expect(within(record).getByText(`${Math.round((wins / matches) * 100)}%`)).toBeInTheDocument();
    expect(within(record).getAllByText(String(bestStreak)).length).toBeGreaterThan(0);
  });

  it("explains a real difficulty differently from a persona", () => {
    const real = makeBot({ botProfile: buildBotProfile("bingo", "Padma", { level: 4, difficulty: "hard" }) });
    const { unmount } = render(<BotProfileCard player={real} onClose={() => undefined} />);
    expect(screen.getByText("Difficulty: Sharp")).toBeInTheDocument();
    unmount();

    render(<BotProfileCard player={makeBot()} onClose={() => undefined} />);
    expect(screen.getByText(/Persona: .*no difficulty setting/)).toBeInTheDocument();
  });

  it("closes from the close button, Escape, and the backdrop", () => {
    const onClose = vi.fn();
    const { baseElement } = render(<BotProfileCard player={makeBot()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(baseElement.querySelector(".fixed.inset-0")!);

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does not close when the card itself is pressed", () => {
    const onClose = vi.fn();
    render(<BotProfileCard player={makeBot()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("gives the close button a phone-sized touch target", () => {
    render(<BotProfileCard player={makeBot()} onClose={() => undefined} />);

    expect(screen.getByRole("button", { name: "Close profile" }).className).toMatch(/min-w-\[44px\].*min-h-\[44px\]|min-h-\[44px\].*min-w-\[44px\]/);
  });

  it("copes with a bot that has no profile", () => {
    render(<BotProfileCard player={makeBot({ botProfile: undefined })} onClose={() => undefined} />);

    expect(screen.getByText("This bot has no profile yet.")).toBeInTheDocument();
  });
});

describe("ParticipantRow — a bot's profile", () => {
  it("shows the play style and the tagline on a bot's row", () => {
    const bot = makeBot();
    render(<ParticipantRow player={bot} selfId="p_self" isHost={false} />);

    expect(screen.getByText(bot.botProfile!.playStyle)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(bot.botProfile!.tagline))).toBeInTheDocument();
  });

  it("opens the profile card when the bot's seat is tapped", () => {
    render(<ParticipantRow player={makeBot()} selfId="p_self" isHost={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View Pintu's profile" }));

    expect(screen.getByRole("dialog", { name: "Pintu" })).toBeInTheDocument();
  });

  it("opens the same card from the lobby seat card", () => {
    render(<ParticipantRow player={makeBot()} selfId="p_self" isHost={false} variant="card" />);

    fireEvent.click(screen.getByRole("button", { name: "View Pintu's profile" }));

    expect(screen.getByRole("dialog", { name: "Pintu" })).toBeInTheDocument();
  });

  it("shows the style chip on the lobby seat card", () => {
    const bot = makeBot();
    render(<ParticipantRow player={bot} selfId="p_self" isHost={false} variant="card" />);

    expect(screen.getByText(bot.botProfile!.playStyle)).toBeInTheDocument();
  });

  it("closes the card again", () => {
    render(<ParticipantRow player={makeBot()} selfId="p_self" isHost={false} />);
    fireEvent.click(screen.getByRole("button", { name: "View Pintu's profile" }));

    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves a human's seat exactly as it was: no profile button, no style chip", () => {
    render(<ParticipantRow player={human()} selfId="p_self" isHost={false} />);

    expect(screen.queryByRole("button", { name: /profile/i })).toBeNull();
    expect(screen.queryByText("Balanced")).toBeNull();
    expect(screen.getAllByText("Player").length).toBeGreaterThan(0);
  });

  it("still shows a plain Bot label for a bot with no profile", () => {
    render(<ParticipantRow player={makeBot({ botProfile: undefined })} selfId="p_self" isHost={false} />);

    expect(screen.getAllByText("Bot").length).toBeGreaterThan(0);
  });

  it("keeps the host's rename and remove controls on a bot", () => {
    render(
      <ParticipantRow player={makeBot()} selfId="p_self" isHost={true} onRemoveBot={() => undefined} onRenameBot={() => undefined} />,
    );

    expect(screen.getByRole("button", { name: "Rename Pintu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Pintu" })).toBeInTheDocument();
  });
});
