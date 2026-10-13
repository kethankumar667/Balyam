import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TermsOfServicePage from "../TermsOfServicePage";
import PrivacyPolicyPage from "../PrivacyPolicyPage";
import { MINORS_NOTICE } from "../../lib/privacy/agePolicy";

const renderTerms = () =>
  render(
    <BrowserRouter>
      <TermsOfServicePage />
    </BrowserRouter>,
  );

describe("Terms of Service — coins and age", () => {
  it("defines coins as free, valueless and not redeemable", () => {
    const { container } = renderTerms();
    const text = container.textContent ?? "";
    expect(text).toMatch(/Virtual Coins, Room Entries & Rewards/);
    expect(text).toMatch(/no cash or monetary value/i);
    expect(text).toMatch(/cannot be withdrawn, redeemed or exchanged/i);
    expect(text).toMatch(/does not sell coins/i);
    expect(text).toMatch(/Buying, selling, trading, auctioning or lending coins/i);
  });

  it("no longer claims there are zero stakes while the product has a Room Entry", () => {
    const { container } = renderTerms();
    expect(container.textContent ?? "").not.toMatch(/zero financial stakes|zero entry fees/i);
  });

  it("states the under-18 rule from one shared sentence", () => {
    const { container } = renderTerms();
    expect(container.textContent ?? "").toContain(MINORS_NOTICE);
  });

  it("states the same under-18 rule on the Privacy Policy and never says under 13", () => {
    const { container } = render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>,
    );
    const text = container.textContent ?? "";
    expect(text).toContain(MINORS_NOTICE);
    expect(text).not.toMatch(/under 13/i);
  });
});
