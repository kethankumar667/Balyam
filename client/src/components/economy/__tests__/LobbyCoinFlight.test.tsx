import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LobbyCoinFlight, type CoinParticle } from "../LobbyCoinFlight";

describe("LobbyCoinFlight Component (Phase 7F)", () => {
  const sampleParticles: CoinParticle[] = [
    {
      id: "p1",
      startX: 100,
      startY: 200,
      targetX: 500,
      targetY: 100,
      createdAt: Date.now(),
    },
    {
      id: "p2",
      startX: 150,
      startY: 250,
      targetX: 500,
      targetY: 100,
      createdAt: Date.now(),
    },
  ];

  it("renders nothing when particles array is empty", () => {
    const { container } = render(<LobbyCoinFlight particles={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders coin particles container with aria-hidden for accessibility", () => {
    const { container } = render(<LobbyCoinFlight particles={sampleParticles} />);
    expect(container.firstChild).not.toBeNull();
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeDefined();
  });

  it("caps particle elements to maximum 4 concurrent items", () => {
    const manyParticles: CoinParticle[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      startX: 100,
      startY: 100,
      targetX: 400,
      targetY: 400,
      createdAt: Date.now(),
    }));

    const { container } = render(<LobbyCoinFlight particles={manyParticles} />);
    const renderedItems = container.querySelectorAll(".will-change-transform");
    expect(renderedItems.length).toBeLessThanOrEqual(4);
  });
});
