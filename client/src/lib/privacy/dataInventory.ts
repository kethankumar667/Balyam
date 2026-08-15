/**
 * Every piece of data BHALYAM keeps on this device, in one place.
 *
 * This is the single source of truth for the DPDP surfaces: the privacy
 * notice, the Section 11 export, and the Section 12 erasure all read this
 * registry rather than each maintaining their own idea of what exists. A
 * notice that under-declares, or an erase button that misses a key, is not a
 * cosmetic bug under the Act — it is the violation itself. Keeping one list
 * means the three can never disagree.
 *
 * ── Add a storage key, add it here ────────────────────────────────────
 * `assertInventoryCoversStorage` (see the tests) fails when a key exists in
 * localStorage that nothing in this file declares, so a new feature that
 * quietly starts storing something cannot slip past the notice.
 *
 * ── What the audit actually found ─────────────────────────────────────
 * The working assumption going in was "only a playerId UUID and a display
 * name". Three corrections came out of reading the code:
 *
 *   1. There were seventeen keys, not two. (Accounts have since added the
 *      two sign-in keys below, and the count is `DATA_INVENTORY.length` —
 *      never a number typed into prose that nobody re-counts.)
 *   2. `mpg.rummy.lastGangs` stores OTHER players' display names — personal
 *      data about people who never used this device and cannot reach these
 *      controls. It is flagged `holdsOthersData` and is erased with the rest.
 *   3. `mpg.playerId` is not a UUID. It is `p_<epoch-ms>_<random>`, so it
 *      carries the time the profile was created.
 */

/** Why a key exists, in the Act's terms. */
export type DataPurpose =
  | "identity" // who this player is at a table
  | "credential" // proves a seat is theirs
  | "preference" // settings they chose
  | "progress" // scores, unlocks, tutorial state
  | "diagnostic" // troubleshooting a bad connection
  | "consent"; // the record of what the player agreed to

export interface InventoryEntry {
  key: string;
  /** Plain-language name, shown in the notice and the export. */
  label: string;
  /** What it holds and why, in language a player can actually read. */
  description: string;
  purpose: DataPurpose;
  /** True when the value identifies a person, directly or indirectly. */
  isPersonalData: boolean;
  /**
   * True when the value contains data about people OTHER than this user.
   * Called out separately because they are data principals too, and they
   * have no way to reach these controls themselves.
   */
  holdsOthersData?: boolean;
}

export const DATA_INVENTORY: readonly InventoryEntry[] = [
  {
    key: "mpg.playerId",
    label: "Player ID",
    description:
      "A random id that identifies your seat at a table. Not a UUID — it embeds the moment the profile was first created.",
    purpose: "identity",
    isPersonalData: true,
  },
  {
    key: "mpg.playerName",
    label: "Display name",
    description: "The name shown to everyone else at the table. You typed it yourself.",
    purpose: "identity",
    isPersonalData: true,
  },
  {
    key: "mpg.seats",
    label: "Seat keys",
    description:
      "Per-room proof that a seat is yours, so refreshing the page does not lose your place. Meaningless once the room ends.",
    purpose: "credential",
    isPersonalData: true,
  },
  {
    key: "mpg.rummy.lastGangs",
    label: "Recent tables",
    description:
      "The last three named Rummy tables you joined, including the display names of the other players at them.",
    purpose: "progress",
    isPersonalData: true,
    holdsOthersData: true,
  },
  {
    key: "bhalyam.consent",
    label: "Your privacy choice",
    description:
      "Whether you allowed the optional settings and scores below, and when you chose. Kept so we do not ask again, and so the choice is demonstrable.",
    purpose: "consent",
    isPersonalData: false,
  },
  {
    key: "bhalyam.account",
    label: "Account status",
    description:
      "Whether you are signed in, on builds that have no account service. Written only if you sign in, and only when there is nothing to check the sign-in against — where an account service is configured this is not used at all and the sign-in below replaces it.",
    purpose: "identity",
    isPersonalData: true,
  },
  {
    key: "bhalyam.session",
    label: "Sign-in",
    description:
      "Proof that you are signed in, issued by the account service. It carries your email, your account id and the keys that keep you signed in between visits. Signing out deletes it.",
    purpose: "credential",
    isPersonalData: true,
  },
  {
    key: "bhalyam.session-code-verifier",
    label: "Sign-in handshake",
    description:
      "A one-time secret written while you are away at Google's sign-in page, so the answer that comes back can be proved to be a reply to this browser. Deleted the moment you return.",
    purpose: "credential",
    isPersonalData: true,
  },
  {
    key: "mpg.avatar",
    label: "Avatar",
    description:
      "Which of the built-in avatars you picked. Just a filename — no photo of you is uploaded or stored.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "bhalyam.connlog",
    label: "Connection log",
    description:
      "Timestamped notes about connects and reconnects, used to debug dropped games. No message or game content.",
    purpose: "diagnostic",
    isPersonalData: true,
  },
  {
    key: "bhalyam.audio.settings",
    label: "Sound settings",
    description: "Music and effects volume, and whether sound is muted.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "bhalyam.haptics.enabled",
    label: "Vibration setting",
    description: "Whether the phone vibrates on your turn and on wins.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "bhalyam.language",
    label: "Language",
    description: "The language the interface is shown in.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "bhalyam.theme",
    label: "Theme",
    description: "Light or dark appearance.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "bhalyam.theme.changed",
    label: "Theme touched",
    description: "Whether you have ever changed the theme, so we stop suggesting it.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "mpg.skin",
    label: "Board skin",
    description: "The visual skin chosen for game boards.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "mpg.ludo.settings",
    label: "Ludo settings",
    description: "Your saved Ludo preferences, such as board theme and coin colour.",
    purpose: "preference",
    isPersonalData: false,
  },
  {
    key: "mpg.snake.best",
    label: "Snake best score",
    description: "Your highest Snake score on this device.",
    purpose: "progress",
    isPersonalData: false,
  },
  {
    key: "bb.best",
    label: "Block Blast best score",
    description: "Your highest Block Blast score on this device.",
    purpose: "progress",
    isPersonalData: false,
  },
  {
    key: "ludo.tutorial.completed.v1",
    label: "Ludo tutorial seen",
    description: "Whether you have seen the Ludo tutorial, so it stops reappearing.",
    purpose: "progress",
    isPersonalData: false,
  },
  {
    key: "rummy.tutorial.completed.v1",
    label: "Rummy tutorial seen",
    description: "Whether you have seen the Rummy tutorial.",
    purpose: "progress",
    isPersonalData: false,
  },
  {
    key: "wordbuilding.tutorial.completed.v1",
    label: "Word Building tutorial seen",
    description: "Whether you have seen the Word Building tutorial.",
    purpose: "progress",
    isPersonalData: false,
  },
];

/**
 * Third parties that receive personal data, for the Section 11 disclosure.
 *
 * "We don't sell your data" is not what the Act asks for. It asks who
 * receives it, and an IP address reaching someone else's server is a
 * transfer whether or not money changes hands.
 */
export interface ThirdParty {
  name: string;
  /** What actually reaches them. */
  receives: string;
  /** When this happens — most of these are not on by default. */
  when: string;
}

export const THIRD_PARTIES: readonly ThirdParty[] = [
  {
    name: "Supabase (the account service)",
    receives:
      "Your email address, a scrambled form of your password, your display name and avatar, and the IP address you signed in from. Google sign-in also passes them the name and email on your Google account.",
    when:
      "Only if you create an account. Guests never reach them. Configured by the VITE_SUPABASE_* keys — a build without those has no account service at all.",
  },
  {
    name: "The BHALYAM game server",
    receives:
      "Your display name, your player id, and the moves you make. Chat messages pass through it to reach the table.",
    when: "Whenever you are in a room.",
  },
  {
    name: "Google (public STUN servers)",
    receives:
      "Your device's IP address, which is how two players' browsers find a route to each other.",
    when:
      "Only when you start voice chat. Configured in the server's ICE settings and replaceable with a self-hosted STUN/TURN server.",
  },
  {
    name: "Google Fonts",
    receives: "Your IP address and browser details, as with any file fetched from another domain.",
    when: "On page load, to fetch the typefaces the interface is set in.",
  },
  {
    name: "Other players in your room",
    receives:
      "Your display name, your moves, anything you type in chat, and — during voice chat — your voice and your IP address, since the audio connects device to device.",
    when: "Whenever you share a room with them.",
  },
];

/** Reads one key, tolerating private-browsing and quota errors. */
function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Parses stored JSON where possible so the export is readable, not escaped. */
function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export interface ExportedItem extends Omit<InventoryEntry, "key"> {
  key: string;
  value: unknown;
}

export interface DataExport {
  exportedAt: string;
  notice: string;
  /** Only the entries that actually have a value on this device. */
  data: ExportedItem[];
  thirdParties: readonly ThirdParty[];
  /** Keys found in storage that this registry does not declare. */
  undeclaredKeys: string[];
}

/**
 * Everything this device holds about the player — the Section 11 summary.
 *
 * `undeclaredKeys` is deliberately part of the output rather than swallowed.
 * If a future feature stores something nobody added to the registry, the
 * player's own export is where that surfaces, instead of the notice quietly
 * being wrong.
 */
export function buildDataExport(now: Date = new Date()): DataExport {
  const declared = new Set(DATA_INVENTORY.map((e) => e.key));
  const data: ExportedItem[] = [];

  for (const entry of DATA_INVENTORY) {
    const raw = readKey(entry.key);
    if (raw === null) continue;
    const { key, ...rest } = entry;
    data.push({ key, ...rest, value: parseValue(raw) });
  }

  const undeclaredKeys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && !declared.has(k)) undeclaredKeys.push(k);
    }
  } catch {
    /* storage unavailable — nothing to report */
  }

  return {
    exportedAt: now.toISOString(),
    notice:
      "Everything BHALYAM stores about you on this device, plus who else receives your data. " +
      "Game rooms live only in the server's memory and disappear when the room ends or the server restarts.",
    data,
    thirdParties: THIRD_PARTIES,
    undeclaredKeys: undeclaredKeys.sort(),
  };
}

export interface EraseResult {
  /** Keys that held a value and were removed. */
  removed: string[];
  /** Undeclared keys removed alongside them. */
  removedUndeclared: string[];
}

/**
 * Erase everything on this device — the Section 12 "right to be forgotten",
 * as far as the browser reaches.
 *
 * Undeclared keys go too. Erasure that only removes what someone remembered
 * to write down is not erasure, and leaving an unknown key behind is exactly
 * the case where the player is least able to check.
 *
 * What this CANNOT reach, and what the caller must tell the player: a room
 * they are currently sitting in. The server holds their name and seat in
 * memory until they leave and the grace period lapses.
 */
export function eraseLocalData(): EraseResult {
  const declared = new Set(DATA_INVENTORY.map((e) => e.key));
  const removed: string[] = [];
  const removedUndeclared: string[] = [];

  let allKeys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) allKeys.push(k);
    }
  } catch {
    return { removed, removedUndeclared };
  }

  for (const key of allKeys) {
    try {
      window.localStorage.removeItem(key);
      if (declared.has(key)) removed.push(key);
      else removedUndeclared.push(key);
    } catch {
      /* one key failing must not abandon the rest */
    }
  }

  return { removed: removed.sort(), removedUndeclared: removedUndeclared.sort() };
}

/** Filename for the downloaded export. Dated, so repeated exports do not collide. */
export function exportFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `bhalyam-my-data-${stamp}.json`;
}
