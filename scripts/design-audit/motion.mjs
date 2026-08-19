import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC=path.join(REPO, "client", "src");
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory())walk(p,o); else if(/\.(tsx?|css)$/.test(e.name))o.push(p);}return o;}
const files=walk(SRC).map(f=>({rel:path.relative(SRC,f).split(path.sep).join("/"),s:fs.readFileSync(f,"utf8")}));
const blob=files.map(f=>f.s).join("\n");
const c=(re)=>(blob.match(re)||[]).length;
console.log("transition-* :",c(/\btransition(-[a-z]+)?\b/g));
const dur=[...blob.matchAll(/\bduration-(\[?[\w.]+\]?)/g)].map(m=>m[1]);
const dm=new Map(); dur.forEach(v=>dm.set(v,(dm.get(v)||0)+1));
console.log("duration-* :",dur.length,"distinct:",dm.size);
console.log("  ",[...dm.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}(${v})`).join(" "));
console.log("ease tokens (out-quart|out-expo|spring|bounce-soft):",c(/\bease-(out-quart|out-expo|spring|bounce-soft)\b/g));
console.log("MOTION_TOKENS refs:",c(/\bMOTION_TOKENS\b/g),"in files:",files.filter(f=>/MOTION_TOKENS/.test(f.s)).map(f=>f.rel).join(", "));
console.log("\nleading-* :",c(/\bleading-[\w\[\].%-]+/g),"| leading-tight:",c(/\bleading-tight\b/g),"| leading-relaxed:",c(/\bleading-relaxed\b/g));
console.log("uppercase :",c(/\buppercase\b/g),"| tracking-wide(r)?:",c(/\btracking-wide[r]?\b/g));
console.log("bg-gradient-to-*:",c(/\bbg-gradient-to-[a-z]{1,2}\b/g));
console.log("from-[#..] inline stops:",c(/\bfrom-\[#[0-9a-fA-F]{3,8}\]/g),"| to-[#..]:",c(/\bto-\[#[0-9a-fA-F]{3,8}\]/g));
// on-scale spacing
const onScale=c(/\b[mp][trblxy]?-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|4\.5|5|5\.5|6|7|8|9|10|11|12|13|14|16|18|20|22|24|28|30|32|36|40|44|48|52|56|60|64|72|80|96)\b/g);
console.log("on-scale p*/m* utilities:",onScale);
// per-page gaps
console.log("\n-- distinct gap/space-y values per page --");
for (const p of ["pages/BhalyamHome.tsx","pages/GamesPage.tsx","pages/AboutPage.tsx","pages/SocialHubPage.tsx","pages/TournamentsPage.tsx","pages/LeaderboardPage.tsx"]) {
  const f=files.find(x=>x.rel===p); if(!f){console.log(p,"MISSING");continue;}
  const g=[...f.s.matchAll(/\b(?:gap|space-y|space-x)-(\[?[\w.%\[\]]+\]?)/g)].map(m=>m[1]);
  const set=new Map(); g.forEach(v=>set.set(v,(set.get(v)||0)+1));
  console.log(p.padEnd(30), "distinct:"+String(set.size).padStart(3), [...set.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}(${v})`).join(" "));
}
