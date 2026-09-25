import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { en } from "../locales/en";

/**
 * A translation key with a typo does not fail loudly — it renders as raw text
 * ("mandali.tab.chta") on a real person's screen. This reads every Mandali
 * source file and checks that each `mandali.*` key it mentions really exists.
 */

const SRC = path.resolve(__dirname, "../..");
const FOLDERS = ["components/mandali", "pages/mandali"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const catalogue = en as Record<string, string>;
const hasKey = (key: string): boolean =>
  key in catalogue || `${key}_other` in catalogue || `${key}_one` in catalogue;

const usedKeys = new Map<string, string>();
for (const folder of FOLDERS) {
  for (const file of sourceFiles(path.join(SRC, folder))) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/"(mandali\.[A-Za-z0-9_.]+)"/g)) {
      usedKeys.set(match[1], path.relative(SRC, file));
    }
  }
}

describe("Mandali translation keys", () => {
  it("finds the keys the screens use (so this test cannot pass by reading nothing)", () => {
    expect(usedKeys.size).toBeGreaterThan(20);
  });

  it("has an English string for every key the code mentions", () => {
    const missing = [...usedKeys.entries()].filter(([key]) => !hasKey(key)).map(([key, file]) => `${key}  (${file})`);

    expect(missing).toEqual([]);
  });

  it("never leaves an English string empty", () => {
    const empty = Object.entries(catalogue).filter(([key, value]) => key.startsWith("mandali.") && !value.trim());

    expect(empty).toEqual([]);
  });

  it("keeps every {{placeholder}} the code passes in the string that receives it", () => {
    // The strings that take a value; a rewrite that drops the placeholder would silently lose the name or count.
    const needs: Record<string, string> = {
      "mandali.chat.placeholder": "name",
      "mandali.feed.empty.body": "name",
      "mandali.channel.switch": "name",
      "mandali.message.react": "emoji",
      "mandali.play.empty.body": "name",
      "mandali.people.coinsWith": "name",
      "mandali.start.defaultName": "game",
      "mandali.start.seatsFixed": "count",
      "mandali.header.hereNow": "count",
      "mandali.people.online": "count",
    };
    const wrong = Object.entries(needs).filter(([key, variable]) => !catalogue[key]?.includes(`{{${variable}}}`));

    expect(wrong).toEqual([]);
  });
});
