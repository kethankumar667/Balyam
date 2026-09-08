import { AVATAR_FILES } from "@shared/avatars";

export interface TestAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  tagline: string;
  avatarFile: string;
  role: string;
}

export const TEST_ACCOUNTS_PASSWORD = "Bhalyam@2026";

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  {
    id: "tester1",
    name: "Bunty Champion",
    email: "tester1@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Galli cricket captain & arcade legend 👑",
    avatarFile: AVATAR_FILES[0] ?? "file_0000000084c48208b1f893419d784cf2_1.jpg",
    role: "Host / High Roller",
  },
  {
    id: "tester2",
    name: "Priya Star",
    email: "tester2@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Ludo master & quick-roller 🌸",
    avatarFile: AVATAR_FILES[1] ?? "file_0000000084c48208b1f893419d784cf2_2.jpg",
    role: "Ludo Strategist",
  },
  {
    id: "tester3",
    name: "Chintu Swift",
    email: "tester3@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Lightning speed Snakes & Ladders champ ⚡",
    avatarFile: AVATAR_FILES[2] ?? "file_0000000084c48208b1f893419d784cf2_3.jpg",
    role: "Speed Runner",
  },
  {
    id: "tester4",
    name: "Rahul Galli",
    email: "tester4@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Last-over six hitter 🏏",
    avatarFile: AVATAR_FILES[3] ?? "file_0000000084c48208b1f893419d784cf2_4.jpg",
    role: "Cricket Master",
  },
  {
    id: "tester5",
    name: "Sneha Spark",
    email: "tester5@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "RPS mind-reader & puzzle solver 🌟",
    avatarFile: AVATAR_FILES[4] ?? "file_0000000084c48208b1f893419d784cf2_5.jpg",
    role: "Mind Reader",
  },
  {
    id: "tester6",
    name: "Vikram Rocket",
    email: "tester6@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "UNO wildcard drop specialist 🚀",
    avatarFile: AVATAR_FILES[5] ?? "file_0000000084c48208b1f893419d784cf2_8.jpg",
    role: "Card Shuffler",
  },
  {
    id: "tester7",
    name: "Ananya Tiger",
    email: "tester7@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Dots & Boxes grid conqueror 🐯",
    avatarFile: AVATAR_FILES[6] ?? "file_0000000084c48208b1f893419d784cf2_9.jpg",
    role: "Grid Master",
  },
  {
    id: "tester8",
    name: "Deepak Wizard",
    email: "tester8@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Word Building dictionary connoisseur 🎲",
    avatarFile: AVATAR_FILES[7] ?? "file_0000000084c48208b1f893419d784cf2_10.jpg",
    role: "Word Wizard",
  },
  {
    id: "tester9",
    name: "Kavya Sleuth",
    email: "tester9@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Tambola & Bingo fast caller 🔍",
    avatarFile: AVATAR_FILES[8] ?? "file_0000000084c48208b1f893419d784cf2_11.jpg",
    role: "Lucky Caller",
  },
  {
    id: "tester10",
    name: "Arjun Royal",
    email: "tester10@bhalyam.com",
    password: TEST_ACCOUNTS_PASSWORD,
    tagline: "Retro arcade tournament champion 🏆",
    avatarFile: AVATAR_FILES[9] ?? "file_0000000084c48208b1f893419d784cf2_12.jpg",
    role: "Arcade King",
  },
] as const;
