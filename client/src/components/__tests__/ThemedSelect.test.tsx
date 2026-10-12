import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ThemedSelect, { type SelectOption } from "../ThemedSelect";

const FRUIT: SelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
  { value: "date", label: "Date" },
];

function Harness({
  initial = "apple",
  onPick,
  disabled,
}: {
  initial?: string;
  onPick?: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="fruit">Fruit</label>
      <ThemedSelect
        id="fruit"
        value={value}
        options={FRUIT}
        disabled={disabled}
        placeholder="Pick one"
        onChange={(next) => {
          onPick?.(next);
          setValue(next);
        }}
      />
    </>
  );
}

const box = () => screen.getByRole("combobox", { name: "Fruit" });
const open = () => fireEvent.click(box());
const option = (name: string) => within(screen.getByRole("listbox")).getByRole("option", { name });

describe("ThemedSelect", () => {
  describe("the field", () => {
    it("shows the chosen label with the list closed", () => {
      render(<Harness initial="banana" />);

      expect(box()).toHaveTextContent("Banana");
      expect(box()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("is reached through its label", () => {
      render(<Harness />);

      expect(screen.getByLabelText("Fruit")).toBe(box());
    });

    it("says what to do when nothing matches the value", () => {
      render(<Harness initial="" />);

      expect(box()).toHaveTextContent("Pick one");
    });

    it("does not open when disabled", () => {
      render(<Harness disabled />);

      open();

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("the list", () => {
    it("lists every option, marks the current one, and is drawn outside the form so nothing can clip it", () => {
      render(<Harness initial="banana" />);

      open();

      const options = within(screen.getByRole("listbox")).getAllByRole("option");
      expect(options.map((o) => o.textContent)).toEqual(["Apple", "Banana", "Cherry", "Date"]);
      expect(option("Banana")).toHaveAttribute("aria-selected", "true");
      expect(option("Apple")).toHaveAttribute("aria-selected", "false");
      expect(screen.getByRole("listbox").parentElement).toBe(document.body);
    });

    it("reports a choice, closes, and returns focus to the field", () => {
      const onPick = vi.fn();
      render(<Harness onPick={onPick} />);
      open();

      fireEvent.click(option("Banana"));

      expect(onPick).toHaveBeenCalledWith("banana");
      expect(box()).toHaveTextContent("Banana");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(box());
    });

    it("will not let a disabled option be chosen", () => {
      const onPick = vi.fn();
      render(<Harness onPick={onPick} />);
      open();

      fireEvent.click(option("Cherry"));

      expect(onPick).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(option("Cherry")).toHaveAttribute("aria-disabled", "true");
    });

    it("closes on a tap outside it", () => {
      render(<Harness />);
      open();

      fireEvent.pointerDown(document.body);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("stays open for a tap on its own option", () => {
      render(<Harness />);
      open();

      fireEvent.pointerDown(option("Banana"));

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("keyboard", () => {
    it("opens on ArrowDown with the current option highlighted", () => {
      render(<Harness initial="banana" />);

      fireEvent.keyDown(box(), { key: "ArrowDown" });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(box().getAttribute("aria-activedescendant")).toBe(option("Banana").id);
    });

    it("moves past a disabled option and chooses with Enter", () => {
      const onPick = vi.fn();
      render(<Harness initial="banana" onPick={onPick} />);
      fireEvent.keyDown(box(), { key: "ArrowDown" });

      fireEvent.keyDown(box(), { key: "ArrowDown" });
      expect(box().getAttribute("aria-activedescendant")).toBe(option("Date").id);
      fireEvent.keyDown(box(), { key: "Enter" });

      expect(onPick).toHaveBeenCalledWith("date");
    });

    it("jumps to the ends with Home and End", () => {
      render(<Harness initial="banana" />);
      fireEvent.keyDown(box(), { key: "ArrowDown" });

      fireEvent.keyDown(box(), { key: "End" });
      expect(box().getAttribute("aria-activedescendant")).toBe(option("Date").id);
      fireEvent.keyDown(box(), { key: "Home" });
      expect(box().getAttribute("aria-activedescendant")).toBe(option("Apple").id);
    });

    it("jumps to an option by typing its first letter", () => {
      const onPick = vi.fn();
      render(<Harness onPick={onPick} />);
      fireEvent.keyDown(box(), { key: "ArrowDown" });

      fireEvent.keyDown(box(), { key: "d" });
      fireEvent.keyDown(box(), { key: "Enter" });

      expect(onPick).toHaveBeenCalledWith("date");
    });

    it("closes on Escape and keeps Escape to itself, so a dialog around it does not close too", () => {
      const outer = vi.fn();
      window.addEventListener("keydown", outer);
      render(<Harness />);
      open();

      fireEvent.keyDown(box(), { key: "Escape" });

      window.removeEventListener("keydown", outer);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(outer).not.toHaveBeenCalled();
    });

    it("lets Escape through when the list is already closed", () => {
      const outer = vi.fn();
      window.addEventListener("keydown", outer);
      render(<Harness />);

      fireEvent.keyDown(box(), { key: "Escape" });

      window.removeEventListener("keydown", outer);
      expect(outer).toHaveBeenCalledTimes(1);
    });

    it("closes on Tab so focus can move on", () => {
      render(<Harness />);
      open();

      fireEvent.keyDown(box(), { key: "Tab" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
