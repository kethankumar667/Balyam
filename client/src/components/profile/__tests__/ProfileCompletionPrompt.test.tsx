import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuthStore } from "../../../store/authStore";
import { useRoomStore } from "../../../store/roomStore";
import { fetchProfile, saveProfile } from "../../../lib/supabase/profile";
import { apiFetch } from "../../../lib/playerIdentity";
import ProfileCompletionPrompt, { resetProfilePromptDismissals } from "../ProfileCompletionPrompt";

vi.mock("../../../lib/supabase/profile", () => ({
  fetchProfile: vi.fn(),
  saveProfile: vi.fn(),
}));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiFetch: vi.fn(),
  usePlayerId: () => ({ playerId: "p1", ready: true, kind: "member" as const }),
}));

// The picker has its own tests; here it is a plain field so these tests stay about the flow.
vi.mock("../../BirthdayPicker", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef<HTMLInputElement, { id?: string; value: string; onChange: (v: string) => void }>(
      function BirthdayPickerStub({ id, value, onChange }, ref) {
        return React.createElement("input", {
          ref,
          id,
          value,
          "aria-label": "Date of birth",
          "data-testid": "birthday-picker",
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
        });
      },
    ),
  };
});

const mockFetch = vi.mocked(fetchProfile);
const mockSave = vi.mocked(saveProfile);
const mockApi = vi.mocked(apiFetch);

const AVATAR = "file_0000000084c48208b1f893419d784cf2_1.jpg";
const HAS_BOTH = { displayName: "Asha", avatarId: AVATAR, dob: "1995-04-12" };
const NO_AVATAR = { displayName: "Asha", avatarId: null, dob: "1995-04-12" };
const NO_BIRTHDAY = { displayName: "Asha", avatarId: AVATAR, dob: null };
const NEITHER = { displayName: "Asha", avatarId: null, dob: null };

function signIn(userId = "u1") {
  useAuthStore.setState({ isMember: true, userId });
}

const pickAvatar = () => fireEvent.click(screen.getByRole("radio", { name: "Avatar 1" }));

describe("ProfileCompletionPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProfilePromptDismissals();
    useAuthStore.setState({ isMember: false, userId: null });
    useRoomStore.setState({ avatarId: null });
    mockSave.mockResolvedValue(true);
    mockApi.mockResolvedValue({ ok: true } as Response);
  });

  describe("who sees it", () => {
    it("asks again after signing out and returning to the same account in the same tab", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);
      const first = render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: /not now/i }));
      first.unmount();
      act(() => useAuthStore.setState({ isMember: false, userId: null }));
      act(() => signIn());
      render(<ProfileCompletionPrompt />);
      expect(await screen.findByRole("dialog", { name: /when's your birthday/i })).toBeInTheDocument();
    });

    it("shows nothing to a guest, and never reads a profile for one", () => {
      const { container } = render(<ProfileCompletionPrompt />);

      expect(container).toBeEmptyDOMElement();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("stays away from a member who has both an avatar and a birthday", async () => {
      signIn();
      mockFetch.mockResolvedValue(HAS_BOTH);

      render(<ProfileCompletionPrompt />);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("u1"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("stays away when the profile could not be read, rather than asking blind", async () => {
      signIn();
      mockFetch.mockResolvedValue(null);

      render(<ProfileCompletionPrompt />);

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("avatar step", () => {
    it("offers the app's own avatars to a member with none, and asks nothing else when the birthday is known", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_AVATAR);

      render(<ProfileCompletionPrompt />);

      expect(await screen.findByRole("dialog", { name: /choose your avatar/i })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: /choose an avatar/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/date of birth/i)).not.toBeInTheDocument();
    });

    it("cannot continue until an avatar is chosen", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_AVATAR);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      expect(screen.getByRole("button", { name: /continue|save/i })).toBeDisabled();
      pickAvatar();
      expect(screen.getByRole("button", { name: /continue|save/i })).toBeEnabled();
    });

    it("saves the chosen avatar to the profile and the device, tells the server, and closes", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_AVATAR);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      pickAvatar();
      fireEvent.click(screen.getByRole("button", { name: /continue|save/i }));

      await waitFor(() => expect(mockSave).toHaveBeenCalledWith("u1", { avatarId: AVATAR }));
      expect(useRoomStore.getState().avatarId).toBe(AVATAR);
      await waitFor(() =>
        expect(mockApi).toHaveBeenCalledWith(
          "/api/profile/p1",
          expect.objectContaining({ method: "PUT", body: JSON.stringify({ avatar: AVATAR }) }),
        ),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("still succeeds when only the leaderboard copy on the server could not be updated", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_AVATAR);
      mockApi.mockRejectedValue(new Error("offline"));
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      pickAvatar();
      fireEvent.click(screen.getByRole("button", { name: /continue|save/i }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(useRoomStore.getState().avatarId).toBe(AVATAR);
    });

    it("keeps the dialog open, with the choice kept, when the profile could not be saved", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_AVATAR);
      mockSave.mockResolvedValue(false);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      pickAvatar();
      fireEvent.click(screen.getByRole("button", { name: /continue|save/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(useRoomStore.getState().avatarId).toBeNull();
    });
  });

  describe("birthday step", () => {
    it("asks a member with no birthday, and says what it is for", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);

      render(<ProfileCompletionPrompt />);

      expect(await screen.findByRole("dialog", { name: /when's your birthday/i })).toBeInTheDocument();
      expect(screen.getByText(/birthday wishes/i)).toBeInTheDocument();
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    });

    it("saves only the birthday when gender is left blank, then closes", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1995-04-12" } });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(mockSave).toHaveBeenCalledWith("u1", { dob: "1995-04-12" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("saves gender too when the member chooses one", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1995-04-12" } });
      fireEvent.click(screen.getByRole("combobox", { name: /gender/i }));
      fireEvent.click(screen.getByRole("option", { name: "Female" }));
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(mockSave).toHaveBeenCalledWith("u1", { dob: "1995-04-12", gender: "Female" }));
    });

    it("offers gender as a themed list with every choice and 'Prefer not to say' first", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      expect(screen.getByRole("combobox", { name: /gender/i })).toHaveTextContent("Prefer not to say");
      fireEvent.click(screen.getByRole("combobox", { name: /gender/i }));

      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Prefer not to say",
        "Male",
        "Female",
        "Other",
      ]);
      expect(document.querySelector("select")).toBeNull();
    });

    it("uses the birthday picker, not the browser's own date field", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);

      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      expect(screen.getByTestId("birthday-picker")).toBeInTheDocument();
      expect(document.querySelector('input[type="date"]')).toBeNull();
    });

    it("accepts today's date in the early hours, when UTC still says yesterday", async () => {
      // Half past midnight on 12 October in India: the local calendar says the 12th while
      // UTC (what `toISOString` reports) is still the 11th. Comparing against the UTC date
      // wrongly rejected a birthday picked today as "in the future".
      vi.setSystemTime(new Date(2026, 9, 12, 0, 30));
      const utcSaysYesterday = vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-10-11T19:00:00.000Z");
      try {
        signIn();
        mockFetch.mockResolvedValue(NO_BIRTHDAY);
        render(<ProfileCompletionPrompt />);
        await screen.findByRole("dialog");

        fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "2026-10-12" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() => expect(mockSave).toHaveBeenCalledWith("u1", { dob: "2026-10-12" }));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      } finally {
        utcSaysYesterday.mockRestore();
        vi.useRealTimers();
      }
    });

    it("refuses a missing date and does not save", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/date of birth/i);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("keeps the dialog open and says so when saving fails", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_BIRTHDAY);
      mockSave.mockResolvedValue(false);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1995-04-12" } });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("both missing", () => {
    it("asks the birthday and gender first, then the avatar, and each save is its own write", async () => {
      signIn();
      mockFetch.mockResolvedValue(NEITHER);
      render(<ProfileCompletionPrompt />);
      expect(await screen.findByRole("dialog", { name: /when's your birthday/i })).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1995-04-12" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      expect(await screen.findByRole("dialog", { name: /choose your avatar/i })).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 2/i)).toBeInTheDocument();
      expect(mockSave).toHaveBeenCalledWith("u1", { dob: "1995-04-12" });

      pickAvatar();
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(mockSave).toHaveBeenCalledWith("u1", { avatarId: AVATAR }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("stays on the birthday step, with an error, when it could not be saved", async () => {
      signIn();
      mockFetch.mockResolvedValue(NEITHER);
      mockSave.mockResolvedValueOnce(false);
      render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog", { name: /when's your birthday/i });

      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1995-04-12" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
      expect(screen.getByRole("dialog", { name: /when's your birthday/i })).toBeInTheDocument();
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    });
  });

  describe("Not now", () => {
    it("closes without saving, and does not nag again in the same visit", async () => {
      signIn();
      mockFetch.mockResolvedValue(NEITHER);
      const first = render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");

      fireEvent.click(screen.getByRole("button", { name: /not now/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockSave).not.toHaveBeenCalled();

      // The layout re-mounts on navigation; the dismissal has to outlive that.
      first.unmount();
      render(<ProfileCompletionPrompt />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // The welcome popup waits for this signal: the order is privacy, then these questions, then the welcome.
  describe("telling the welcome it is done", () => {
    it("reports done at once when there is nothing to ask", async () => {
      signIn();
      mockFetch.mockResolvedValue(HAS_BOTH);
      const onFinished = vi.fn();

      render(<ProfileCompletionPrompt onFinished={onFinished} />);

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    });

    it("does not hold the welcome back when the profile could not be read", async () => {
      signIn();
      mockFetch.mockResolvedValue(null);
      const onFinished = vi.fn();

      render(<ProfileCompletionPrompt onFinished={onFinished} />);

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("stays quiet while the member is still being asked", async () => {
      signIn();
      mockFetch.mockResolvedValue(NEITHER);
      const onFinished = vi.fn();

      render(<ProfileCompletionPrompt onFinished={onFinished} />);
      await screen.findByRole("dialog");

      expect(onFinished).not.toHaveBeenCalled();
    });

    it("reports done once the last step is saved, and only once", async () => {
      signIn();
      mockFetch.mockResolvedValue(NO_AVATAR);
      const onFinished = vi.fn();
      render(<ProfileCompletionPrompt onFinished={onFinished} />);
      await screen.findByRole("dialog");

      pickAvatar();
      fireEvent.click(screen.getByRole("button", { name: /continue|save/i }));

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("reports done when the member chooses Not now", async () => {
      signIn();
      mockFetch.mockResolvedValue(NEITHER);
      const onFinished = vi.fn();
      render(<ProfileCompletionPrompt onFinished={onFinished} />);
      await screen.findByRole("dialog");

      fireEvent.click(screen.getByRole("button", { name: /not now/i }));

      expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it("reports done straight away to a member who already chose Not now this visit", async () => {
      signIn();
      mockFetch.mockResolvedValue(NEITHER);
      const first = render(<ProfileCompletionPrompt />);
      await screen.findByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: /not now/i }));
      first.unmount();

      const onFinished = vi.fn();
      render(<ProfileCompletionPrompt onFinished={onFinished} />);

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    });

    it("says nothing for a guest", () => {
      const onFinished = vi.fn();

      render(<ProfileCompletionPrompt onFinished={onFinished} />);

      expect(onFinished).not.toHaveBeenCalled();
    });
  });
});
