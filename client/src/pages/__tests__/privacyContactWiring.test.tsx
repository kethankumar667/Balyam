import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PrivacyPolicyPage from "../PrivacyPolicyPage";
import * as contactModule from "../../lib/privacy/contact";

describe("PrivacyPolicyPage / Privacy Contact Wiring", () => {
  let contactSpy: { mockRestore: () => void } | null = null;

  afterEach(() => {
    if (contactSpy) {
      contactSpy.mockRestore();
      contactSpy = null;
    }
  });

  it("renders honest unconfigured fallback and no mailto link when contact email is null", () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    );

    // If PRIVACY_CONTACT_EMAIL is null, verify honest fallback is rendered
    if (!contactModule.PRIVACY_CONTACT_EMAIL) {
      expect(
        screen.getByText(/A dedicated privacy contact email address has not been configured yet/i)
      ).toBeDefined();

      // Ensure no mailto link is rendered in Section 14
      const mailLinks = screen.queryAllByRole("link").filter((a) =>
        a.getAttribute("href")?.startsWith("mailto:")
      );
      expect(mailLinks).toHaveLength(0);

      // Verify no hardcoded placeholder address appears
      expect(screen.queryByText("privacy@bhalyam.com")).toBeNull();

      // Verify actionable fallback links exist in Section 14
      const section14 = document.getElementById("contact-us");
      expect(section14).not.toBeNull();
      const sectionLinks = section14!.querySelectorAll("a");
      const linkHrefs = Array.from(sectionLinks).map((a) => a.getAttribute("href"));
      expect(linkHrefs).toContain("/settings");
      expect(linkHrefs).toContain("/contact");
    } else {
      // If environment happens to have it configured:
      const mailLink = screen.getByRole("link", { name: contactModule.PRIVACY_CONTACT_EMAIL });
      expect(mailLink.getAttribute("href")).toContain(`mailto:${contactModule.PRIVACY_CONTACT_EMAIL}`);
    }
  });

  it("renders mailto link with configured address and grievance SLA when configured", () => {
    // Dynamically test the configured branch
    const mockEmail = "dpo-audit@bhalyam.org";
    contactSpy = vi.spyOn(contactModule, "PRIVACY_CONTACT_EMAIL", "get").mockReturnValue(mockEmail);

    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    );

    const mailLink = screen.getByRole("link", { name: mockEmail });
    expect(mailLink).toBeDefined();
    expect(mailLink.getAttribute("href")).toBe(`mailto:${mockEmail}?subject=BHALYAM%20privacy%20request`);

    // Verify SLA text
    expect(
      screen.getByText(new RegExp(`within ${contactModule.GRIEVANCE_ACK_DAYS} days`, "i"))
    ).toBeDefined();
    expect(
      screen.getByText(new RegExp(`within ${contactModule.GRIEVANCE_RESOLVE_DAYS} days`, "i"))
    ).toBeDefined();

    // Verify the unconfigured message is NOT shown
    expect(
      screen.queryByText(/A dedicated privacy contact email address has not been configured yet/i)
    ).toBeNull();
  });
});
