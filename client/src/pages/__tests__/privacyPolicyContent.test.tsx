import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PrivacyPolicyPage from "../PrivacyPolicyPage";
import { THIRD_PARTIES, buildDataExport } from "../../lib/privacy/dataInventory";

vi.mock("../../lib/privacy/dataInventory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/privacy/dataInventory")>();
  return { ...actual, buildDataExport: vi.fn(actual.buildDataExport) };
});

function renderPage() {
  return render(
    <BrowserRouter>
      <PrivacyPolicyPage />
    </BrowserRouter>,
  );
}

const section = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`section ${id} is missing`);
  return within(el);
};

describe("PrivacyPolicyPage content", () => {
  describe("Google sign-in and the data we ask for", () => {
    it("says what Google gives us and what we do with it", () => {
      renderPage();

      const collect = section("info-we-collect");
      expect(collect.getByText(/Google shares your name and email address with us/i)).toBeInTheDocument();
      expect(collect.getByText(/never sell this information or use it for advertising/i)).toBeInTheDocument();
    });

    it("is straight about the profile-photo link Google sends, which we keep but never use", () => {
      renderPage();

      const collect = section("info-we-collect");
      expect(collect.getByText(/link to your profile photo/i)).toBeInTheDocument();
      expect(collect.getByText(/we do not display or use it/i)).toBeInTheDocument();
    });

    it("gives the one reason for asking a birthday, and says gender is optional", () => {
      renderPage();

      const collect = section("info-we-collect");
      expect(collect.getByText(/only so the Bhalyam group can send you a birthday greeting/i)).toBeInTheDocument();
      expect(collect.getByText(/gender is optional/i)).toBeInTheDocument();
    });

    it("tells people their chat and Mandali messages are kept, and for how long", () => {
      renderPage();

      expect(section("info-we-collect").getByText(/Mandali/i)).toBeInTheDocument();
      expect(section("data-retention").getByText(/chat messages are removed after one year/i)).toBeInTheDocument();
    });
  });

  describe("what the page claims about itself", () => {
    it("names the address the app really lives at, not one we do not own", () => {
      renderPage();

      expect(section("who-we-are").getByText(/bhalyam\.onrender\.com/i)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/bhalyam\.app/i);
    });

    it("carries a real effective date and no invented statistics", () => {
      renderPage();

      expect(screen.getByText(/EFFECTIVE: OCTOBER 27, 2026/i)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/2,400 words|min read/i);
    });

    it("discloses deliberate referrals, counts-only sharing, and actual retention", () => {
      renderPage();
      expect(section("info-we-collect").getByText(/Only when you accept an invitation/i)).toBeInTheDocument();
      expect(section("info-we-collect").getByText(/never your email or private match details/i)).toBeInTheDocument();
      expect(section("data-retention").getByText(/within 30 days.*remain with the account until deletion/i)).toBeInTheDocument();
    });

    it("spells its own heading correctly", () => {
      renderPage();

      expect(document.body.textContent).not.toMatch(/Sovereignity/);
    });

    it("discloses private Supabase recovery snapshots, expiry and delayed cleanup while hosting is asleep", () => {
      renderPage();
      expect(section("data-retention").getByText(/recovery snapshots.*Supabase/i)).toBeInTheDocument();
      expect(section("data-retention").getByText(/two hours after their last save/i)).toBeInTheDocument();
      expect(section("data-retention").getByText(/cleanup resumes when the server is running/i)).toBeInTheDocument();
      expect(THIRD_PARTIES.find((party) => party.name.startsWith("Supabase"))?.when).toMatch(/guests and members/i);
    });

    it("does not claim certifications on behalf of its providers", () => {
      renderPage();

      expect(document.body.textContent).not.toMatch(/SOC-2/i);
    });
  });

  describe("who receives data", () => {
    it("lists every recipient the privacy inventory declares, so the two cannot drift apart", () => {
      renderPage();

      const share = section("how-we-share");
      for (const party of THIRD_PARTIES) {
        expect(share.getByText(party.name)).toBeInTheDocument();
      }
    });

    it("includes Google sign-in among them", () => {
      expect(THIRD_PARTIES.some((p) => /sign in with google/i.test(p.name))).toBe(true);
    });
  });

  describe("deleting an account, honestly", () => {
    it("says what goes and that anonymous coin records stay", () => {
      renderPage();

      const deletion = section("data-deletion");
      expect(deletion.getByText(/anonymous coin records are kept/i)).toBeInTheDocument();
      expect(deletion.getByRole("link", { name: /security & data/i })).toHaveAttribute("href", "/settings/security");
    });

    it("no longer promises an instant purge of everything", () => {
      renderPage();

      expect(document.body.textContent).not.toMatch(/instant account purge|purge your entire/i);
    });

    it("says an unused guest is removed after about a week", () => {
      renderPage();

      expect(section("data-retention").getByText(/about a week/i)).toBeInTheDocument();
    });
  });

  describe("the data export button", () => {
    let click: { mockRestore: () => void };

    beforeEach(() => {
      vi.mocked(buildDataExport).mockClear();
      URL.createObjectURL = vi.fn(() => "blob:test");
      URL.revokeObjectURL = vi.fn();
      click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    });

    afterEach(() => {
      click.mockRestore();
    });

    it("downloads the real export of what this device holds, not a made-up stub", () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

      expect(buildDataExport).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalled();
    });

    it("never writes placeholder people into the file", async () => {
      renderPage();
      let written = Promise.resolve("");
      URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
        written = (blob as Blob).text();
        return "blob:test";
      });

      fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

      expect(await written).not.toMatch(/Veranda Guest|guest_player/);
    });
  });

  describe("the summary cards", () => {
    it("describe the controls as they really work", () => {
      renderPage();

      expect(screen.queryByText(/one-click complete profile data export/i)).not.toBeInTheDocument();
      expect(screen.getByText(/download the data held about you/i)).toBeInTheDocument();
      expect(screen.getByText(/delete your account any time/i)).toBeInTheDocument();
    });
  });
});
