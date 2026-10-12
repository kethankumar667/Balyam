import { describe, it, expect } from "vitest";
import { defaultBirthMonth, formatBirthday, fromIsoDate, toIsoDate } from "../isoDate";

describe("toIsoDate", () => {
  it("writes a local date as YYYY-MM-DD, padded", () => {
    expect(toIsoDate(new Date(1995, 3, 12))).toBe("1995-04-12");
    expect(toIsoDate(new Date(2003, 0, 2))).toBe("2003-01-02");
  });

  it("keeps the calendar day the person picked, whatever the timezone", () => {
    // Local midnight. `toISOString()` would shift this to the previous UTC day in any
    // timezone east of Greenwich — including India — and save the wrong birthday.
    const picked = new Date(2000, 11, 31, 0, 0, 0);
    expect(toIsoDate(picked)).toBe("2000-12-31");
  });
});

describe("fromIsoDate", () => {
  it("reads YYYY-MM-DD back as that local calendar day", () => {
    const parsed = fromIsoDate("1995-04-12");

    expect(parsed?.getFullYear()).toBe(1995);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(12);
  });

  it("round-trips with toIsoDate", () => {
    expect(toIsoDate(fromIsoDate("2011-09-30") as Date)).toBe("2011-09-30");
  });

  it.each(["", "garbage", "1995-4-2", "12-04-1995", "1995/04/12", "1995-04-12T00:00:00Z"])(
    "rejects %j rather than guessing",
    (input) => expect(fromIsoDate(input)).toBeUndefined(),
  );

  it.each(["2023-02-31", "1995-13-01", "1995-00-10", "1995-04-00", "2023-02-29"])(
    "rejects the impossible date %s instead of rolling it over to another day",
    (input) => expect(fromIsoDate(input)).toBeUndefined(),
  );

  it("accepts a real leap day", () => {
    expect(fromIsoDate("2024-02-29")).toBeInstanceOf(Date);
  });
});

describe("defaultBirthMonth", () => {
  it("opens the calendar on a grown-up year, not on today", () => {
    const month = defaultBirthMonth(new Date(2026, 9, 12));

    expect(month.getFullYear()).toBe(2001);
    expect(month.getMonth()).toBe(0);
    expect(month.getDate()).toBe(1);
  });

  it("can start somewhere else", () => {
    expect(defaultBirthMonth(new Date(2026, 9, 12), 40).getFullYear()).toBe(1986);
  });
});

describe("formatBirthday", () => {
  it("writes the day, the month in words and the year", () => {
    expect(formatBirthday(new Date(1995, 3, 12))).toBe("12 April 1995");
    expect(formatBirthday(new Date(2003, 0, 2))).toBe("2 January 2003");
  });
});
