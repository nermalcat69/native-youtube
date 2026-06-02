#!/usr/bin/env node
// Collects all Tauri build artifacts into built/.
// Run after `npm run tauri build` on Windows or Linux to gather
// the installers into one place.

import { readdirSync, cpSync, mkdirSync, statSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

const root      = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = resolve(root, "src-tauri/target/release/bundle");
const builtDir  = resolve(root, "built");

// Extensions we care about
const EXTS = new Set([".dmg", ".msi", ".exe", ".appimage", ".deb", ".rpm"]);

mkdirSync(builtDir, { recursive: true });

let copied = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (EXTS.has(extname(entry.name).toLowerCase())) {
      const dest = resolve(builtDir, entry.name);
      cpSync(full, dest);
      const mb = (statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(`  ✓ built/${entry.name}  (${mb} MB)`);
      copied++;
    }
  }
}

console.log("Collecting artifacts into built/…\n");
walk(bundleDir);

if (copied === 0) {
  console.error("No artifacts found. Run the Tauri build first.");
  process.exit(1);
}

console.log(`\nDone — ${copied} file(s) in built/`);
