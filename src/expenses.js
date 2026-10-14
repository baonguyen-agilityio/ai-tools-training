// @ts-check
// Domain logic. Pure functions over an in-memory list; no I/O.
import { randomUUID } from 'node:crypto';

/**
 * @typedef {object} Expense
 * @property {string} id
 * @property {string} date      ISO date, YYYY-MM-DD
 * @property {number} amount    positive, max 2 decimals
 * @property {string} category  lowercase slug
 * @property {string} note
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate and normalize user input into an Expense (without id).
 * @param {Record<string, unknown>} input
 * @returns {Omit<Expense, 'id'>}
 * @throws {Error} on invalid input
 */
export function validate(input) {
  const date = String(input.date ?? '');
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error('date must be YYYY-MM-DD');
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  const category = String(input.category ?? '').trim().toLowerCase();
  if (!category) throw new Error('category is required');
  const note = String(input.note ?? '').trim();
  return { date, amount: Math.round(amount * 100) / 100, category, note };
}

/**
 * @param {Expense[]} expenses
 * @param {Record<string, unknown>} input
 * @returns {{ expenses: Expense[], created: Expense }}
 */
export function create(expenses, input) {
  const created = { id: randomUUID(), ...validate(input) };
  return { expenses: [...expenses, created], created };
}

/**
 * @param {Expense[]} expenses
 * @param {string} id
 * @returns {{ expenses: Expense[], removed: Expense | null }}
 */
export function remove(expenses, id) {
  const removed = expenses.find((e) => e.id === id) ?? null;
  return { expenses: expenses.filter((e) => e.id !== id), removed };
}

/**
 * Newest first, optional category filter, 1-based pages.
 * @param {Expense[]} expenses
 * @param {{ page?: number, limit?: number, category?: string }} [opts]
 * @returns {{ items: Expense[], page: number, limit: number, total: number }}
 */
export function list(expenses, { page = 1, limit = 10, category } = {}) {
  const filtered = category
    ? expenses.filter((e) => e.category === category.toLowerCase())
    : expenses;
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const offset = (page - 1) * limit;
  const hasMore = offset + limit < sorted.length;
  return { items: sorted.slice(offset, limit), page, limit, total: sorted.length, hasMore };
}

/**
 * Total and per-category totals for one month.
 * @param {Expense[]} expenses
 * @param {string} month  YYYY-MM
 * @returns {{ month: string, total: number, byCategory: Record<string, number> }}
 */
export function summary(expenses, month) {
  const inMonth = expenses.filter((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === month;
  });
  let total = 0;
  /** @type {Record<string, number>} */
  const byCategory = {};
  for (const e of inMonth) {
    total += e.amount;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  return { month, total, byCategory };
}
