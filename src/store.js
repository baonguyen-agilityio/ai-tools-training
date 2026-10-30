// @ts-check
// JSON file persistence. The only module that touches the filesystem.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEEDS = {
  default: { expenses: resolve(ROOT, 'data/seed.json'), budgets: resolve(ROOT, 'data/seed-budgets.json') },
  demo: { expenses: resolve(ROOT, 'data/demo-seed.json'), budgets: resolve(ROOT, 'data/demo-budgets.json') },
};

/** Data file path; override with EXPENSES_FILE (used by tests). */
export function dataFile() {
  return resolve(ROOT, process.env.EXPENSES_FILE ?? 'data/expenses.json');
}

/** Budgets file path; override with BUDGETS_FILE (used by tests). */
export function budgetsFile() {
  return resolve(ROOT, process.env.BUDGETS_FILE ?? 'data/budgets.json');
}

/** Parsed JSON, or `fallback` when the file does not exist yet. Unparsable JSON throws. */
function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

/** @returns {import('./expenses.js').Expense[]} Empty list when the file does not exist yet. */
export function load() {
  return readJson(dataFile(), []);
}

/** @param {import('./expenses.js').Expense[]} expenses */
export function save(expenses) {
  writeJson(dataFile(), expenses);
}

/** @returns {Record<string, import('./budget.js').Budget>} Empty object when the file does not exist yet. */
export function loadBudgets() {
  return readJson(budgetsFile(), {});
}

/** @param {Record<string, import('./budget.js').Budget>} budgets */
export function saveBudgets(budgets) {
  writeJson(budgetsFile(), budgets);
}

/** Overwrite the expenses and budgets files with the default or demo seed pair. */
export function resetFromSeed({ demo = false } = {}) {
  const seed = demo ? SEEDS.demo : SEEDS.default;
  for (const [src, dest] of [[seed.expenses, dataFile()], [seed.budgets, budgetsFile()]]) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}
