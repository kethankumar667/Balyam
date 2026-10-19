import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MandaliAroundPerson } from "@shared/mandali/types";
import { AroundNowStrip, describeAround } from "../AroundNowStrip";

afterEach(() => {
  cleanup();
});

const person = (over: Partial<MandaliAroundPerson> & Pick<MandaliAroundPerson, "playerId" | "displayName">): MandaliAroundPerson => ({
  avatar: "avatar_1",
  presence: "online",
  ...over,
});

const BALA = person({ playerId: "p_bala", displayName: "Bala" });
const RAVI = person({ playerId: "p_ravi", displayName: "Ravi", presence: "in-game", activeGame: "ludo" });
const RAVI_WATCHABLE = { ...RAVI, watchCode: "ABC234" };

function renderStrip(people: MandaliAroundPerson[]) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<AroundNowStrip people={people} />} />
        <Route path="/watch/:code" element={<p>Watching the match</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("describeAround", () => {
  it("is null when nobody is around", () => {
    expect(describeAround([])).toBeNull();
  });

  it("names one friend who is free", () => {
    expect(describeAround([BALA])?.lead).toBe("Bala is around");
  });

  it("names the game for one friend mid-match", () => {
    expect(describeAround([RAVI])?.lead).toBe("Ravi is playing Ludo");
  });

  it("counts the rest when several are around, in the singular and the plural", () => {
    expect(describeAround([BALA, RAVI])?.lead).toBe("Bala and 1 other are around");
    expect(describeAround([BALA, RAVI, person({ playerId: "p_c", displayName: "Charan" })])?.lead).toBe(
      "Bala and 2 others are around",
    );
  });

  it("offers a watch only for a match that has a watch code", () => {
    expect(describeAround([RAVI])?.watch).toBeNull();
    expect(describeAround([BALA, RAVI_WATCHABLE])?.watch).toEqual({ code: "ABC234", name: "Ravi", game: "Ludo" });
  });
});

describe("AroundNowStrip", () => {
  it("draws nothing at all when nobody is around", () => {
    renderStrip([]);
    expect(screen.queryByRole("region", { name: /friends who are around/i })).toBeNull();
  });

  it("says who is around, in words", () => {
    renderStrip([BALA]);
    expect(screen.getByText("Bala is around")).not.toBeNull();
  });

  it("does not offer Watch when there is nothing to watch", () => {
    renderStrip([BALA, RAVI]);
    expect(screen.queryByRole("button", { name: /watch/i })).toBeNull();
  });

  it("takes the player to the match when Watch is tapped", () => {
    renderStrip([RAVI_WATCHABLE]);

    fireEvent.click(screen.getByRole("button", { name: /watch ravi play ludo/i }));

    expect(screen.getByText("Watching the match")).not.toBeNull();
  });

  it("keeps Watch a full-size touch target", () => {
    renderStrip([RAVI_WATCHABLE]);
    expect(screen.getByRole("button", { name: /watch/i }).className).toContain("min-h-[44px]");
  });

  it("shows at most five faces and counts the rest", () => {
    const crowd = Array.from({ length: 8 }, (_, i) => person({ playerId: `p_${i}`, displayName: `Friend ${i}` }));
    const { container } = renderStrip(crowd);

    expect(container.querySelectorAll("img")).toHaveLength(5);
    expect(screen.getByText("+3")).not.toBeNull();
  });

  it("never lets a stored avatar value choose the address of the picture", () => {
    const { container } = renderStrip([person({ playerId: "p_x", displayName: "Eve", avatar: "https://evil.example/track.png" })]);
    const src = container.querySelector("img")?.getAttribute("src");
    expect(src).toBe("/Bhalyam-logo.png");
  });
});
