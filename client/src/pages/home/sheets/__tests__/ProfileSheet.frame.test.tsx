import "@testing-library/jest-dom/vitest";
import { act, cleanup, render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { resolveEffectiveLoadout } from "@shared/cosmetics";
import { useCosmeticsStore } from "../../../../store/cosmeticsStore";
import { ProfileSheet } from "../ProfileSheet";

/**
 * The profile drawer's avatar sits in a circle, and a frame is drawn outside the avatar's edge. The circle used to
 * clip everything beyond it and the drawer never told the avatar which frame was worn, so a frame bought in the shop
 * never showed here. These pin both halves.
 */
const FRAME = "aura_nostalgia_gold";

function renderDrawer() {
  return render(
    <BrowserRouter>
      <ProfileSheet open onClose={() => {}} notifications={[]} onUpdateNotifications={() => {}} onOpenJoin={() => {}} />
    </BrowserRouter>,
  );
}

function wear(frame: string | null): void {
  act(() => useCosmeticsStore.setState({ resolved: resolveEffectiveLoadout(frame ? { avatarAura: frame } : {}) }));
}

afterEach(() => {
  cleanup();
  wear(null);
});

describe("ProfileSheet avatar frame", () => {
  it("draws the frame the account wears", () => {
    wear(FRAME);
    const { baseElement } = renderDrawer();

    expect(baseElement.querySelector(`svg[data-frame="${FRAME}"]`)).toBeInTheDocument();
  });

  it("does not sit the frame inside anything that clips", () => {
    wear(FRAME);
    const { baseElement } = renderDrawer();

    const card = baseElement.querySelector("button svg[data-frame]")?.closest("button");
    let node = baseElement.querySelector(`svg[data-frame="${FRAME}"]`)?.parentElement ?? null;
    expect(node).not.toBeNull();
    while (node && node !== card) {
      expect(node.className, node.outerHTML.slice(0, 80)).not.toMatch(/overflow-hidden/);
      node = node.parentElement;
    }
  });

  it("keeps the plain gold ring only while no frame is worn", () => {
    wear(null);
    const plain = renderDrawer();
    expect(plain.baseElement.querySelector("svg.af-svg")).not.toBeInTheDocument();
    expect(plain.baseElement.querySelector(".ring-4")).toBeInTheDocument();
    plain.unmount();

    wear(FRAME);
    const framed = renderDrawer();
    expect(framed.baseElement.querySelector(".ring-4")).not.toBeInTheDocument();
  });
});
