#!/usr/bin/env node
/**
 * bump-version.mjs — update EVERY live version reference in one command.
 *
 * WHY THIS EXISTS:
 *   The app's version appears in many places: the <title> of index.html,
 *   a cache-buster (?v=...) on every cover-app script tag, and
 *   the engine.js?v= cache-buster inside cover-app/real-engine.js (without
 *   that one, browsers can serve a stale engine against new HTML). Updating
 *   them by hand has produced inconsistencies before (e.g. a mix of 19.10
 *   and 19.10b shipping side by side). This script updates all of them at
 *   once so a release can never ship with mismatched version strings.
 *
 * WHAT IT DOES NOT TOUCH:
 *   Historical version mentions in code comments (e.g. "// V19.1: ...") are
 *   deliberately left alone — they are documentation, not live references.
 *   Only the <title> lines and ?v= cache-busters are rewritten.
 *
 * USAGE (run from the project root):
 *   node scripts/bump-version.mjs 19.11
 *   node scripts/bump-version.mjs V19.11     (leading V is optional)
 *
 * Typical release flow: run this FIRST, then ship through the normal
 * workflow (scoped branch → pull request into main → Pages deploy).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every file holding a live version reference. If a new one is ever added,
// add it here — this list IS the definition of "all version references".
const FILES = [
  { name: "index.html", titles: 1, minBusters: 1 },
  { name: "cover-app/real-engine.js", titles: 0, minBusters: 1 },
];

const raw = process.argv[2];
if (!raw || !/^[Vv]?\d+\.\d+[a-z]?$/.test(raw)) {
  console.error("Usage: node scripts/bump-version.mjs <version>   e.g. 19.11");
  process.exit(1);
}
const ver = raw.replace(/^[Vv]/, ""); // "19.11"

let totalRefs = 0;

for (const file of FILES) {
  const path = join(root, file.name);
  let text = readFileSync(path, "utf8");

  // 1. <title> line: replace the V-version only inside the <title> tag.
  let titleHits = 0;
  text = text.replace(/(<title>[^<]*?)V\d+\.\d+[a-z]?([^<]*?<\/title>)/, (_, a, b) => {
    titleHits++;
    return `${a}V${ver}${b}`;
  });

  // 2. Cache-busters: every ?v=<number>.<number>[letter] query string.
  let busterHits = 0;
  text = text.replace(/\?v=\d+\.\d+[a-z]?/g, () => {
    busterHits++;
    return `?v=${ver}`;
  });

  if (titleHits !== file.titles) {
    console.error(`STOP: expected ${file.titles} <title> version(s) in ${file.name}, found ${titleHits}. File NOT saved.`);
    process.exit(1);
  }
  if (busterHits < file.minBusters) {
    console.error(`STOP: expected at least ${file.minBusters} ?v= cache-buster(s) in ${file.name}, found ${busterHits}. File NOT saved.`);
    process.exit(1);
  }

  writeFileSync(path, text);
  totalRefs += titleHits + busterHits;
  console.log(`${file.name}: ${titleHits ? "title updated, " : ""}${busterHits} cache-buster(s) set to ?v=${ver}`);
}

console.log(`\nDone. All ${totalRefs} live version references now read V${ver}.`);
console.log("Next: ship through the normal release flow (branch → PR into main → verify live).");
