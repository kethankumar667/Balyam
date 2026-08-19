import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const src = path.join(ROOT_DIR, "screenshots", "tournaments");
const dst = path.join(process.env.USERPROFILE, ".gemini", "antigravity", "brain", "cb5fad4a-738a-4514-869f-6d5a120bd705", "screenshots");

fs.mkdirSync(dst, { recursive: true });
fs.readdirSync(src).forEach((f) => {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
});
console.log("Successfully copied screenshots to artifact directory:", dst);
