// @ts-check
// Budget domain logic. Pure functions, no I/O. Money is integer cents except on the wire.
import { MONTH_RE, monthCents, summary } from './expenses.js';

/**
 * @typedef {object} Budget
 * @property {number} total                       integer cents, > 0
 * @property {Record<string, number>} categories  cap per category, integer cents, > 0
 */

/** Categories that may carry a cap, in display order. */
export const BUDGET_CATEGORIES = ['food', 'transport', 'bills', 'fun'];

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Currency input → integer cents, or null when not a positive amount after rounding. */
const toCents = (v) => {
  const cents = Math.round(Number(v) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
};

/**
 * Validate a wire budget and convert it to cents. Checks run in a fixed order so the
 * first error is predictable: body → total → categories type → each key in insertion order.
 * @param {unknown} input
 * @returns {Budget}
 * @throws {Error} on invalid input
 */
export function validateBudget(input) {
  if (!isPlainObject(input)) throw new Error('body must be an object');
  const total = toCents(input.total);
  if (total === null) throw new Error('total must be a positive number');
  const raw = input.categories === undefined ? {} : input.categories;
  if (!isPlainObject(raw)) throw new Error('categories must be an object');
  /** @type {Record<string, number>} */
  const categories = {};
  for (const [key, value] of Object.entries(raw)) {
    const cat = key.trim().toLowerCase();
    if (!BUDGET_CATEGORIES.includes(cat)) {
      throw new Error(`${cat}: category must be one of ${BUDGET_CATEGORIES.join(', ')}`);
    }
    if (cat in categories) throw new Error(`${cat}: duplicate category`);
    const cents = toCents(value);
    if (cents === null) throw new Error(`${cat} cap must be a positive number`);
    categories[cat] = cents;
  }
  return { total, categories };
}

/**
 * The month's own budget, else the nearest earlier saved month's, else none.
 * Keys that are not YYYY-MM are ignored, and so is a month that is not; valid keys compare as strings.
 * @param {Record<string, Budget>} budgets
 * @param {string} month  YYYY-MM
 * @returns {{ source: string | null, budget: Budget | null }}
 */
export function effectiveBudget(budgets, month) {
  if (!MONTH_RE.test(month)) return { source: null, budget: null };
  let source = null;
  for (const key of Object.keys(budgets)) {
    if (MONTH_RE.test(key) && key <= month && (source === null || key > source)) source = key;
  }
  return { source, budget: source === null ? null : budgets[source] };
}

/**
 * Cents → currency numbers for API responses.
 * @param {Budget} b
 */
export function toWire(b) {
  const categories = Object.fromEntries(Object.entries(b.categories).map(([k, v]) => [k, v / 100]));
  return { total: b.total / 100, categories };
}

/** One budget line on the wire. Thresholds and pct are integer-cents math (R10). */
function line(spentCents, budgetCents) {
  const state = spentCents >= budgetCents ? 'over' : spentCents * 100 >= budgetCents * 80 ? 'warn' : 'ok';
  return {
    budget: budgetCents / 100,
    spent: spentCents / 100,
    left: (budgetCents - spentCents) / 100,
    pct: Math.floor((spentCents * 100) / budgetCents),
    state,
  };
}

/**
 * Spent / left / pct / state for the overall budget and each capped category, in currency.
 * Categories follow BUDGET_CATEGORIES order; uncapped categories count toward the total only.
 * @param {import('./expenses.js').Expense[]} expenses
 * @param {Record<string, Budget>} budgets
 * @param {string} month  YYYY-MM
 */
export function budgetStatus(expenses, budgets, month) {
  const { source, budget } = effectiveBudget(budgets, month);
  if (!budget) return null;
  const { cents, byCategory } = monthCents(expenses, month);
  const categories = Object.fromEntries(
    BUDGET_CATEGORIES.filter((c) => c in budget.categories).map((c) => [c, line(byCategory[c] ?? 0, budget.categories[c])]),
  );
  return { source, total: line(cents, budget.total), categories };
}

/**
 * The monthly summary plus its budget status (null when the month has none).
 * @param {import('./expenses.js').Expense[]} expenses
 * @param {Record<string, Budget>} budgets
 * @param {string} month  YYYY-MM
 */
export function summaryWithBudget(expenses, budgets, month) {
  return { ...summary(expenses, month), budget: budgetStatus(expenses, budgets, month) };
}
