/**
 * Star Game theme catalog.
 *
 * Each theme is just a labelled list of values. The deck for a match is built
 * from the DISTINCT values the players secretly pick, 4 copies each — so a
 * theme only needs enough values to cover the max player count (8). Every list
 * below ships with exactly 8 curated values; extend or add a theme by dropping
 * another entry into STAR_THEMES (this is the JSON-configurable seam the spec
 * asks for — no engine change needed, the engine reads values off the theme).
 *
 * Shared by client (theme picker) and server (deck generation), imported via
 * the @shared alias on both sides.
 */

export interface StarTheme {
  /** Stable id used in StarGameOptions.themeId. */
  id: string;
  /** Human label for the lobby picker + board header. */
  label: string;
  /** A short emoji used as the theme glyph (decorative, in-game playful UI). */
  glyph: string;
  /** At least 8 distinct values (one per possible seat). */
  values: string[];
}

export const STAR_THEMES: ReadonlyArray<StarTheme> = [
  {
    id: "colors",
    label: "Colors",
    glyph: "🎨",
    values: ["Red", "Blue", "Green", "Yellow", "Orange", "Pink", "Purple", "White"],
  },
  {
    id: "rivers",
    label: "Rivers",
    glyph: "🌊",
    values: ["Ganga", "Yamuna", "Godavari", "Krishna", "Kaveri", "Narmada", "Tungabhadra", "Brahmaputra"],
  },
  {
    id: "gods",
    label: "Gods",
    glyph: "🛕",
    values: ["Vishnu", "Shiva", "Brahma", "Rama", "Krishna", "Ganesha", "Hanuman", "Venkateswara"],
  },
  {
    id: "goddesses",
    label: "Goddesses",
    glyph: "🪔",
    values: ["Lakshmi", "Saraswati", "Parvati", "Durga", "Kali", "Sita", "Radha", "Annapurna"],
  },
  {
    id: "fruits",
    label: "Fruits",
    glyph: "🥭",
    values: ["Mango", "Banana", "Apple", "Guava", "Papaya", "Orange", "Grapes", "Watermelon"],
  },
  {
    id: "flowers",
    label: "Flowers",
    glyph: "🌺",
    values: ["Jasmine", "Rose", "Marigold", "Lotus", "Hibiscus", "Sunflower", "Lily", "Chrysanthemum"],
  },
  {
    id: "birds",
    label: "Birds",
    glyph: "🦜",
    values: ["Peacock", "Parrot", "Sparrow", "Crow", "Eagle", "Koel", "Pigeon", "Kingfisher"],
  },
  {
    id: "animals",
    label: "Animals",
    glyph: "🐅",
    values: ["Tiger", "Elephant", "Lion", "Deer", "Monkey", "Cow", "Horse", "Bear"],
  },
  {
    id: "villages",
    label: "Villages",
    glyph: "🏡",
    values: ["Bhimavaram", "Tanuku", "Narsapur", "Palakollu", "Tadepalligudem", "Nidadavole", "Kovvur", "Eluru"],
  },
  {
    id: "states",
    label: "States",
    glyph: "🗺️",
    values: ["Andhra Pradesh", "Telangana", "Tamil Nadu", "Karnataka", "Kerala", "Maharashtra", "Gujarat", "Punjab"],
  },
  {
    id: "festivals",
    label: "Festivals",
    glyph: "🎉",
    values: ["Sankranti", "Diwali", "Holi", "Ugadi", "Dussehra", "Vinayaka Chavithi", "Pongal", "Bonalu"],
  },
  {
    id: "planets",
    label: "Planets",
    glyph: "🪐",
    values: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
  },
  {
    id: "teluguHeroes",
    label: "Telugu Heroes",
    glyph: "🎬",
    values: ["NTR", "ANR", "Chiranjeevi", "Balakrishna", "Nagarjuna", "Venkatesh", "Mahesh Babu", "Pawan Kalyan"],
  },
  {
    id: "teluguHeroines",
    label: "Telugu Heroines",
    glyph: "🌟",
    values: ["Savitri", "Jayaprada", "Sridevi", "Soundarya", "Anushka", "Samantha", "Kajal", "Tamannaah"],
  },
  {
    id: "freedomFighters",
    label: "Freedom Fighters",
    glyph: "🇮🇳",
    values: [
      "Mahatma Gandhi",
      "Bhagat Singh",
      "Subhas Chandra Bose",
      "Bal Gangadhar Tilak",
      "Sardar Patel",
      "Alluri Sitarama Raju",
      "Tanguturi Prakasam",
      "Rani Lakshmibai",
    ],
  },
  {
    id: "sportsPlayers",
    label: "Sports Players",
    glyph: "🏏",
    values: [
      "Sachin Tendulkar",
      "MS Dhoni",
      "Virat Kohli",
      "Kapil Dev",
      "PV Sindhu",
      "Saina Nehwal",
      "Viswanathan Anand",
      "Milkha Singh",
    ],
  },
  {
    id: "cartoonCharacters",
    label: "Cartoon Characters",
    glyph: "📺",
    values: ["Tom", "Jerry", "Mickey Mouse", "Chhota Bheem", "Doraemon", "Shinchan", "Popeye", "Scooby-Doo"],
  },
];

/** Lookup a theme by id, falling back to the first (colors) when unknown. */
export function getStarTheme(themeId: string): StarTheme {
  return STAR_THEMES.find((t) => t.id === themeId) ?? STAR_THEMES[0];
}
