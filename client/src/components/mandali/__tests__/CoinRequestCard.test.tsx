import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { MandaliCoinRequest, MandaliMember, MandaliMessage } from "@shared/mandali/types.js";
import CoinRequestCard from "../CoinRequestCard";

/**
 * A coin request is posted to the whole group. Anyone in the Mandali except
 * the person asking can pay it, not only the member it happened to be
 * addressed to, and once it is paid everyone sees who covered it.
 */

const REQUESTER = "p_senthil";
const ADDRESSED_TO = "p_kethan";
const BYSTANDER = "p_geetha";

const member = (playerId: string, displayName: string, state: MandaliMember["state"] = "ACTIVE") =>
  ({ playerId, displayName, state }) as MandaliMember;

const members = [member(REQUESTER, "Senthil"), member(ADDRESSED_TO, "Kethan"), member(BYSTANDER, "Geetha")];

const message = { messageId: "cr_1_card", kind: "COIN_REQUEST", content: "Requested 100 coins" } as MandaliMessage;

const request = (over: Partial<MandaliCoinRequest> = {}): MandaliCoinRequest => ({
  id: "cr_1",
  mandaliId: "m1",
  messageId: "cr_1_card",
  requesterIdentityId: REQUESTER,
  payerIdentityId: ADDRESSED_TO,
  fundedByIdentityId: null,
  amount: 100,
  status: "OPEN",
  expiresAt: Date.now() + 60_000,
  createdAt: Date.now(),
  decidedAt: null,
  ...over,
});

function renderCard(selfId: string, over: Partial<MandaliCoinRequest> = {}, list = members) {
  const onPay = vi.fn(async () => ({ success: true }));
  render(<CoinRequestCard message={message} request={request(over)} selfId={selfId} members={list} onPay={onPay} />);
  return { onPay };
}

const payButton = () => screen.queryByRole("button", { name: /pay 100 coins to senthil/i });

afterEach(cleanup);

describe("CoinRequestCard", () => {
  it("lets a member who was not the one addressed pay the request", async () => {
    const { onPay } = renderCard(BYSTANDER);
    const button = payButton();
    expect(button).not.toBeNull();
    fireEvent.click(button as HTMLElement);
    await waitFor(() => expect(onPay).toHaveBeenCalledWith("cr_1"));
  });

  it("still lets the addressed member pay", () => {
    renderCard(ADDRESSED_TO);
    expect(payButton()).not.toBeNull();
  });

  it("never offers the requester a way to pay themselves", () => {
    renderCard(REQUESTER);
    expect(payButton()).toBeNull();
    expect(screen.getByText(/waiting for someone in the group to pay/i)).toBeDefined();
  });

  it("does not offer payment to someone who has left the group", () => {
    renderCard(BYSTANDER, {}, [member(REQUESTER, "Senthil"), member(BYSTANDER, "Geetha", "LEFT")]);
    expect(payButton()).toBeNull();
  });

  it("names whoever actually paid once it is settled", () => {
    renderCard(ADDRESSED_TO, { status: "FUNDED", fundedByIdentityId: BYSTANDER });
    expect(payButton()).toBeNull();
    expect(screen.getByText("Paid by Geetha")).toBeDefined();
  });

  it("falls back to the addressed member for requests paid before the payer was recorded", () => {
    renderCard(BYSTANDER, { status: "FUNDED", fundedByIdentityId: null });
    expect(screen.getByText("Paid by Kethan")).toBeDefined();
  });

  it("says when someone else got there first", async () => {
    const onPay = vi.fn(async () => ({ success: false, error: "Someone in the group has already paid this request." }));
    render(<CoinRequestCard message={message} request={request()} selfId={BYSTANDER} members={members} onPay={onPay} />);
    fireEvent.click(payButton() as HTMLElement);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Someone in the group has already paid this request.");
  });
});
