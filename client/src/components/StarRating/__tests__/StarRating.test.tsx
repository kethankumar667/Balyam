import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import StarRating from "../index";

describe("StarRating", () => {
  it("renders a radiogroup of 5 radio stars, with the correct one checked", () => {
    render(<StarRating value={3} onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Rating" });
    const stars = within(group).getAllByRole("radio");
    expect(stars).toHaveLength(5);
    expect(stars[2].getAttribute("aria-checked")).toBe("true");
    expect(stars[0].getAttribute("aria-checked")).toBe("false");
  });

  it("calls onChange when a star is clicked", () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("moves selection with ArrowRight, wrapping past the last star back to the first", () => {
    const onChange = vi.fn();
    render(<StarRating value={5} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "5 stars" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("moves selection with ArrowLeft, wrapping before the first star back to the last", () => {
    const onChange = vi.fn();
    render(<StarRating value={1} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "1 star" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("jumps to the first/last star on Home/End", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    const thirdStar = screen.getByRole("radio", { name: "3 stars" });
    fireEvent.keyDown(thirdStar, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith(1);

    onChange.mockClear();
    fireEvent.keyDown(thirdStar, { key: "End" });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("renders read-only as an img with no radio roles", () => {
    render(<StarRating value={4} readOnly />);
    expect(screen.getByRole("img", { name: "4 out of 5 stars" })).toBeDefined();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});
