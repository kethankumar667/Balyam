/**
 * illustrations.ts — BHALYAM notebook illustration token map.
 *
 * Single source of truth for every hand-drawn illustration slot in the app.
 * Components import the key they need; assets drop in by updating this map.
 * All paths are relative to `client/public/` (Vite serves that directory).
 *
 * Key naming convention:
 *   <screen>-<slot>[-<variant>]
 *
 * When an illustration has not yet been received, the value is `null`.
 * IllustrationSlot renders a placeholder when value is null; nothing breaks.
 */

export type IllustrationKey =
  // ── Screen illustrations ────────────────────────────────────────────────
  | "home-hero"               // 01 · Home — wide desk-spread hero (16:9)
  | "games-shelf"             // 02 · Games catalog — toy-shelf header band (8:1)
  | "room-create-pencil"      // 03 · Create/Join sheet — header corner doodle (1:1, 64px)
  | "connecting-spinner"      // 04 · Connecting — pencil-loop static frame for SVG conversion (1:1)
  | "name-entry-bg"           // 05 · Name entry — low-opacity background vignette (9:16)
  // ── Lobby — base scene + per-game props ─────────────────────────────────
  | "lobby-base"              // 06 · Lobby — base scene without prop (3:1 banner)
  | "lobby-prop-handcricket"  // 06 · Lobby prop — bat + stumps
  | "lobby-prop-rps"          // 06 · Lobby prop — three-hand triptych
  | "lobby-prop-rummy"        // 06 · Lobby prop — fanned card + card-stand
  | "lobby-prop-ludo"         // 06 · Lobby prop — die + two tokens
  | "lobby-prop-snl"          // 06 · Lobby prop — die + snake silhouette
  | "lobby-prop-uno"          // 06 · Lobby prop — single oversized action card
  | "lobby-prop-wordbuilding" // 06 · Lobby prop — alphabet tiles forming a word
  | "lobby-prop-dotsboxes"    // 06 · Lobby prop — dots grid with one closed box
  | "lobby-prop-stargame"     // 06 · Lobby prop — unfolded star-chit
  // ── Game Over ────────────────────────────────────────────────────────────
  | "gameover-trophy-win"     // 08 · Game Over — trophy + confetti + cheering kids
  | "gameover-trophy-loss"    // 08 · Game Over — tipped trophy + shrugging kid
  // ── 404 ──────────────────────────────────────────────────────────────────
  | "404-porthole"            // 09 · Not Found — tumbling schoolbag inside porthole circle
  // ── Empty & transitional states ─────────────────────────────────────────
  | "chat-empty"              // 10 · Chat — "psst, say hi" speech bubble (inline, ~80px)
  | "bots-empty"              // 10 · BotControls — cobalt-ink robot/bot figure (~48px)
  | "pass-phone"              // 10 · PassPhoneGate — two hands passing a phone (200x100)
  // ── Active gameplay corner doodles (≤64px, static chrome zones only) ────
  | "corner-rps"              // 07 · RPS board corner — three-gesture triptych
  | "corner-rummy"            // 07 · Rummy board corner — playing card fan
  | "corner-ludo"             // 07 · Ludo board corner — die + tokens mid-roll
  | "corner-snl"              // 07 · SnL board corner — coiled snake silhouette
  | "corner-uno"              // 07 · UNO board corner — oversized action card
  | "corner-wordbuilding"     // 07 · Word Building corner — alphabet tile snap
  | "corner-dotsboxes"        // 07 · Dots & Boxes corner — one closed box with star
  | "corner-stargame"         // 07 · Star Game corner — folded star-chit
  // ── Full game catalog scenes (4:3, for catalog tiles / lobby headers) ────
  | "catalog-rummy"           // Game catalog — Sankranti card-table scene
  | "catalog-ludo"            // Game catalog — power-cut afternoon board scene
  | "catalog-snl"             // Game catalog — friendship-ending snake at 99
  | "catalog-stargame";       // Game catalog — terrace rooftop chit-slap scene

/**
 * Asset map. Values are public-relative paths (e.g. "/illustrations/foo.png").
 * `null` means the illustration has not yet been provided; IllustrationSlot
 * renders a labelled placeholder in development and nothing in production.
 */
export const ILLUSTRATIONS: Record<IllustrationKey, string | null> = {
  "home-hero":               null,
  "games-shelf":             null,
  "room-create-pencil":      null,
  "connecting-spinner":      null,
  "name-entry-bg":           null,
  "lobby-base":              null,
  "lobby-prop-handcricket":  null,
  "lobby-prop-rps":          null,
  "lobby-prop-rummy":        null,
  "lobby-prop-ludo":         null,
  "lobby-prop-snl":          null,
  "lobby-prop-uno":          null,
  "lobby-prop-wordbuilding": null,
  "lobby-prop-dotsboxes":    null,
  "lobby-prop-stargame":     null,
  "gameover-trophy-win":     null,
  "gameover-trophy-loss":    null,
  "404-porthole":            null,
  "chat-empty":              null,
  "bots-empty":              null,
  "pass-phone":              null,
  "corner-rps":              null,
  "corner-rummy":            null,
  "corner-ludo":             null,
  "corner-snl":              null,
  "corner-uno":              null,
  "corner-wordbuilding":     null,
  "corner-dotsboxes":        null,
  "corner-stargame":         null,
  "catalog-rummy":           null,
  "catalog-ludo":            null,
  "catalog-snl":             null,
  "catalog-stargame":        null,
};
