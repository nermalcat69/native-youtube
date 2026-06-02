#!/usr/bin/env node
// Builds the macOS DMG directly into built/.
// Usage:
//   node scripts/make-dmg.mjs                            # native arch
//   node scripts/make-dmg.mjs --target aarch64-apple-darwin

import { spawnSync, execSync } from "child_process";
import { existsSync, mkdirSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const root    = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

// Optional --target flag
const targetIdx = process.argv.indexOf("--target");
const target    = targetIdx !== -1 ? process.argv[targetIdx + 1] : null;

const arch = target
  ? (target.startsWith("aarch64") ? "aarch64" : "x86_64")
  : (process.arch === "arm64"     ? "aarch64" : "x86_64");

// When --target is set, Tauri writes to target/<triple>/release/bundle
const targetDir = target
  ? resolve(root, "src-tauri/target", target, "release/bundle")
  : resolve(root, "src-tauri/target/release/bundle");

const appDir   = resolve(targetDir, "macos");
const builtDir = resolve(root, "built");
const dmgName  = `Youtube_${version}_${arch}.dmg`;
const dmgOut   = resolve(builtDir, dmgName);   // final destination

if (!existsSync(resolve(appDir, "Youtube.app"))) {
  console.error(`Youtube.app not found at: ${appDir}`);
  console.error("Run the Tauri app build step first.");
  process.exit(1);
}

// Ensure output directory exists before passing it to create-dmg
mkdirSync(builtDir, { recursive: true });

// Remove any previous DMG at the destination
execSync(`rm -f "${dmgOut}"`, { shell: true });

// Write the DMG directly into built/ — no intermediate path, no mv
const args = [
  "--volname",        "Youtube",
  "--window-pos",     "200", "120",
  "--window-size",    "660", "400",
  "--icon-size",      "128",
  "--icon",           "Youtube.app", "180", "170",
  "--app-drop-link",  "480", "170",
  "--hide-extension", "Youtube.app",
  "--skip-jenkins",
  dmgOut,    // output goes straight to built/
  appDir,
];

console.log(`Building ${dmgName}…`);
const result = spawnSync("create-dmg", args, { stdio: "inherit" });
if (result.status !== 0) {
  console.error("create-dmg failed with exit code", result.status);
  process.exit(result.status ?? 1);
}

const mb = (statSync(dmgOut).size / 1024 / 1024).toFixed(1);
console.log(`\n✓ built/${dmgName}  (${mb} MB)`);
