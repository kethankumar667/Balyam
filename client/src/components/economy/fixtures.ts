/**
 * BHALYAM Economy V1 — Synthetic Demonstration Fixtures
 *
 * NON-PRODUCTION DATA: Used solely for isolated component-library rendering,
 * visual contract demonstrations, and unit testing without runtime state.
 */

export interface SyntheticWalletFixture {
  identityId: string;
  kind: "member" | "guest";
  balance: string;
  lifetimeGranted: string;
  lifetimeEarned: string;
  lifetimeSpent: string;
  isMember: boolean;
}

export interface SyntheticPrizeScheduleFixture {
  seatCount: number;
  costPerSeat: string;
  totalCollected: string;
  firstPlace: string;
  secondPlace?: string;
  thirdPlace?: string;
  worldBankCut: string;
}

export interface SyntheticCheckoutFixture {
  roomCode: string;
  game: string;
  seatCount: number;
  humanSeats: number;
  botSeats: number;
  costPerSeat: string;
  totalCost: string;
  currentBalance: string;
  projectedBalance: string;
  hasSufficientFunds: boolean;
  shortfall?: string;
  prizeSchedule: SyntheticPrizeScheduleFixture;
}

// ── 1. Wallets ─────────────────────────────────────────────────────────────

export const DEMO_WALLET_GUEST: SyntheticWalletFixture = {
  identityId: "guest_8921a",
  kind: "guest",
  balance: "2000",
  lifetimeGranted: "2000",
  lifetimeEarned: "0",
  lifetimeSpent: "0",
  isMember: false,
};

export const DEMO_WALLET_MEMBER: SyntheticWalletFixture = {
  identityId: "p_9841284",
  kind: "member",
  balance: "5000",
  lifetimeGranted: "5000",
  lifetimeEarned: "1250",
  lifetimeSpent: "1250",
  isMember: true,
};

export const DEMO_WALLET_LOW_BALANCE: SyntheticWalletFixture = {
  identityId: "p_1209381",
  kind: "member",
  balance: "150",
  lifetimeGranted: "5000",
  lifetimeEarned: "350",
  lifetimeSpent: "5200",
  isMember: true,
};

/**
 * Beyond JavaScript IEEE-754 53-bit float precision:
 * Number.MAX_SAFE_INTEGER + 1 = 9007199254740993
 */
export const DEMO_WALLET_UNSAFE_JS_INT: SyntheticWalletFixture = {
  identityId: "p_overflow_test_1",
  kind: "member",
  balance: "9007199254740993",
  lifetimeGranted: "9007199254740993",
  lifetimeEarned: "0",
  lifetimeSpent: "0",
  isMember: true,
};

/**
 * Maximum 64-bit signed integer in PostgreSQL:
 * 2^63 - 1 = 9223372036854775807
 */
export const DEMO_WALLET_BIGINT_MAX: SyntheticWalletFixture = {
  identityId: "p_bigint_max_test",
  kind: "member",
  balance: "9223372036854775807",
  lifetimeGranted: "9223372036854775807",
  lifetimeEarned: "0",
  lifetimeSpent: "0",
  isMember: true,
};

// ── 2. Prize Schedules ─────────────────────────────────────────────────────

export const DEMO_SCHEDULE_2SEAT: SyntheticPrizeScheduleFixture = {
  seatCount: 2,
  costPerSeat: "100",
  totalCollected: "200",
  firstPlace: "150",
  worldBankCut: "50",
};

export const DEMO_SCHEDULE_3SEAT: SyntheticPrizeScheduleFixture = {
  seatCount: 3,
  costPerSeat: "100",
  totalCollected: "300",
  firstPlace: "150",
  secondPlace: "100",
  worldBankCut: "50",
};

export const DEMO_SCHEDULE_4SEAT: SyntheticPrizeScheduleFixture = {
  seatCount: 4,
  costPerSeat: "100",
  totalCollected: "400",
  firstPlace: "175",
  secondPlace: "125",
  thirdPlace: "50",
  worldBankCut: "50",
};

export const DEMO_SCHEDULE_5SEAT: SyntheticPrizeScheduleFixture = {
  seatCount: 5,
  costPerSeat: "100",
  totalCollected: "500",
  firstPlace: "200",
  secondPlace: "150",
  thirdPlace: "100",
  worldBankCut: "50",
};

// ── 3. Checkouts ───────────────────────────────────────────────────────────

export const DEMO_CHECKOUT_AFFORDABLE: SyntheticCheckoutFixture = {
  roomCode: "KD22TL",
  game: "Ludo",
  seatCount: 4,
  humanSeats: 3,
  botSeats: 1,
  costPerSeat: "100",
  totalCost: "400",
  currentBalance: "5000",
  projectedBalance: "4600",
  hasSufficientFunds: true,
  prizeSchedule: DEMO_SCHEDULE_4SEAT,
};

export const DEMO_CHECKOUT_INSUFFICIENT: SyntheticCheckoutFixture = {
  roomCode: "XARWQX",
  game: "Carrom",
  seatCount: 4,
  humanSeats: 2,
  botSeats: 2,
  costPerSeat: "100",
  totalCost: "400",
  currentBalance: "150",
  projectedBalance: "-250",
  hasSufficientFunds: false,
  shortfall: "250",
  prizeSchedule: DEMO_SCHEDULE_4SEAT,
};

// ── 4. Ledgers & Deltas ───────────────────────────────────────────────────

export const DEMO_DELTAS = [
  { delta: "+5000", type: "CREDIT" as const, desc: "Starter grant welcome bonus" },
  { delta: "-400", type: "DEBIT" as const, desc: "Match commitment: 4 seats (KD22TL)" },
  { delta: "+175", type: "CREDIT" as const, desc: "Match 1st place champion prize" },
  { delta: "+150", type: "ESCROW" as const, desc: "Guest match prize in bearer escrow" },
  { delta: "+400", type: "REFUND" as const, desc: "Restored commitment: match aborted" },
];
