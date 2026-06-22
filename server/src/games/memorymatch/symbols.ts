/**
 * Symbol pool for Memory Match — nostalgic 1990s-classroom objects.
 *
 * Each symbol is an emoji that will be sepia-tinted client-side via a
 * CSS filter so the cards read as "old photos" instead of stickers.
 * Pool size (≥ 32) covers the largest board (8×8 = 32 pairs). The
 * engine takes the first N pairs after a per-game shuffle so the
 * choice of symbols differs from match to match.
 */
export const MEMORYMATCH_SYMBOLS: ReadonlyArray<string> = [
  // School
  "🎒", "📚", "✏️", "📐", "📏", "🖊️", "🧮", "🎨", "✂️", "🖼️",
  // Toys / games
  "🏏", "🪁", "🎈", "🎲", "🎯", "🪀", "🧸",
  // Vintage tech
  "📻", "📺", "📞", "⏰", "🔦", "📷",
  // Vehicles
  "🚲", "🛼", "🚂",
  // Food
  "🍱", "🥛", "🥭", "🍌",
  // Celebration / nature
  "🎂", "🎁", "🌸", "🦋", "🌻", "🎉",
];
