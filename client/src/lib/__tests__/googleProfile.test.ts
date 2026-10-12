import { describe, it, expect } from "vitest";
import { splitFullName, namesFromMetadata, needsBirthday, needsAvatar, missingProfileFields } from "../googleProfile";

describe("splitFullName", () => {
  it("splits a two-word name into first and last", () => {
    expect(splitFullName("Kethankumar Gontla")).toEqual({ firstName: "Kethankumar", lastName: "Gontla" });
  });

  it("keeps everything after the first word as the last name", () => {
    expect(splitFullName("Mary Jane Watson")).toEqual({ firstName: "Mary", lastName: "Jane Watson" });
  });

  it("returns an empty last name for a single word", () => {
    expect(splitFullName("Kethan")).toEqual({ firstName: "Kethan", lastName: "" });
  });

  it("collapses stray whitespace", () => {
    expect(splitFullName("  Kethan   Kumar  ")).toEqual({ firstName: "Kethan", lastName: "Kumar" });
  });

  it("returns empty names for empty or non-string input", () => {
    expect(splitFullName("")).toEqual({ firstName: "", lastName: "" });
    expect(splitFullName(undefined)).toEqual({ firstName: "", lastName: "" });
    expect(splitFullName(42 as unknown)).toEqual({ firstName: "", lastName: "" });
  });
});

describe("namesFromMetadata", () => {
  it("prefers the email sign-up form's own first_name and last_name", () => {
    const meta = { first_name: "Asha", last_name: "Rao", full_name: "Someone Else" };
    expect(namesFromMetadata(meta)).toEqual({ firstName: "Asha", lastName: "Rao" });
  });

  it("uses Google's given_name and family_name when present", () => {
    const meta = { given_name: "Kethan", family_name: "Kumar", full_name: "Ignored Name" };
    expect(namesFromMetadata(meta)).toEqual({ firstName: "Kethan", lastName: "Kumar" });
  });

  it("falls back to splitting full_name, then name", () => {
    expect(namesFromMetadata({ full_name: "Kethankumar Gontla" })).toEqual({
      firstName: "Kethankumar",
      lastName: "Gontla",
    });
    expect(namesFromMetadata({ name: "Priya Nair" })).toEqual({ firstName: "Priya", lastName: "Nair" });
  });

  it("returns empty names for missing or malformed metadata", () => {
    expect(namesFromMetadata(null)).toEqual({ firstName: "", lastName: "" });
    expect(namesFromMetadata(undefined)).toEqual({ firstName: "", lastName: "" });
    expect(namesFromMetadata({ full_name: 7 })).toEqual({ firstName: "", lastName: "" });
  });
});

describe("missingProfileFields", () => {
  const makeId = (dob?: string | null) => `ID-${dob ?? "none"}`;

  it("fills names from Google metadata and generates the Bhalyam ID for an empty row", () => {
    const fill = missingProfileFields({ firstName: null, lastName: null, accountId: null, dob: null }, { full_name: "Kethankumar Gontla" }, makeId);
    expect(fill).toEqual({ firstName: "Kethankumar", lastName: "Gontla", accountId: "ID-none" });
  });

  it("never overwrites a value the row already has", () => {
    const fill = missingProfileFields(
      { firstName: "Asha", lastName: "Rao", accountId: "BHYM-90S-1234-56", dob: "1995-04-12" },
      { full_name: "Someone Else" },
      makeId,
    );
    expect(fill).toEqual({});
  });

  it("only fills the fields that are empty", () => {
    const fill = missingProfileFields({ firstName: "Asha", lastName: "", accountId: "BHYM-90S-1234-56" }, { full_name: "Asha Rao" }, makeId);
    expect(fill).toEqual({ lastName: "Rao" });
  });

  it("uses the stored date of birth for the ID's era tag", () => {
    const fill = missingProfileFields({ firstName: "A", lastName: "B", accountId: null, dob: "2003-01-02" }, null, makeId);
    expect(fill).toEqual({ accountId: "ID-2003-01-02" });
  });

  it("skips names it cannot derive instead of writing empty strings", () => {
    const fill = missingProfileFields({ firstName: null, lastName: null, accountId: "X" }, null, makeId);
    expect(fill).toEqual({});
  });
});

describe("needsAvatar", () => {
  const known = "file_0000000084c48208b1f893419d784cf2_1.jpg";

  it("is true when there is no avatar", () => {
    expect(needsAvatar({ avatarId: null })).toBe(true);
    expect(needsAvatar({ avatarId: "" })).toBe(true);
    expect(needsAvatar({})).toBe(true);
  });

  it("is true for an id that is not in the app's own list, such as an off-site URL", () => {
    expect(needsAvatar({ avatarId: "https://lh3.googleusercontent.com/a/photo" })).toBe(true);
    expect(needsAvatar({ avatarId: "../../secret.jpg" })).toBe(true);
  });

  it("is false for an avatar from the app's own list", () => {
    expect(needsAvatar({ avatarId: known })).toBe(false);
  });
});

describe("needsBirthday", () => {
  it("is true when there is no date of birth", () => {
    expect(needsBirthday({ dob: null })).toBe(true);
    expect(needsBirthday({ dob: "" })).toBe(true);
    expect(needsBirthday({})).toBe(true);
  });

  it("is false once a date of birth exists", () => {
    expect(needsBirthday({ dob: "1995-04-12" })).toBe(false);
  });
});
