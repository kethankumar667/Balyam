import type { HcCountry, HcFormat, HcFranchise } from "./types.js";

/**
 * Hand Cricket rosters — 2024 international squads (per format) and 2026 IPL
 * franchise squads. Sourced from user-provided data; see commit history when
 * refreshing for a new season.
 */

export type HcRole = "batter" | "bowler" | "allrounder" | "keeper";

export interface HcPlayerProfile {
  id: string;
  name: string;
  role: HcRole;
  isCaptain?: boolean;
  /** True if this player is from the legends/extras pool, not the current squad. */
  isExtra?: boolean;
}

export interface HcCountryProfile {
  id: HcCountry;
  name: string;
  flag: string;
  short: string;
  /** Per-format playing pools (15 players per format, in role order). */
  squads: Record<HcFormat, HcPlayerProfile[]>;
  /** Legends pool — popular retired/legacy players selectable as extras. */
  extras: HcPlayerProfile[];
}

export interface HcFranchiseProfile {
  id: HcFranchise;
  name: string;
  short: string;
  /** Brand color used for team labels. */
  color: string;
  /** 2026 IPL roster — flat squad list (franchise format has no test/odi/t20 split). */
  squad: HcPlayerProfile[];
  /** Franchise legends — popular past players selectable as extras. */
  extras: HcPlayerProfile[];
}

// === Helpers ===

function makeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(c\)\*?/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function p(rawName: string, role: HcRole): HcPlayerProfile {
  const isCaptain = /\(c\)/.test(rawName);
  const name = rawName.replace(/\(c\)\*?/g, "").trim();
  return isCaptain
    ? { id: makeId(name), name, role, isCaptain: true }
    : { id: makeId(name), name, role };
}

function legend(name: string, role: HcRole): HcPlayerProfile {
  return { id: makeId(name), name, role, isExtra: true };
}

function squadOf(
  batters: string[],
  allrounders: string[],
  keepers: string[],
  bowlers: string[],
): HcPlayerProfile[] {
  return [
    ...batters.map((n) => p(n, "batter")),
    ...allrounders.map((n) => p(n, "allrounder")),
    ...keepers.map((n) => p(n, "keeper")),
    ...bowlers.map((n) => p(n, "bowler")),
  ];
}

const EMPTY_SQUADS: Record<HcFormat, HcPlayerProfile[]> = {
  test: [],
  odi: [],
  t20: [],
};

// === 2024 International squads ===

const INDIA_LEGENDS: HcPlayerProfile[] = [
  legend("Lokesh Talwar", "batter"),
  legend("Yash Nanda", "keeper"),
  legend("Kabir Rastogi", "allrounder"),
  legend("Darpan Vaidya", "batter"),
  legend("Kunal Jhaveri", "bowler"),
  legend("Chirag Shenoy", "batter"),
  legend("Laksh Oberoi", "batter"),
  legend("Yash Yadava", "bowler"),
  legend("Arnav Chitnis", "batter"),
  legend("Kunal Zacharia", "allrounder"),
];

const AUSTRALIA_LEGENDS: HcPlayerProfile[] = [
  legend("Griffin Vance", "batter"),
  legend("Hayden Underhill", "batter"),
  legend("Elliot Dalgleish", "bowler"),
  legend("Callum Elwood", "bowler"),
  legend("Lachlan Hollis", "keeper"),
  legend("Parker Ackland", "batter"),
  legend("Wyatt Oswald", "bowler"),
];

const ENGLAND_LEGENDS: HcPlayerProfile[] = [
  legend("Toby Upton", "allrounder"),
  legend("Leo Blackwood", "batter"),
  legend("Toby Stanhope", "bowler"),
  legend("Toby Garland", "batter"),
  legend("Alfie Blackwood", "bowler"),
  legend("Harvey Quarles", "allrounder"),
];

const SOUTHAFRICA_LEGENDS: HcPlayerProfile[] = [
  legend("Cobus Botha", "allrounder"),
  legend("Itumeleng Mokoena", "batter"),
  legend("Anele Ismail", "bowler"),
  legend("Quinton Venter", "batter"),
  legend("Itumeleng Ismail", "bowler"),
  legend("Jaco Olivier", "batter"),
];

const NZ_LEGENDS: HcPlayerProfile[] = [
  legend("Sam Stirling", "allrounder"),
  legend("Jonty Aitken", "batter"),
  legend("Eru Aitken", "batter"),
  legend("Freddie Tillotson", "keeper"),
  legend("Sam Cullinane", "batter"),
  legend("Kahu Carrington", "allrounder"),
];

const PAKISTAN_LEGENDS: HcPlayerProfile[] = [
  legend("Zeeshan Lodhi", "allrounder"),
  legend("Imtiaz Kakar", "bowler"),
  legend("Danish Niazi", "bowler"),
  legend("Adeel Farooqi", "batter"),
  legend("Yasir Qadri", "batter"),
  legend("Zeeshan Niazi", "bowler"),
];

const WI_LEGENDS: HcPlayerProfile[] = [
  legend("Evin Sealy", "batter"),
  legend("Fidel Atherley", "batter"),
  legend("Alzarri Daley", "allrounder"),
  legend("Vasbert Knight", "bowler"),
  legend("Marlon Gabriel", "bowler"),
  legend("Oshane Nurse", "batter"),
];

const SL_LEGENDS: HcPlayerProfile[] = [
  legend("Dasun Bandara", "bowler"),
  legend("Asanka Chandimal", "keeper"),
  legend("Avishka Fernandoz", "batter"),
  legend("Ramesh Gunaratne", "allrounder"),
  legend("Ramesh Upatissa", "bowler"),
  legend("Isuru Abeysekera", "bowler"),
];

export const HC_COUNTRIES: Record<HcCountry, HcCountryProfile> = {
  india: {
    id: "india",
    name: "India",
    flag: "🇮🇳",
    short: "IND",
    squads: {
      test: squadOf(
        ["Pranav Upadhye (c)", "Rohan Oberoi", "Kabir Upadhye", "Darpan Thakur", "Utkarsh Sawant"],
        ["Girish Talwar", "Aarav Dalvi", "Ishaan Menon"],
        ["Tejas Venkat", "Kunal Chaudhary"],
        ["Yuvan Rajan", "Darpan Lodha", "Chirag Zacharia", "Jayant Hegde", "Ishaan Purohit"],
      ),
      odi: squadOf(
        ["Pranav Upadhye (c)", "Kabir Upadhye", "Darpan Thakur", "Laksh Naidu", "Tanmay Rajan"],
        ["Dhruv Shenoy", "Girish Talwar", "Neel Yadava"],
        ["Omkar Warrier", "Tejas Venkat"],
        ["Yuvan Rajan", "Darpan Lodha", "Chirag Zacharia", "Jayant Hegde", "Jayant Upadhye"],
      ),
      t20: squadOf(
        ["Pranav Upadhye (c)", "Rohan Oberoi", "Darpan Thakur", "Chirag Dalvi", "Tanmay Rajan"],
        ["Dhruv Shenoy", "Darpan Hiremath", "Ishaan Menon"],
        ["Tejas Venkat", "Harsh Oberoi"],
        ["Yuvan Rajan", "Jayant Upadhye", "Jayant Hegde", "Lokesh Iyengar", "Darpan Lodha"],
      ),
    },
    extras: INDIA_LEGENDS,
  },
  australia: {
    id: "australia",
    name: "Australia",
    flag: "🇦🇺",
    short: "AUS",
    squads: {
      test: squadOf(
        ["Flynn Jarvis (c)", "Flynn Dunmore", "Declan Ashby", "Parker Ashby", "Mason Vance"],
        ["Nate Dunmore", "Mason Elwood"],
        ["Brodie Garrick", "Nate Thornley"],
        ["Jett Fairley", "Riley Selwyn", "Jett Dunmore", "Hayden Jarvis", "Flynn Ingram", "Hugo Lockhart"],
      ),
      odi: squadOf(
        ["Mason Vance", "Brodie Fairley", "Flynn Dunmore", "Parker Ashby"],
        ["Lachlan Garrick", "Wyatt Underhill", "Nate Dunmore", "Callum Kendrick"],
        ["Nate Thornley", "Brodie Garrick"],
        ["Flynn Jarvis (c)", "Jett Fairley", "Riley Selwyn", "Liam Ackland", "Hayden Oswald"],
      ),
      t20: squadOf(
        ["Mason Elwood (c)", "Brodie Fairley", "Mason Vance", "Callum Corrigan", "Brodie Bellamy"],
        ["Lachlan Garrick", "Wyatt Underhill", "Alby Corrigan"],
        ["Nate Thornley", "Elliot Selwyn"],
        ["Flynn Jarvis", "Jett Fairley", "Riley Selwyn", "Liam Ackland", "Griffin Thornley"],
      ),
    },
    extras: AUSTRALIA_LEGENDS,
  },
  england: {
    id: "england",
    name: "England",
    flag: "🏴",
    short: "ENG",
    squads: {
      test: squadOf(
        ["Nigel Cranleigh", "Dominic Eastwick", "Wilf Netherton", "Barney Quarles", "Sidney Netherton"],
        ["Gideon Cranleigh (c)", "Elliot Netherton"],
        ["Alfie Tillotson", "Sidney Dunstan"],
        ["Alfie Hartnell", "Toby Stanhope", "Jasper Ormerod", "Toby Bromley", "Leo Ormerod", "Oscar Jessop"],
      ),
      odi: squadOf(
        ["Sidney Dunstan", "Barney Quarles", "Sidney Netherton", "Dominic Eastwick"],
        ["Fergus Stanhope", "Gideon Jessop", "Freddie Netherton", "Nigel Ashdown"],
        ["Wilf Quarles (c)", "Wilf Garland"],
        ["Elliot Netherton", "Wilf Jessop", "Alfie Hartnell", "Percy Langdon", "Wilf Tillotson"],
      ),
      t20: squadOf(
        ["Sidney Dunstan", "Sidney Netherton", "Dominic Eastwick"],
        ["Fergus Stanhope", "Gideon Jessop", "Freddie Netherton", "Nigel Ashdown"],
        ["Wilf Quarles (c)", "Wilf Garland"],
        ["Wilf Tillotson", "Alfie Hartnell", "Wilf Jessop", "Percy Langdon", "Wilf Verity", "Jasper Ormerod"],
      ),
    },
    extras: ENGLAND_LEGENDS,
  },
  newzealand: {
    id: "newzealand",
    name: "New Zealand",
    flag: "🇳🇿",
    short: "NZ",
    squads: {
      test: squadOf(
        ["Wiremu Dunmore", "Oliver Gillespie", "Rawiri Latimer", "Aroha Atkinson"],
        ["Mitchell Paewai", "Hunter Kingi", "Cooper Carrington", "Hunter Atkinson"],
        ["Tane Stirling (c)", "Kahu Urlich"],
        ["Griffin Ihaka", "Hemi Gillespie", "Jonty Rangi", "Mitchell Vincent", "Logan Nathan"],
      ),
      odi: squadOf(
        ["Wiremu Dunmore (c)", "Oliver Gillespie", "Rawiri Latimer", "Aroha Kingi"],
        ["Mitchell Paewai", "Hunter Kingi", "Cooper Carrington", "Hunter Atkinson", "Wiremu Vincent"],
        ["Tane Stirling"],
        ["Logan Paewai", "Griffin Ihaka", "Hemi Gillespie", "Hunter Latimer", "Oliver Edmonds"],
      ),
      t20: squadOf(
        ["Wiremu Dunmore (c)", "Ben Walker", "Oliver Gillespie", "Aroha Kingi"],
        ["Mitchell Paewai", "Hunter Kingi", "Cooper Carrington", "Wiremu Vincent", "Hunter Atkinson", "Tane Bracewell"],
        ["Dylan Brownlie"],
        ["Logan Paewai", "Griffin Ihaka", "Hunter Latimer", "Oliver Edmonds"],
      ),
    },
    extras: NZ_LEGENDS,
  },
  southafrica: {
    id: "southafrica",
    name: "South Africa",
    flag: "🇿🇦",
    short: "SA",
    squads: {
      test: squadOf(
        ["Dewald Barnard (c)", "Thabo Strydom", "Lungi Rabada", "Gerhard Hendriks", "Neil Pretorius", "Anele Louw"],
        ["Lungi Hendriks", "Dewald Engelbrecht"],
        ["Thabo Olivier", "Henrico Pretorius"],
        ["Kagiso Cilliers", "Sibusiso Venter", "Henrico Duminy", "Quinton Akerman", "Wiaan Cilliers"],
      ),
      odi: squadOf(
        ["Dewald Barnard (c)", "Neil Strydom", "Lungi Rabada", "Wiaan Uys"],
        ["Lungi Hendriks", "Sibusiso Uys", "Dewald Engelbrecht"],
        ["Zander Uys", "Quinton Coetzee"],
        ["Kagiso Cilliers", "Sibusiso Venter", "Francois Duminy", "Quinton Akerman", "Aiden Xaba", "Jaco Pretorius"],
      ),
      t20: squadOf(
        ["Lungi Rabada (c)", "Zander Cilliers", "Wiaan Uys", "Francois Pretorius"],
        ["Lungi Hendriks"],
        ["Zander Uys", "Quinton Coetzee", "Henrico Pretorius"],
        ["Kagiso Cilliers", "Henrico Cilliers", "Francois Duminy", "Quinton Akerman", "Aiden Xaba", "Lungi Mokoena", "Obed Botha"],
      ),
    },
    extras: SOUTHAFRICA_LEGENDS,
  },
  pakistan: {
    id: "pakistan",
    name: "Pakistan",
    flag: "🇵🇰",
    short: "PAK",
    squads: {
      test: squadOf(
        ["Usman Malik (c)", "Owais Gillani", "Basit Usmani", "Zeeshan Awan", "Danish Farooqi"],
        ["Junaid Baig", "Kamran Kakar"],
        ["Moin Dar", "Daniyal Rizvi"],
        ["Qasim Chishti", "Saad Sheikh", "Haider Virk", "Babar Farooqi", "Ghazi Baig", "Adeel Zardari"],
      ),
      odi: squadOf(
        ["Zeeshan Awan (c)", "Haider Ilyas", "Moin Niazi", "Owais Gillani", "Danish Farooqi"],
        ["Yasir Malik", "Junaid Baig", "Moin Jamali", "Naveed Jamali"],
        ["Moin Dar"],
        ["Qasim Chishti", "Usman Qadri", "Saad Sheikh", "Faizan Malik", "Yasir Sheikh"],
      ),
      t20: squadOf(
        ["Zeeshan Awan (c)", "Basit Usmani", "Haider Ilyas", "Naveed Dar"],
        ["Yasir Malik", "Moin Jamali", "Ghazi Kakar"],
        ["Moin Dar", "Ghazi Gillani"],
        ["Qasim Chishti", "Saad Sheikh", "Usman Qadri", "Moin Sheikh", "Imtiaz Chishti", "Ghazi Baig"],
      ),
    },
    extras: PAKISTAN_LEGENDS,
  },
  westindies: {
    id: "westindies",
    name: "West Indies",
    flag: "🏝️",
    short: "WI",
    squads: {
      test: squadOf(
        ["Rovman Walcott (c)", "Dwight Lambert", "Carlos Daley", "Nicholas Mcintosh", "Hayden Gabriel"],
        ["Patrick Emmanuel", "Dwight Emmanuel", "Chemar Lambert"],
        ["Gavin Phillip", "Hayden Clarke"],
        ["Tevin Sealy", "Lendl Roach", "Nicholas Clarke", "Nicholas Daley", "Tevin Nurse"],
      ),
      odi: squadOf(
        ["Nicholas Mcintosh", "Chemar Roach", "Fidel Bascombe", "Everton Joseph", "Carlos Joseph"],
        ["Brandon Quashie", "Everton Nurse"],
        ["Hayden Walcott (c)", "Nicholas Roach"],
        ["Lendl Roach", "Nicholas Daley", "Alzarri Underwood", "Carlos Gabriel", "Shai Mcintosh", "Nicholas Clarke"],
      ),
      t20: squadOf(
        ["Jomel Cornwall (c)", "Chemar Roach", "Everton Joseph", "Carlos Joseph"],
        ["Lendl Daley", "Everton Nurse", "Brandon Quashie"],
        ["Nicholas Roach", "Dwight Alleyne", "Hayden Walcott"],
        ["Alzarri Underwood", "Lendl Roach", "Nicholas Daley", "Nicholas Clarke", "Gavin Gabriel"],
      ),
    },
    extras: WI_LEGENDS,
  },
  srilanka: {
    id: "srilanka",
    name: "Sri Lanka",
    flag: "🇱🇰",
    short: "SL",
    squads: {
      test: squadOf(
        ["Pathum Rajapaksa", "Maheesh Balasuriya", "Isuru Fernandoz"],
        ["Janith Fernandoz (c)", "Thisara Chameera", "Maheesh Chandimal"],
        ["Dilshan Embuldeniya", "Lahiru Dissanayake", "Lahiru Chameera"],
        ["Janith Gunaratne", "Thisara Amarasinghe", "Kamindu Jayasuriya", "Wanindu Thirimanne", "Kusal Samarawickrama", "Binura Hettiarachchi"],
      ),
      odi: squadOf(
        ["Ramesh Bandara", "Maheesh Perumal", "Kusal Amarasinghe"],
        ["Asanka Dabare", "Chamika Wijesinghe", "Dilshan Thirimanne", "Wanindu Wijesinghe"],
        ["Dilshan Embuldeniya (c)", "Lahiru Chameera"],
        ["Wanindu Rajapaksa", "Kusal Chameera", "Chamika Samarawickrama", "Asanka Amarasinghe", "Charith Fernandoz", "Binura Dissanayake"],
      ),
      t20: squadOf(
        ["Ramesh Bandara", "Kusal Amarasinghe", "Isuru Fernandoz"],
        ["Asanka Dabare (c)", "Thisara Chameera", "Nuwan Thirimanne", "Janith Fernandoz"],
        ["Dilshan Embuldeniya", "Lahiru Chameera"],
        ["Wanindu Rajapaksa", "Charith Perumal", "Binura Dissanayake", "Kusal Chameera", "Chamika Samarawickrama", "Chamika Wijesinghe"],
      ),
    },
    extras: SL_LEGENDS,
  },
  // Bangladesh — squad data lives in the client JSON (data/t20.json etc.).
  // Server pool stays empty: the engine accepts any 1-15 player IDs when
  // the pool is empty, so human-chosen JSON-sourced IDs pass validation.
  // Bot play against Bangladesh will use galli-style random selection.
  bangladesh: {
    id: "bangladesh",
    name: "Bangladesh",
    flag: "🇧🇩",
    short: "BAN",
    squads: { ...EMPTY_SQUADS },
    extras: [],
  },
  // Afghanistan — same rationale as Bangladesh above.
  afghanistan: {
    id: "afghanistan",
    name: "Afghanistan",
    flag: "🇦🇫",
    short: "AFG",
    squads: { ...EMPTY_SQUADS },
    extras: [],
  },
  // Ireland — sourced from client JSON (T20 squad used across all formats).
  ireland: {
    id: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    short: "IRE",
    squads: {
      test: squadOf(
        ["Gearoid Hennessy (c)", "Sean Nolan", "Eoin Hennessy", "Rory Egan"],
        ["Aidan Quigley", "Rory Doherty", "Conor Cleary"],
        ["Oisin Fahey", "Fintan Egan"],
        ["Barry Boylan", "Oisin Cleary", "Niall Boylan", "Rory Lacey", "Eoin Boylan", "Kevin Brannigan"],
      ),
      odi: squadOf(
        ["Gearoid Hennessy (c)", "Sean Nolan", "Eoin Hennessy", "Rory Egan"],
        ["Aidan Quigley", "Rory Doherty", "Conor Cleary"],
        ["Oisin Fahey", "Fintan Egan"],
        ["Barry Boylan", "Oisin Cleary", "Niall Boylan", "Rory Lacey", "Eoin Boylan", "Kevin Brannigan"],
      ),
      t20: squadOf(
        ["Gearoid Hennessy (c)", "Sean Nolan", "Eoin Hennessy", "Rory Egan"],
        ["Aidan Quigley", "Rory Doherty", "Conor Cleary"],
        ["Oisin Fahey", "Fintan Egan"],
        ["Barry Boylan", "Oisin Cleary", "Niall Boylan", "Rory Lacey", "Eoin Boylan", "Kevin Brannigan"],
      ),
    },
    extras: [
      legend("Kevin Oakes", "allrounder"),
      legend("Oisin Joyce", "batter"),
      legend("Ian Oakes", "keeper"),
      legend("Killian Farrell", "allrounder"),
      legend("Killian Madden", "allrounder"),
      legend("Cathal Corrigan", "bowler"),
    ],
  },
  // Zimbabwe — sourced from client JSON (T20 squad used across all formats).
  zimbabwe: {
    id: "zimbabwe",
    name: "Zimbabwe",
    flag: "🇿🇼",
    short: "ZIM",
    squads: {
      test: squadOf(
        ["Farai Mutizwa", "Ryan Vitori", "Prince Burl"],
        ["Vusi Raza (c)", "Clive Chigumbura", "Gift Burl", "Luke Khumalo", "Blessing Khumalo", "Milton Khumalo"],
        ["Craig Madhevere", "Sikandar Ervine"],
        ["Kelvin Hlongwane", "Vusi Maruma", "Craig Chigumbura", "Dion Raza"],
      ),
      odi: squadOf(
        ["Farai Mutizwa", "Ryan Vitori", "Prince Burl"],
        ["Vusi Raza (c)", "Clive Chigumbura", "Gift Burl", "Luke Khumalo", "Blessing Khumalo", "Milton Khumalo"],
        ["Craig Madhevere", "Sikandar Ervine"],
        ["Kelvin Hlongwane", "Vusi Maruma", "Craig Chigumbura", "Dion Raza"],
      ),
      t20: squadOf(
        ["Farai Mutizwa", "Ryan Vitori", "Prince Burl"],
        ["Vusi Raza (c)", "Clive Chigumbura", "Gift Burl", "Luke Khumalo", "Blessing Khumalo", "Milton Khumalo"],
        ["Craig Madhevere", "Sikandar Ervine"],
        ["Kelvin Hlongwane", "Vusi Maruma", "Craig Chigumbura", "Dion Raza"],
      ),
    },
    extras: [
      legend("Brian Dube", "keeper"),
      legend("Donald Vitori", "allrounder"),
      legend("Prince Dube", "allrounder"),
      legend("Wellington Zvinoira", "keeper"),
      legend("Innocent Chigumbura", "keeper"),
      legend("Craig Vitori", "batter"),
    ],
  },
};

// === 2026 IPL Franchises ===

export const HC_FRANCHISES: Record<HcFranchise, HcFranchiseProfile> = {
  csk: {
    id: "csk",
    name: "Chennai Cobras",
    short: "CCO",
    color: "#facc15",
    squad: squadOf(
      ["Varun Nanda (c)", "Oliver Gillespie", "Yuvan Pandey"],
      ["Girish Talwar", "Darpan Hiremath", "Mitchell Paewai", "Freddie Netherton", "Varun Iyengar", "Eshan Purohit", "Yuvan Wagle"],
      ["Yash Nanda"],
      ["Charith Perumal", "Aarav Dalvi", "Chirag Inamdar", "Bilal Tokhi"],
    ),
    extras: [
      legend("Chirag Rastogi", "batter"),
      legend("Carlos Thomas", "allrounder"),
      legend("Henrico Xaba", "batter"),
      legend("Declan Yardley", "batter"),
    ],
  },
  mi: {
    id: "mi",
    name: "Mumbai Mariners",
    short: "MMA",
    color: "#1e40af",
    squad: squadOf(
      ["Pranav Upadhye", "Chirag Dalvi", "Chirag Naidu", "Jayant Jhaveri", "Nigel Ashdown"],
      ["Dhruv Shenoy (c)", "Hunter Atkinson"],
      ["Henrico Pretorius", "Pranav Trivedi"],
      ["Yuvan Rajan", "Logan Paewai", "Girish Joshi", "Piyush Deshmukh", "Percy Langdon", "Manav Banerjee"],
    ),
    extras: [
      legend("Lendl Phillip", "allrounder"),
      legend("Ramesh Upatissa", "bowler"),
      legend("Lokesh Talwar", "batter"),
      legend("Neel Nambiar", "bowler"),
    ],
  },
  rcb: {
    id: "rcb",
    name: "Bengaluru Blazers",
    short: "BLZ",
    color: "#dc2626",
    squad: squadOf(
      ["Darpan Thakur", "Yash Mehra (c)", "Callum Corrigan"],
      ["Fergus Stanhope", "Yuvan Sawant", "Everton Nurse", "Naveen Kamath"],
      ["Wilf Garland", "Eshan Rastogi"],
      ["Riley Selwyn", "Yuvan Purohit", "Yash Pandey", "Chirag Lodha", "Darpan Nanda", "Binura Dissanayake"],
    ),
    extras: [
      legend("Itumeleng Mokoena", "batter"),
      legend("Oshane Nurse", "batter"),
      legend("Kunal Jhaveri", "bowler"),
      legend("Dhruv Inamdar", "bowler"),
    ],
  },
  kkr: {
    id: "kkr",
    name: "Kolkata Kestrels",
    short: "KKE",
    color: "#581c87",
    squad: squadOf(
      ["Tanmay Rajan", "Rohan Hegde (c)", "Chirag Yadava", "Jomel Cornwall", "Utkarsh Venkat"],
      ["Kemar Yearwood", "Lendl Daley", "Dhruv Zacharia"],
      ["Zander Uys", "Bashir Popalzai"],
      ["Neel Nanda", "Omkar Bhaskar", "Henrico Cilliers", "Vedant Hegde", "Advait Nanda"],
    ),
    extras: [
      legend("Mihir Naidu", "batter"),
      legend("Samar Bhaskar", "allrounder"),
      legend("Cobus Botha", "allrounder"),
      legend("Freddie Tillotson", "keeper"),
    ],
  },
  srh: {
    id: "srh",
    name: "Hyderabad Hawks",
    short: "HYH",
    color: "#f97316",
    squad: squadOf(
      ["Mason Vance", "Mihir Chitnis"],
      ["Flynn Jarvis (c)", "Advait Chatterjee", "Thisara Chameera", "Dewald Engelbrecht", "Siddharth Wagle"],
      ["Quinton Coetzee", "Arnav Hiremath"],
      ["Chirag Zacharia", "Kunal Hiremath", "Neel Dasgupta", "Liam Ackland", "Girish Rastogi", "Asanka Balasuriya"],
    ),
    extras: [
      legend("Brodie Fairley", "batter"),
      legend("Wiremu Dunmore", "batter"),
      legend("Usman Hotak", "bowler"),
      legend("Arnav Chitnis", "batter"),
    ],
  },
  dc: {
    id: "dc",
    name: "Delhi Dragons",
    short: "DDR",
    color: "#2563eb",
    squad: squadOf(
      ["Sidney Netherton", "Mason Ackland", "Laksh Iyengar", "Henrico Xaba"],
      ["Ishaan Menon", "Samar Sawant", "Pranav Rangan"],
      ["Omkar Warrier (c)", "Francois Pretorius", "Lokesh Inamdar"],
      ["Jayant Hegde", "Jett Fairley", "Samar Agnihotri", "Mihir Pandey", "Ankit Kulkarni"],
    ),
    extras: [
      legend("Laksh Oberoi", "batter"),
      legend("Siddharth Dalvi", "bowler"),
      legend("Laksh Naidu", "batter"),
      legend("Arnav Chitnis", "batter"),
    ],
  },
  pbks: {
    id: "pbks",
    name: "Punjab Panthers",
    short: "PPA",
    color: "#b91c1c",
    squad: squadOf(
      ["Laksh Naidu (c)", "Neel Deshmukh", "Zaid Inamdar"],
      ["Wyatt Underhill", "Lungi Hendriks", "Lachlan Garrick", "Usman Popalzai"],
      ["Manav Venkat", "Nate Thornley"],
      ["Jayant Upadhye", "Dhruv Inamdar", "Hunter Latimer", "Arnav Qureshi", "Laksh Rajan", "Dhruv Talwar"],
    ),
    extras: [
      legend("Omkar Warrier", "batter"),
      legend("Elliot Fairley", "batter"),
      legend("Kunal Zacharia", "allrounder"),
      legend("Wiaan Uys", "batter"),
    ],
  },
  rr: {
    id: "rr",
    name: "Jaipur Jaguars",
    short: "JJA",
    color: "#ec4899",
    squad: squadOf(
      ["Rohan Oberoi", "Everton Joseph", "Bhavesh Naidu"],
      ["Rudra Dasgupta", "Asanka Dabare"],
      ["Harsh Oberoi (c)", "Kunal Chaudhary", "Reeza Mokoena"],
      ["Pranav Nanda", "Wilf Tillotson", "Wanindu Rajapaksa", "Lokesh Rastogi", "Omkar Hiremath", "Hamid Jalali", "Henrico Duminy"],
    ),
    extras: [
      legend("Elliot Dalgleish", "bowler"),
      legend("Nate Kendrick", "allrounder"),
      legend("Chirag Chitnis", "batter"),
      legend("Wilf Quarles", "keeper"),
    ],
  },
  gt: {
    id: "gt",
    name: "Ahmedabad Arrows",
    short: "AAR",
    color: "#0ea5e9",
    squad: squadOf(
      ["Kabir Upadhye (c)", "Lokesh Chitnis", "Advait Pillai"],
      ["Rohan Sawant", "Yash Purohit", "Neel Yadava", "Carlos Joseph"],
      ["Wilf Quarles"],
      ["Usman Hotak", "Kagiso Cilliers", "Darpan Lodha", "Farhan Mehra", "Francois Duminy", "Laksh Gokhale", "Eshan Pillai"],
    ),
    extras: [
      legend("Dhruv Shenoy", "allrounder"),
      legend("Usman Hotak", "bowler"),
      legend("Chirag Zacharia", "bowler"),
    ],
  },
  lsg: {
    id: "lsg",
    name: "Lucknow Lancers",
    short: "LLA",
    color: "#06b6d4",
    squad: squadOf(
      ["Rudra Rangan", "Wiaan Uys", "Ankit Talwar"],
      ["Mason Elwood", "Lungi Rabada"],
      ["Tejas Venkat (c)", "Nicholas Roach", "Tanmay Thakur"],
      ["Lokesh Iyengar", "Arnav Inamdar", "Tanmay Menon", "Manav Chitnis", "Ishaan Purohit", "Laksh Hiremath", "Nicholas Clarke"],
    ),
    extras: [
      legend("Omkar Warrier", "batter"),
      legend("Zander Uys", "keeper"),
      legend("Wyatt Underhill", "allrounder"),
      legend("Yuvan Sawant", "allrounder"),
    ],
  },
};

// === Convenience accessors ===

export function getCountryProfile(id: HcCountry): HcCountryProfile {
  return HC_COUNTRIES[id];
}

export function getFranchiseProfile(id: HcFranchise): HcFranchiseProfile {
  return HC_FRANCHISES[id];
}

/**
 * Resolve a team's selectable players (squad + extras) for the given format.
 * For IPL franchises, format is ignored (single squad per franchise).
 */
export function getRosterFor(
  teamId: string,
  format: HcFormat,
): { squad: HcPlayerProfile[]; extras: HcPlayerProfile[]; teamName: string; teamShort: string } | null {
  const country = (HC_COUNTRIES as Record<string, HcCountryProfile | undefined>)[teamId];
  if (country) {
    return {
      squad: country.squads[format],
      extras: country.extras,
      teamName: country.name,
      teamShort: country.short,
    };
  }
  const franchise = (HC_FRANCHISES as Record<string, HcFranchiseProfile | undefined>)[teamId];
  if (franchise) {
    return {
      squad: franchise.squad,
      extras: franchise.extras,
      teamName: franchise.name,
      teamShort: franchise.short,
    };
  }
  return null;
}

/**
 * Combined pool of all selectable players (squad + extras) for a team+format.
 * Used by the engine to validate confirmSquad inputs and resolve role checks.
 */
export function getAllPlayersFor(teamId: string, format: HcFormat): HcPlayerProfile[] {
  const r = getRosterFor(teamId, format);
  if (!r) return [];
  return [...r.squad, ...r.extras];
}

/**
 * Composition rules for a 11-player XI:
 *   • Exactly 11 players
 *   • ≥1 wicket-keeper
 *   • ≥4 bowling options (role=bowler OR allrounder)
 */
export interface HcCompositionReport {
  total: number;
  batters: number;
  keepers: number;
  allrounders: number;
  bowlers: number;
  bowlingOptions: number; // bowlers + allrounders
  isValid: boolean;
  problems: string[];
}

export function evaluateSquadComposition(
  players: HcPlayerProfile[],
): HcCompositionReport {
  const total = players.length;
  const batters = players.filter((p) => p.role === "batter").length;
  const keepers = players.filter((p) => p.role === "keeper").length;
  const allrounders = players.filter((p) => p.role === "allrounder").length;
  const bowlers = players.filter((p) => p.role === "bowler").length;
  const bowlingOptions = bowlers + allrounders;
  const problems: string[] = [];
  if (total !== 11) problems.push(`Need exactly 11 players (have ${total})`);
  if (keepers < 1) problems.push("Need at least 1 wicket-keeper");
  if (bowlingOptions < 4) problems.push(`Need at least 4 bowlers or all-rounders (have ${bowlingOptions})`);
  return {
    total,
    batters,
    keepers,
    allrounders,
    bowlers,
    bowlingOptions,
    isValid: problems.length === 0,
    problems,
  };
}
