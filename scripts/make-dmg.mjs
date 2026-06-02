#!/usr/bin/env node
// Builds the macOS DMG and places it in built/.
// Usage:
//   node scripts/make-dmg.mjs                          # native arch, default target dir
//   node scripts/make-dmg.mjs --target aarch64-apple-darwin

import { execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const root    = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

// Parse optional --target flag
const targetIdx = process.argv.indexOf("--target");
const target    = targetIdx !== -1 ? process.argv[targetIdx + 1] : null;

// Derive arch label from target triple, or fall back to host arch
let arch;
if (target) {
  arch = target.startsWith("aarch64") ? "aarch64" : "x86_64";
} else {
  arch = process.arch === "arm64" ? "aarch64" : "x86_64";
}

// When --target is given Tauri writes to target/<triple>/release/bundle,
// otherwise it writes to target/release/bundle
const targetDir = target
  ? resolve(root, "src-tauri/target", target, "release/bundle")
  : resolve(root, "src-tauri/target/release/bundle");

const appDir   = resolve(targetDir, "macos");
const dmgDir   = resolve(targetDir, "dmg");
const builtDir = resolve(root, "built");
const dmgName  = `Youtube_${version}_${arch}.dmg`;
const dmgTemp  = resolve(dmgDir, dmgName);
const dmgOut   = resolve(builtDir, dmgName);

if (!existsSync(resolve(appDir, "Youtube.app"))) {
  console.error(`Youtube.app not found at: ${appDir}`);
  console.error("Run `npm run tauri:app` (or the CI build step) first.");
  process.exit(1);
}

mkdirSync(builtDir, { recursive: true });

// Remove stale hdiutil temp files from previous failed runs
execSync(
  `find "${dmgDir}" "${appDir}" -name 'rw.*.dmg' -delete 2>/dev/null || true`,
  { shell: true }
);
execSync(`rm -f "${dmgTemp}" "${dmgOut}"`, { shell: true });

const args = [
  "--volname",        "Youtube",
  "--window-pos",     "200", "120",
  "--window-size",    "660", "400",
  "--icon-size",      "128",
  "--icon",           "Youtube.app", "180", "170",
  "--app-drop-link",  "480", "170",
  "--hide-extension", "Youtube.app",
  "--skip-jenkins",
  dmgTemp,
  appDir,
];

console.log(`Building ${dmgName} from ${appDir}…`);
const result = spawnSync("create-dmg", args, { stdio: "inherit" });
if (result.status !== 0) {
  console.error("create-dmg failed:", result.status);
  process.exit(result.status ?? 1);
}

execSync(`mv "${dmgTemp}" "${dmgOut}"`);

const mb = (statSync(dmgOut).size / 1024 / 1024).toFixed(1);
console.log(`\n✓ built/${dmgName}  (${mb} MB)`);
