#!/usr/bin/env node
// Creates a distributable DMG using the system create-dmg tool.
// Uses --skip-jenkins to bypass AppleScript/Finder automation permission
// requirements — works in CI and on machines where that permission is blocked.

import { execSync, spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = pkg.version;

// Detect arch
const arch = process.arch === "arm64" ? "aarch64" : "x86_64";

const bundleDir = resolve(root, "src-tauri/target/release/bundle");
const appDir = resolve(bundleDir, "macos");
const dmgDir = resolve(bundleDir, "dmg");
const dmgPath = resolve(dmgDir, `GrayTube_${version}_${arch}.dmg`);

if (!existsSync(resolve(appDir, "GrayTube.app"))) {
  console.error("GrayTube.app not found — run `npm run tauri:app` first.");
  process.exit(1);
}

// Remove stale temp files that block hdiutil
execSync(`find "${dmgDir}" "${appDir}" -name 'rw.*.dmg' -delete 2>/dev/null || true`, { shell: true });

// Remove previous DMG so create-dmg doesn't refuse to overwrite
execSync(`rm -f "${dmgPath}"`, { shell: true });

const args = [
  "--volname", "GrayTube",
  "--window-pos", "200", "120",
  "--window-size", "660", "400",
  "--icon-size", "128",
  "--icon", "GrayTube.app", "180", "170",
  "--app-drop-link", "480", "170",
  "--hide-extension", "GrayTube.app",
  "--skip-jenkins",
  dmgPath,
  appDir,
];

console.log(`Building DMG: ${dmgPath}`);
const result = spawnSync("create-dmg", args, { stdio: "inherit" });

if (result.status !== 0) {
  console.error("create-dmg failed with exit code", result.status);
  process.exit(result.status ?? 1);
}

const { statSync } = await import("fs");
const size = (statSync(dmgPath).size / 1024 / 1024).toFixed(1);
console.log(`\nDone: GrayTube_${version}_${arch}.dmg (${size} MB)`);
