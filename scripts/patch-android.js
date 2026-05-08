#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const filePath = join(
  __dirname,
  '../node_modules/@capacitor/geolocation/android/build.gradle'
);

if (!existsSync(filePath)) {
  console.log('[patch-android] @capacitor/geolocation not found, skipping.');
  process.exit(0);
}

const original = "apply plugin: 'kotlin-android'";
const patched  = "if (project.extensions.findByName('kotlin') == null) { apply plugin: 'kotlin-android' }";

let content = readFileSync(filePath, 'utf8');

if (content.includes(patched)) {
  console.log('[patch-android] Already patched.');
  process.exit(0);
}

if (!content.includes(original)) {
  console.log('[patch-android] Target string not found, skipping.');
  process.exit(0);
}

writeFileSync(filePath, content.replace(original, patched), 'utf8');
console.log('[patch-android] Patched @capacitor/geolocation/android/build.gradle ✓');
