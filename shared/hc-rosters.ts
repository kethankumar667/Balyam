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
  legend("Sachin Tendulkar", "batter"),
  legend("MS Dhoni", "keeper"),
  legend("Kapil Dev", "allrounder"),
  legend("Sunil Gavaskar", "batter"),
  legend("Anil Kumble", "bowler"),
  legend("Rahul Dravid", "batter"),
  legend("Virender Sehwag", "batter"),
  legend("Bhuvaneshwar Kumar", "bowler"),
  legend("Shikhar Dhawan", "batter"),
  legend("Yuvraj Singh", "allrounder"),
];

const AUSTRALIA_LEGENDS: HcPlayerProfile[] = [
  legend("Don Bradman", "batter"),
  legend("Ricky Ponting", "batter"),
  legend("Shane Warne", "bowler"),
  legend("Glenn McGrath", "bowler"),
  legend("Adam Gilchrist", "keeper"),
  legend("Steve Waugh", "batter"),
  legend("Brett Lee", "bowler"),
];

const ENGLAND_LEGENDS: HcPlayerProfile[] = [
  legend("Ian Botham", "allrounder"),
  legend("Alastair Cook", "batter"),
  legend("James Anderson", "bowler"),
  legend("Kevin Pietersen", "batter"),
  legend("Stuart Broad", "bowler"),
  legend("Andrew Flintoff", "allrounder"),
];

const SOUTHAFRICA_LEGENDS: HcPlayerProfile[] = [
  legend("Jacques Kallis", "allrounder"),
  legend("AB de Villiers", "batter"),
  legend("Dale Steyn", "bowler"),
  legend("Graeme Smith", "batter"),
  legend("Allan Donald", "bowler"),
  legend("Hashim Amla", "batter"),
];

const NZ_LEGENDS: HcPlayerProfile[] = [
  legend("Richard Hadlee", "allrounder"),
  legend("Martin Crowe", "batter"),
  legend("Stephen Fleming", "batter"),
  legend("Brendon McCullum", "keeper"),
  legend("Ross Taylor", "batter"),
  legend("Daniel Vettori", "allrounder"),
];

const PAKISTAN_LEGENDS: HcPlayerProfile[] = [
  legend("Imran Khan", "allrounder"),
  legend("Wasim Akram", "bowler"),
  legend("Waqar Younis", "bowler"),
  legend("Inzamam-ul-Haq", "batter"),
  legend("Javed Miandad", "batter"),
  legend("Shoaib Akhtar", "bowler"),
];

const WI_LEGENDS: HcPlayerProfile[] = [
  legend("Sir Viv Richards", "batter"),
  legend("Brian Lara", "batter"),
  legend("Sir Garfield Sobers", "allrounder"),
  legend("Malcolm Marshall", "bowler"),
  legend("Curtly Ambrose", "bowler"),
  legend("Chris Gayle", "batter"),
];

const SL_LEGENDS: HcPlayerProfile[] = [
  legend("Muttiah Muralitharan", "bowler"),
  legend("Kumar Sangakkara", "keeper"),
  legend("Mahela Jayawardene", "batter"),
  legend("Sanath Jayasuriya", "allrounder"),
  legend("Lasith Malinga", "bowler"),
  legend("Chaminda Vaas", "bowler"),
];

export const HC_COUNTRIES: Record<HcCountry, HcCountryProfile> = {
  india: {
    id: "india",
    name: "India",
    flag: "🇮🇳",
    short: "IND",
    squads: {
      test: squadOf(
        ["Rohit Sharma (c)", "Yashasvi Jaiswal", "Shubman Gill", "Virat Kohli", "Sarfaraz Khan"],
        ["Ravindra Jadeja", "R Ashwin", "Axar Patel"],
        ["Rishabh Pant", "Dhruv Jurel"],
        ["Jasprit Bumrah", "Mohammed Siraj", "Mohammed Shami", "Kuldeep Yadav", "Akash Deep"],
      ),
      odi: squadOf(
        ["Rohit Sharma (c)", "Shubman Gill", "Virat Kohli", "Shreyas Iyer", "Rinku Singh"],
        ["Hardik Pandya", "Ravindra Jadeja", "Washington Sundar"],
        ["KL Rahul", "Rishabh Pant"],
        ["Jasprit Bumrah", "Mohammed Siraj", "Mohammed Shami", "Kuldeep Yadav", "Arshdeep Singh"],
      ),
      t20: squadOf(
        ["Rohit Sharma (c)", "Yashasvi Jaiswal", "Virat Kohli", "Suryakumar Yadav", "Rinku Singh"],
        ["Hardik Pandya", "Shivam Dube", "Axar Patel"],
        ["Rishabh Pant", "Sanju Samson"],
        ["Jasprit Bumrah", "Arshdeep Singh", "Kuldeep Yadav", "Ravi Bishnoi", "Mohammed Siraj"],
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
        ["Pat Cummins (c)", "Steve Smith", "Usman Khawaja", "Marnus Labuschagne", "Travis Head"],
        ["Cameron Green", "Mitchell Marsh"],
        ["Alex Carey", "Josh Inglis"],
        ["Mitchell Starc", "Josh Hazlewood", "Nathan Lyon", "Scott Boland", "Matt Renshaw", "Michael Neser"],
      ),
      odi: squadOf(
        ["Travis Head", "David Warner", "Steve Smith", "Marnus Labuschagne"],
        ["Glenn Maxwell", "Marcus Stoinis", "Cameron Green", "Sean Abbott"],
        ["Josh Inglis", "Alex Carey"],
        ["Pat Cummins (c)", "Mitchell Starc", "Josh Hazlewood", "Adam Zampa", "Spencer Johnson"],
      ),
      t20: squadOf(
        ["Mitchell Marsh (c)", "David Warner", "Travis Head", "Tim David", "Matthew Short"],
        ["Glenn Maxwell", "Marcus Stoinis", "Ashton Agar"],
        ["Josh Inglis", "Matthew Wade"],
        ["Pat Cummins", "Mitchell Starc", "Josh Hazlewood", "Adam Zampa", "Nathan Ellis"],
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
        ["Zak Crawley", "Ben Duckett", "Ollie Pope", "Joe Root", "Harry Brook"],
        ["Ben Stokes (c)", "Chris Woakes"],
        ["Jamie Smith", "Jonny Bairstow"],
        ["Mark Wood", "James Anderson", "Tom Hartley", "Shoaib Bashir", "Ollie Robinson", "Gus Atkinson"],
      ),
      odi: squadOf(
        ["Jonny Bairstow", "Joe Root", "Harry Brook", "Ben Duckett"],
        ["Liam Livingstone", "Moeen Ali", "Sam Curran", "Will Jacks"],
        ["Jos Buttler (c)", "Phil Salt"],
        ["Chris Woakes", "Adil Rashid", "Mark Wood", "Reece Topley", "Jofra Archer"],
      ),
      t20: squadOf(
        ["Jonny Bairstow", "Harry Brook", "Ben Duckett"],
        ["Liam Livingstone", "Moeen Ali", "Sam Curran", "Will Jacks"],
        ["Jos Buttler (c)", "Phil Salt"],
        ["Jofra Archer", "Mark Wood", "Adil Rashid", "Reece Topley", "Chris Jordan", "Tom Hartley"],
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
        ["Kane Williamson", "Devon Conway", "Will Young", "Henry Nicholls"],
        ["Rachin Ravindra", "Daryl Mitchell", "Glenn Phillips", "Mitchell Santner"],
        ["Tom Latham (c)", "Tom Blundell"],
        ["Tim Southee", "Matt Henry", "Kyle Jamieson", "Will O'Rourke", "Ajaz Patel"],
      ),
      odi: squadOf(
        ["Kane Williamson (c)", "Devon Conway", "Will Young", "Mark Chapman"],
        ["Rachin Ravindra", "Daryl Mitchell", "Glenn Phillips", "Mitchell Santner", "Jimmy Neesham"],
        ["Tom Latham"],
        ["Trent Boult", "Tim Southee", "Matt Henry", "Lockie Ferguson", "Ish Sodhi"],
      ),
      t20: squadOf(
        ["Kane Williamson (c)", "Finn Allen", "Devon Conway", "Mark Chapman"],
        ["Rachin Ravindra", "Daryl Mitchell", "Glenn Phillips", "Jimmy Neesham", "Mitchell Santner", "Michael Bracewell"],
        ["Tim Seifert"],
        ["Trent Boult", "Tim Southee", "Lockie Ferguson", "Ish Sodhi"],
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
        ["Temba Bavuma (c)", "Dean Elgar", "Aiden Markram", "Tony de Zorzi", "David Bedingham", "Keegan Petersen"],
        ["Marco Jansen", "Wiaan Mulder"],
        ["Kyle Verreynne", "Ryan Rickelton"],
        ["Kagiso Rabada", "Lungi Ngidi", "Nandre Burger", "Keshav Maharaj", "Dane Piedt"],
      ),
      odi: squadOf(
        ["Temba Bavuma (c)", "Rassie van der Dussen", "Aiden Markram", "David Miller"],
        ["Marco Jansen", "Andile Phehlukwayo", "Wiaan Mulder"],
        ["Quinton de Kock", "Heinrich Klaasen"],
        ["Kagiso Rabada", "Lungi Ngidi", "Gerald Coetzee", "Keshav Maharaj", "Tabraiz Shamsi", "Lizaad Williams"],
      ),
      t20: squadOf(
        ["Aiden Markram (c)", "Reeza Hendricks", "David Miller", "Tristan Stubbs"],
        ["Marco Jansen"],
        ["Quinton de Kock", "Heinrich Klaasen", "Ryan Rickelton"],
        ["Kagiso Rabada", "Anrich Nortje", "Gerald Coetzee", "Keshav Maharaj", "Tabraiz Shamsi", "Ottniel Baartman", "Bjorn Fortuin"],
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
        ["Shan Masood (c)", "Abdullah Shafique", "Saim Ayub", "Babar Azam", "Saud Shakeel"],
        ["Agha Salman", "Faheem Ashraf"],
        ["Mohammad Rizwan", "Sarfaraz Ahmed"],
        ["Shaheen Afridi", "Naseem Shah", "Hasan Ali", "Aamer Jamal", "Abrar Ahmed", "Noman Ali"],
      ),
      odi: squadOf(
        ["Babar Azam (c)", "Fakhar Zaman", "Imam-ul-Haq", "Abdullah Shafique", "Saud Shakeel"],
        ["Iftikhar Ahmed", "Agha Salman", "Shadab Khan", "Mohammad Nawaz"],
        ["Mohammad Rizwan"],
        ["Shaheen Afridi", "Haris Rauf", "Naseem Shah", "Usama Mir", "Mohammad Wasim Jr"],
      ),
      t20: squadOf(
        ["Babar Azam (c)", "Saim Ayub", "Fakhar Zaman", "Usman Khan"],
        ["Iftikhar Ahmed", "Shadab Khan", "Imad Wasim"],
        ["Mohammad Rizwan", "Azam Khan"],
        ["Shaheen Afridi", "Naseem Shah", "Haris Rauf", "Mohammad Amir", "Abbas Afridi", "Abrar Ahmed"],
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
        ["Kraigg Brathwaite (c)", "Tagenarine Chanderpaul", "Kirk McKenzie", "Alick Athanaze", "Kavem Hodge"],
        ["Jason Holder", "Justin Greaves", "Kevin Sinclair"],
        ["Joshua Da Silva", "Tevin Imlach"],
        ["Kemar Roach", "Alzarri Joseph", "Shamar Joseph", "Gudakesh Motie", "Jomel Warrican"],
      ),
      odi: squadOf(
        ["Alick Athanaze", "Brandon King", "Keacy Carty", "Shimron Hetmyer", "Sherfane Rutherford"],
        ["Roston Chase", "Romario Shepherd"],
        ["Shai Hope (c)", "Nicholas Pooran"],
        ["Alzarri Joseph", "Gudakesh Motie", "Akeal Hosein", "Oshane Thomas", "Matthew Forde", "Shamar Joseph"],
      ),
      t20: squadOf(
        ["Rovman Powell (c)", "Brandon King", "Shimron Hetmyer", "Sherfane Rutherford"],
        ["Andre Russell", "Romario Shepherd", "Roston Chase"],
        ["Nicholas Pooran", "Johnson Charles", "Shai Hope"],
        ["Akeal Hosein", "Alzarri Joseph", "Gudakesh Motie", "Shamar Joseph", "Obed McCoy"],
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
        ["Dimuth Karunaratne", "Nishan Madushka", "Angelo Mathews"],
        ["Dhananjaya de Silva (c)", "Kamindu Mendis", "Ramesh Mendis"],
        ["Kusal Mendis", "Dinesh Chandimal", "Sadeera Samarawickrama"],
        ["Prabath Jayasuriya", "Asitha Fernando", "Vishwa Fernando", "Kasun Rajitha", "Lahiru Kumara", "Milan Rathnayake"],
      ),
      odi: squadOf(
        ["Pathum Nissanka", "Avishka Fernando", "Charith Asalanka"],
        ["Wanindu Hasaranga", "Dunith Wellalage", "Chamika Karunaratne", "Janith Liyanage"],
        ["Kusal Mendis (c)", "Sadeera Samarawickrama"],
        ["Maheesh Theekshana", "Dilshan Madushanka", "Dushmantha Chameera", "Pramod Madushan", "Akila Dananjaya", "Nuwan Thushara"],
      ),
      t20: squadOf(
        ["Pathum Nissanka", "Charith Asalanka", "Angelo Mathews"],
        ["Wanindu Hasaranga (c)", "Kamindu Mendis", "Dasun Shanaka", "Dhananjaya de Silva"],
        ["Kusal Mendis", "Sadeera Samarawickrama"],
        ["Maheesh Theekshana", "Matheesha Pathirana", "Nuwan Thushara", "Dilshan Madushanka", "Dushmantha Chameera", "Dunith Wellalage"],
      ),
    },
    extras: SL_LEGENDS,
  },
  // Bangladesh and Afghanistan: no 2024 roster data yet (Phase 2.1).
  bangladesh: {
    id: "bangladesh",
    name: "Bangladesh",
    flag: "🇧🇩",
    short: "BAN",
    squads: { ...EMPTY_SQUADS },
    extras: [],
  },
  afghanistan: {
    id: "afghanistan",
    name: "Afghanistan",
    flag: "🇦🇫",
    short: "AFG",
    squads: { ...EMPTY_SQUADS },
    extras: [],
  },
};

// === 2026 IPL Franchises ===

export const HC_FRANCHISES: Record<HcFranchise, HcFranchiseProfile> = {
  csk: {
    id: "csk",
    name: "Chennai Super Kings",
    short: "CSK",
    color: "#facc15",
    squad: squadOf(
      ["Ruturaj Gaikwad (c)", "Devon Conway", "Rahul Tripathi"],
      ["Ravindra Jadeja", "Shivam Dube", "Rachin Ravindra", "Sam Curran", "Vijay Shankar", "Deepak Hooda", "Anshul Kamboj"],
      ["MS Dhoni"],
      ["Matheesha Pathirana", "R Ashwin", "Khaleel Ahmed", "Noor Ahmad"],
    ),
    extras: [
      legend("Suresh Raina", "batter"),
      legend("Dwayne Bravo", "allrounder"),
      legend("Faf du Plessis", "batter"),
      legend("Michael Hussey", "batter"),
    ],
  },
  mi: {
    id: "mi",
    name: "Mumbai Indians",
    short: "MI",
    color: "#1e40af",
    squad: squadOf(
      ["Rohit Sharma", "Suryakumar Yadav", "Tilak Varma", "Naman Dhir", "Will Jacks"],
      ["Hardik Pandya (c)", "Mitchell Santner"],
      ["Ryan Rickelton", "Robin Minz"],
      ["Jasprit Bumrah", "Trent Boult", "Deepak Chahar", "Allah Ghazanfar", "Reece Topley", "Karan Sharma"],
    ),
    extras: [
      legend("Kieron Pollard", "allrounder"),
      legend("Lasith Malinga", "bowler"),
      legend("Sachin Tendulkar", "batter"),
      legend("Harbhajan Singh", "bowler"),
    ],
  },
  rcb: {
    id: "rcb",
    name: "Royal Challengers Bengaluru",
    short: "RCB",
    color: "#dc2626",
    squad: squadOf(
      ["Virat Kohli", "Rajat Patidar (c)", "Tim David"],
      ["Liam Livingstone", "Krunal Pandya", "Romario Shepherd", "Swapnil Singh"],
      ["Phil Salt", "Jitesh Sharma"],
      ["Josh Hazlewood", "Bhuvneshwar Kumar", "Yash Dayal", "Rasikh Dar", "Suyash Sharma", "Nuwan Thushara"],
    ),
    extras: [
      legend("AB de Villiers", "batter"),
      legend("Chris Gayle", "batter"),
      legend("Anil Kumble", "bowler"),
      legend("Yuzvendra Chahal", "bowler"),
    ],
  },
  kkr: {
    id: "kkr",
    name: "Kolkata Knight Riders",
    short: "KKR",
    color: "#581c87",
    squad: squadOf(
      ["Rinku Singh", "Venkatesh Iyer (c)", "Angkrish Raghuvanshi", "Rovman Powell", "Manish Pandey"],
      ["Sunil Narine", "Andre Russell", "Ramandeep Singh"],
      ["Quinton de Kock", "Rahmanullah Gurbaz"],
      ["Varun Chakravarthy", "Harshit Rana", "Anrich Nortje", "Vaibhav Arora", "Mayank Markande"],
    ),
    extras: [
      legend("Gautam Gambhir", "batter"),
      legend("Yusuf Pathan", "allrounder"),
      legend("Jacques Kallis", "allrounder"),
      legend("Brendon McCullum", "keeper"),
    ],
  },
  srh: {
    id: "srh",
    name: "Sunrisers Hyderabad",
    short: "SRH",
    color: "#f97316",
    squad: squadOf(
      ["Travis Head", "Abhishek Sharma"],
      ["Pat Cummins (c)", "Nitish Kumar Reddy", "Kamindu Mendis", "Wiaan Mulder", "Atharva Taide"],
      ["Heinrich Klaasen", "Ishan Kishan"],
      ["Mohammed Shami", "Harshal Patel", "Rahul Chahar", "Adam Zampa", "Simarjeet Singh", "Eshan Malinga"],
    ),
    extras: [
      legend("David Warner", "batter"),
      legend("Kane Williamson", "batter"),
      legend("Rashid Khan", "bowler"),
      legend("Shikhar Dhawan", "batter"),
    ],
  },
  dc: {
    id: "dc",
    name: "Delhi Capitals",
    short: "DC",
    color: "#2563eb",
    squad: squadOf(
      ["Harry Brook", "Jake Fraser-McGurk", "Karun Nair", "Faf du Plessis"],
      ["Axar Patel", "Sameer Rizvi", "Ashutosh Sharma"],
      ["KL Rahul (c)", "Tristan Stubbs", "Abhishek Porel"],
      ["Kuldeep Yadav", "Mitchell Starc", "T Natarajan", "Mohit Sharma", "Mukesh Kumar"],
    ),
    extras: [
      legend("Virender Sehwag", "batter"),
      legend("Amit Mishra", "bowler"),
      legend("Shreyas Iyer", "batter"),
      legend("Shikhar Dhawan", "batter"),
    ],
  },
  pbks: {
    id: "pbks",
    name: "Punjab Kings",
    short: "PBKS",
    color: "#b91c1c",
    squad: squadOf(
      ["Shreyas Iyer (c)", "Shashank Singh", "Nehal Wadhera"],
      ["Marcus Stoinis", "Marco Jansen", "Glenn Maxwell", "Azmatullah Omarzai"],
      ["Prabhsimran Singh", "Josh Inglis"],
      ["Arshdeep Singh", "Yuzvendra Chahal", "Lockie Ferguson", "Vijaykumar Vyshak", "Yash Thakur", "Harpreet Brar"],
    ),
    extras: [
      legend("KL Rahul", "batter"),
      legend("Shaun Marsh", "batter"),
      legend("Yuvraj Singh", "allrounder"),
      legend("David Miller", "batter"),
    ],
  },
  rr: {
    id: "rr",
    name: "Rajasthan Royals",
    short: "RR",
    color: "#ec4899",
    squad: squadOf(
      ["Yashasvi Jaiswal", "Shimron Hetmyer", "Nitish Rana"],
      ["Riyan Parag", "Wanindu Hasaranga"],
      ["Sanju Samson (c)", "Dhruv Jurel", "Donovan Ferreira"],
      ["Sandeep Sharma", "Jofra Archer", "Maheesh Theekshana", "Akash Madhwal", "Tushar Deshpande", "Fazalhaq Farooqi", "Nandre Burger"],
    ),
    extras: [
      legend("Shane Warne", "bowler"),
      legend("Shane Watson", "allrounder"),
      legend("Ajinkya Rahane", "batter"),
      legend("Jos Buttler", "keeper"),
    ],
  },
  gt: {
    id: "gt",
    name: "Gujarat Titans",
    short: "GT",
    color: "#0ea5e9",
    squad: squadOf(
      ["Shubman Gill (c)", "Sai Sudharsan", "Shahrukh Khan"],
      ["Rahul Tewatia", "Mahipal Lomror", "Washington Sundar", "Sherfane Rutherford"],
      ["Jos Buttler"],
      ["Rashid Khan", "Kagiso Rabada", "Mohammed Siraj", "Prasidh Krishna", "Gerald Coetzee", "Ishant Sharma", "Jayant Yadav"],
    ),
    extras: [
      legend("Hardik Pandya", "allrounder"),
      legend("Rashid Khan", "bowler"),
      legend("Mohammed Shami", "bowler"),
    ],
  },
  lsg: {
    id: "lsg",
    name: "Lucknow Super Giants",
    short: "LSG",
    color: "#06b6d4",
    squad: squadOf(
      ["Ayush Badoni", "David Miller", "Abdul Samad"],
      ["Mitchell Marsh", "Aiden Markram"],
      ["Rishabh Pant (c)", "Nicholas Pooran", "Aryan Juyal"],
      ["Ravi Bishnoi", "Mayank Yadav", "Mohsin Khan", "Avesh Khan", "Akash Deep", "Shahbaz Ahmed", "Shamar Joseph"],
    ),
    extras: [
      legend("KL Rahul", "batter"),
      legend("Quinton de Kock", "keeper"),
      legend("Marcus Stoinis", "allrounder"),
      legend("Krunal Pandya", "allrounder"),
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
