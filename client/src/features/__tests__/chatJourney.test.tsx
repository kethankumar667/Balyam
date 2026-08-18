import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Chat from "../../components/Chat";
import type { ChatMessage } from "@shared/types";

// Mock socket
const mockEmit = vi.fn();
vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
  }),
}));

describe("Priority 3: In-Room Chat & Composer User Journey", () => {
  const mockMessages: ChatMessage[] = [
    {
      id: "msg_1",
      playerId: "p_other",
      playerName: "Bob",
      text: "Namaste! Welcome to Bhalyam 🎲",
      createdAt: 1700000000000,
    } as any,
    {
      id: "msg_2",
      playerId: "p_me",
      playerName: "Alice",
      text: "Shandar khel! Let's roll 🔥",
      createdAt: 1700000010000,
    } as any,
  ];

  beforeEach(() => {
    mockEmit.mockClear();
  });

  describe("1. Message History & Layout Rendering", () => {
    it("renders message bubbles with distinct sender names, timestamps, and text", () => {
      render(<Chat messages={mockMessages} selfId="p_me" showHeader={true} />);

      expect(screen.getByRole("heading", { name: /Chat/i })).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
      expect(screen.getByText("Namaste! Welcome to Bhalyam 🎲")).toBeDefined();
      expect(screen.getByText("You")).toBeDefined();
      expect(screen.getByText("Shandar khel! Let's roll 🔥")).toBeDefined();
    });

    it("declares aria-live='polite' on messages history for screen readers", () => {
      render(<Chat messages={mockMessages} selfId="p_me" />);

      const historyContainer = screen.getByLabelText("Chat messages history");
      expect(historyContainer.getAttribute("aria-live")).toBe("polite");
      expect(historyContainer.getAttribute("aria-atomic")).toBe("false");
    });
  });

  describe("2. Composer Input & Edge Cases", () => {
    it("sends message on form submit and clears input", () => {
      render(<Chat messages={mockMessages} selfId="p_me" />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendBtn = screen.getByRole("button", { name: "Send message" });

      fireEvent.change(input, { target: { value: "Super move! ₹500" } });
      fireEvent.click(sendBtn);

      expect(mockEmit).toHaveBeenCalledWith("chat:send", { text: "Super move! ₹500" });
      expect((input as HTMLInputElement).value).toBe("");
    });

    it("prevents submitting empty or whitespace-only messages", () => {
      render(<Chat messages={mockMessages} selfId="p_me" />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendBtn = screen.getByRole("button", { name: "Send message" });

      fireEvent.change(input, { target: { value: "    " } });
      expect(sendBtn.hasAttribute("disabled")).toBe(true);

      fireEvent.click(sendBtn);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it("displays character count badge when approaching the 500-char limit", () => {
      render(<Chat messages={mockMessages} selfId="p_me" />);

      const input = screen.getByPlaceholderText("Type a message...");

      // Type 425 characters
      const longText = "A".repeat(425);
      fireEvent.change(input, { target: { value: longText } });

      expect(screen.getByText("425/500")).toBeDefined();
    });

    it("handles multilingual and Unicode text safely", () => {
      render(<Chat messages={mockMessages} selfId="p_me" />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendBtn = screen.getByRole("button", { name: "Send message" });

      const unicodeText = "శుభోదయం! नमस्ते! 🚀🌟🎲";
      fireEvent.change(input, { target: { value: unicodeText } });
      fireEvent.click(sendBtn);

      expect(mockEmit).toHaveBeenCalledWith("chat:send", { text: unicodeText });
    });
  });

  describe("3. Quick Reply Chips", () => {
    it("sends preset message immediately when quick reply chip is clicked", () => {
      render(<Chat messages={mockMessages} selfId="p_me" />);

      const quickChip = screen.getByRole("button", { name: "Nice move! 👏" });
      fireEvent.click(quickChip);

      expect(mockEmit).toHaveBeenCalledWith("chat:send", { text: "Nice move! 👏" });
    });
  });
});
