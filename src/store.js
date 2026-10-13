// @ts-check
// JSON file persistence. The only module that touches the filesystem.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_FILE = resolve(ROOT, 'data/seed.json');

/** Data file path; override with EXPENSES_FILE (used by tests). */
export function dataFile() {
  return resolve(ROOT, process.env.EXPENSES_FILE ?? 'data/expenses.json');
}

/** @returns {import('./expenses.js').Expense[]} Empty list when the file does not exist yet. */
export function load() {
  try {
    return JSON.parse(readFileSync(dataFile(), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** @param {import('./expenses.js').Expense[]} expenses */
export function save(expenses) {
  mkdirSync(dirname(dataFile()), { recursive: true });
  writeFileSync(dataFile(), JSON.stringify(expenses, null, 2) + '\n');
}

/** Overwrite the data file with seed data. */
export function resetFromSeed() {
  mkdirSync(dirname(dataFile()), { recursive: true });
  copyFileSync(SEED_FILE, dataFile());
}
