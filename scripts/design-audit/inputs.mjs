import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(REPO, "client", "src");
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o);
    else if (/\.tsx$/.test(e.name)) o.push(p);
  }
  return o;
}
const files = walk(SRC).map((f) => ({
  rel: path.relative(SRC, f).split(path.sep).join("/"),
  s: fs.readFileSync(f, "utf8"),
}));
const isGame = (r) => r.startsWith("games/") || r.startsWith("animations/") || r.startsWith("features/brick");

/** Slice out a whole <input …> / <textarea …> opening tag, brace-aware so JSX expressions survive. */
function tags(s, name) {
  const out = [];
  const open = "<" + name;
  let from = 0, i;
  while ((i = s.indexOf(open, from)) !== -1) {
    from = i + 1;
    const nxt = s[i + open.length];
    if (nxt && !" \n\t\r>/".includes(nxt)) continue;
    let depth = 0, j = i;
    for (; j < s.length; j++) {
      const ch = s[j];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
    }
    out.push(s.slice(i, j + 1));
  }
  return out;
}

const sig = new Map();
const noLabel = new Set();
const noFocus = new Set();
let total = 0;
for (const f of files) {
  if (isGame(f.rel)) continue;
  for (const t of [...tags(f.s, "input"), ...tags(f.s, "textarea")]) {
    if (/type=["'](hidden|checkbox|radio|range|file|submit|button)["']/.test(t)) continue;
    total++;
    const cls = (t.match(/className=\{?[`"']([\s\S]{0,800}?)[`"']/) || [, ""])[1];
    const r = (cls.match(/rounded-[\w[\]%.#-]+/) || ["rounded-none"])[0];
    const h = (cls.match(/min-h-\[[^\]]+\]|h-\[[^\]]+\]|h-\d+/) || ["no-height"])[0];
    const b = (cls.match(/border-\[?#?[\w\]/.-]+/) || ["no-border-colour"])[0];
    const fr = /focus:(ring|outline|border)|focus-visible:/.test(cls) ? "focus-styled" : "NO-FOCUS-STYLE";
    const k = `${r} | ${h} | ${b} | ${fr}`;
    sig.set(k, (sig.get(k) || 0) + 1);
    if (!/aria-label|aria-labelledby|\bid=/.test(t)) noLabel.add(f.rel);
    if (fr !== "focus-styled") noFocus.add(f.rel);
  }
}
console.log("text inputs/textareas in non-game chrome:", total);
console.log("distinct (radius | height | border | focus) signatures:", sig.size);
console.log(
  [...sig.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${String(v).padStart(3)}  ${k}`).join("\n"),
);
console.log("\nfiles with an input carrying neither aria-label nor id:", noLabel.size);
console.log("  " + [...noLabel].join("\n  "));
console.log("\nfiles with an input carrying no focus style:", noFocus.size);
console.log("  " + [...noFocus].join("\n  "));
