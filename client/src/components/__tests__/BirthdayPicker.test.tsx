import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import BirthdayPicker from "../BirthdayPicker";

const TODAY = new Date(2026, 9, 12); // 12 October 2026

function Harness({
  initial = "",
  onPick,
  ...rest
}: {
  initial?: string;
  onPick?: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="dob">Date of birth</label>
      <BirthdayPicker
        id="dob"
        value={value}
        today={TODAY}
        onChange={(next) => {
          onPick?.(next);
          setValue(next);
        }}
        {...rest}
      />
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: /date of birth/i });
const open = () => fireEvent.click(trigger());
// The month and year lists are `ThemedSelect` comboboxes, not the browser's own selects.
const yearSelect = () => screen.getByRole("combobox", { name: "Choose the Year" });
const monthSelect = () => screen.getByRole("combobox", { name: "Choose the Month" });
/** Opens a month or year list and taps one entry — the way a person does it. */
const choose = (select: HTMLElement, option: string) => {
  fireEvent.click(select);
  fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: option }));
};
const day = (n: number) => {
  const found = within(screen.getByRole("grid"))
    .getAllByRole("button")
    .find((button) => button.textContent === String(n));
  if (!found) throw new Error(`no day ${n} in the calendar`);
  return found as HTMLButtonElement;
};

describe("BirthdayPicker", () => {
  describe("the field", () => {
    it("invites a choice when empty", () => {
      render(<Harness />);

      expect(trigger()).toHaveTextContent("Select your birthday");
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("shows a chosen birthday in words", () => {
      render(<Harness initial="1995-04-12" />);

      expect(trigger()).toHaveTextContent("12 April 1995");
    });

    it("is reached through its label", () => {
      render(<Harness />);

      expect(screen.getByLabelText(/date of birth/i)).toBe(trigger());
    });

    it("announces its current value and passes on any description it is given", () => {
      render(<Harness initial="1995-04-12" describedBy="dob-help" invalid />);

      expect(trigger()).toHaveAttribute("aria-invalid", "true");
      expect(trigger().getAttribute("aria-describedby")).toContain("dob-help");
      const valueId = trigger().getAttribute("aria-describedby")?.split(" ").find((id) => id !== "dob-help");
      expect(document.getElementById(valueId as string)).toHaveTextContent("12 April 1995");
    });
  });

  describe("opening it", () => {
    it("opens a calendar with month and year dropdowns, and closes again", () => {
      render(<Harness />);

      open();
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(monthSelect()).toBeInTheDocument();
      expect(yearSelect()).toBeInTheDocument();

      open();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("starts a new birthday on a grown-up year instead of this month", () => {
      render(<Harness />);

      open();

      expect(yearSelect()).toHaveTextContent("2001");
      expect(monthSelect()).toHaveTextContent("January");
    });

    it("starts on the month of a birthday already chosen", () => {
      render(<Harness initial="1995-04-12" />);

      open();

      expect(yearSelect()).toHaveTextContent("1995");
      expect(monthSelect()).toHaveTextContent("April");
    });

    it("puts the keyboard inside the calendar", () => {
      render(<Harness />);

      open();

      expect(screen.getByRole("grid").contains(document.activeElement)).toBe(true);
    });
  });

  describe("choosing a day", () => {
    it("reaches a birthday in a few taps through the dropdowns", () => {
      const onPick = vi.fn();
      render(<Harness onPick={onPick} />);

      open();
      choose(yearSelect(), "1995");
      choose(monthSelect(), "April");
      fireEvent.click(day(12));

      expect(onPick).toHaveBeenCalledWith("1995-04-12");
      expect(trigger()).toHaveTextContent("12 April 1995");
    });

    it("saves the day that was tapped, not the one before it", () => {
      const onPick = vi.fn();
      render(<Harness onPick={onPick} />);

      open();
      choose(yearSelect(), "2000");
      choose(monthSelect(), "December");
      fireEvent.click(day(31));

      expect(onPick).toHaveBeenCalledWith("2000-12-31");
    });

    it("closes the calendar and returns to the field once a day is chosen", () => {
      render(<Harness />);
      open();

      fireEvent.click(day(15));

      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger());
    });
  });

  describe("the month and year lists", () => {
    it("lists all twelve months in words, with the current one marked", () => {
      render(<Harness initial="1995-04-12" />);
      open();

      fireEvent.click(monthSelect());
      const months = within(screen.getByRole("listbox")).getAllByRole("option");

      expect(months).toHaveLength(12);
      expect(months[0]).toHaveTextContent("January");
      expect(months[11]).toHaveTextContent("December");
      expect(screen.getByRole("option", { name: "April" })).toHaveAttribute("aria-selected", "true");
    });

    it("closes the list, not the calendar, on Escape", () => {
      render(<Harness />);
      open();

      fireEvent.click(yearSelect());
      fireEvent.keyDown(yearSelect(), { key: "Escape" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    it("can be driven from the keyboard", () => {
      render(<Harness initial="1995-04-12" />);
      open();

      fireEvent.keyDown(yearSelect(), { key: "ArrowDown" });
      fireEvent.keyDown(yearSelect(), { key: "ArrowDown" });
      fireEvent.keyDown(yearSelect(), { key: "Enter" });

      expect(yearSelect()).toHaveTextContent("1996");
    });
  });

  describe("limits", () => {
    it("offers years from 1920 up to this year, and no further", () => {
      render(<Harness />);
      open();

      fireEvent.click(yearSelect());
      const years = within(screen.getByRole("listbox"))
        .getAllByRole("option")
        .map((option) => option.textContent);

      expect(years[0]).toBe("1920");
      expect(years[years.length - 1]).toBe("2026");
      expect(years).not.toContain("1919");
      expect(years).not.toContain("2027");
    });

    it("will not let a birthday be in the future", () => {
      render(<Harness />);
      open();
      choose(yearSelect(), "2026");
      choose(monthSelect(), "October");

      expect(day(12)).toBeEnabled();
      expect(day(13)).toBeDisabled();
      expect(day(31)).toBeDisabled();
    });
  });

  describe("keyboard", () => {
    it("closes the calendar on Escape and returns to the field", () => {
      render(<Harness />);
      open();

      fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });

      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger());
    });

    it("keeps Escape to itself, so a dialog around it does not close too", () => {
      const outer = vi.fn();
      window.addEventListener("keydown", outer);
      render(<Harness />);
      open();

      fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });

      window.removeEventListener("keydown", outer);
      expect(outer).not.toHaveBeenCalled();
    });

    it("lets Escape through when the calendar is already closed", () => {
      const outer = vi.fn();
      window.addEventListener("keydown", outer);
      render(<Harness />);

      fireEvent.keyDown(trigger(), { key: "Escape" });

      window.removeEventListener("keydown", outer);
      expect(outer).toHaveBeenCalledTimes(1);
    });
  });
});
