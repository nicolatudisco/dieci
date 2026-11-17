#!/usr/bin/env node
/**
 * The repo is public: the starting point must never appear in it in clear.
 *
 *   node scripts/geodata/check-privacy.mjs                 every tracked or new file
 *   node scripts/geodata/check-privacy.mjs --message "…"   also a commit message
 *
 * Reads what to look for from origin.local.json (git-ignored): the name of the street, the
 * house number and the coordinates of the door and of the starting point, also truncated to
 * four decimals (about 10 m). Prints only file names and line numbers, never the secrets.
 * Exit code 1 if anything is found.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readOrigin } from './common.mjs';

const { private: secret } = readOrigin();

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = [];
if (secret.street) {
  patterns.push(new RegExp(escape(secret.street), 'i'));
  // The last word of the street name alone (the distinctive part).
  const word = secret.street.split(/\s+/).pop();
  if (word && word.length >= 5) patterns.push(new RegExp(escape(word), 'i'));
}
if (secret.houseNumber) {
  const [num, letter] = String(secret.houseNumber).split(/[\s/]+/);
  patterns.push(new RegExp(`(^|[^0-9A-Za-z+/=])${escape(num)}\\s*/?\\s*${escape(letter ?? '')}(?![0-9A-Za-z])`, letter ? 'i' : ''));
}
for (const point of [secret.origin, secret.door]) {
  if (!point) continue;
  for (const v of [point.lat, point.lon]) {
    const text = String(v);
    const dot = text.indexOf('.');
    if (dot > 0) patterns.push(new RegExp(escape(text.slice(0, dot + 5))));
  }
}

const args = process.argv.slice(2);
const messageIndex = args.indexOf('--message');
const message = messageIndex >= 0 ? (args[messageIndex + 1] ?? '') : null;

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const files = [...new Set([...git('ls-files').split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')])]
  .filter(Boolean)
  // Integrity hashes of the lockfile are random base64: they can contain anything.
  .filter((f) => f !== 'package-lock.json');

let found = 0;
const report = (where, i) => {
  found++;
  console.log(`  ${where}${i !== undefined ? `:${i + 1}` : ''}`);
};
for (const file of files) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
  const buffer = fs.readFileSync(full);
  if (buffer.includes(0)) continue; // binary
  const lines = buffer.toString('utf8').split('\n');
  lines.forEach((line, i) => {
    if (patterns.some((p) => p.test(line))) report(file, i);
  });
}
if (message !== null && patterns.some((p) => p.test(message))) report('messaggio del commit');

if (found) {
  console.log(`Privacy: ${found} righe contengono via, civico o coordinate del punto di partenza. Toglile prima del commit.`);
  process.exit(1);
}
console.log(`Privacy: nessuna traccia del punto di partenza in ${files.length} file.`);
