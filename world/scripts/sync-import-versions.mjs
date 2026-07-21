#!/usr/bin/env node
/**
 * Sync ?v= cache-bust query params from js/version.js (ASSET_VERSION).
 * Run automatically before dev, or manually: npm run sync-versions
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const VERSION_FILE = join(ROOT, "js", "version.js");
const JS_DIR = join(ROOT, "js");
const INDEX_HTML = join(ROOT, "index.html");

const IMPORT_PATTERN = /(\.(?:js|css))(?:\?v=[^"'&]+)?(?=["'])/g;

function readAssetVersion() {
  const source = readFileSync(VERSION_FILE, "utf8");
  const match = source.match(/export const ASSET_VERSION = "(\d+)"/);
  if (!match) {
    throw new Error("Could not read ASSET_VERSION from " + VERSION_FILE);
  }
  return match[1];
}

function walkJsFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      walkJsFiles(fullPath, files);
      continue;
    }
    if (entry.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

function syncImportVersions(content, version) {
  return content.replace(IMPORT_PATTERN, "$1?v=" + version);
}

function syncFile(path, version) {
  const original = readFileSync(path, "utf8");
  const updated = syncImportVersions(original, version);
  if (updated !== original) {
    writeFileSync(path, updated, "utf8");
    return true;
  }
  return false;
}

function main() {
  const version = readAssetVersion();
  let changed = 0;

  for (const filePath of walkJsFiles(JS_DIR)) {
    if (syncFile(filePath, version)) {
      changed += 1;
      console.log("updated " + relative(ROOT, filePath));
    }
  }

  if (syncFile(INDEX_HTML, version)) {
    changed += 1;
    console.log("updated " + relative(ROOT, "index.html"));
  }

  console.log("ASSET_VERSION=" + version + " (" + changed + " file(s) updated)");
}

main();
