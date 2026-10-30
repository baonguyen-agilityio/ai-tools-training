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
/** Month key as used by summary/export/MCP tools. */
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Round a user-supplied amount to cents. */
const round2 = (n) => Math.round(n * 100) / 100;
/** True only for real calendar days: Date.parse rolls 2026-02-31 over to March 3, so round-trip it. */
const isRealDate = (s) => {
  const t = Date.parse(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

/**
 * Validate and normalize user input into an Expense (without id).
 * @param {Record<string, unknown>} input
 * @returns {Omit<Expense, 'id'>}
 * @throws {Error} on invalid input
 */
export function validate(input) {
  const date = String(input.date ?? '');
  if (!DATE_RE.test(date) || !isRealDate(date)) {
    throw new Error('date must be YYYY-MM-DD');
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  const category = String(input.category ?? '').trim().toLowerCase();
  if (!category) throw new Error('category is required');
  const note = String(input.note ?? '').trim();
  return { date, amount: round2(amount), category, note };
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
 * Newest first, optional category filter and note search, 1-based pages.
 * @param {Expense[]} expenses
 * @param {{ page?: number, limit?: number, category?: string, q?: string }} [opts]
 * @returns {{ items: Expense[], page: number, limit: number, total: number }}
 */
export function list(expenses, { page = 1, limit = 10, category, q } = {}) {
  const cat = category?.toLowerCase();
  const needle = q?.trim().toLowerCase();
  // Filter first so items, total and hasMore all describe the same set.
  const matches = expenses
    .filter((e) => (!cat || e.category === cat) && (!needle || e.note.toLowerCase().includes(needle)))
    .sort((a, b) => b.date.localeCompare(a.date));
  const offset = (page - 1) * limit;
  const hasMore = offset + limit < matches.length;
  return { items: matches.slice(offset, offset + limit), page, limit, total: matches.length, hasMore };
}

/**
 * Total and per-category totals for one month, in integer cents.
 * @param {Expense[]} expenses
 * @param {string} month  YYYY-MM
 * @returns {{ cents: number, byCategory: Record<string, number> }}
 */
export function monthCents(expenses, month) {
  // Compare the YYYY-MM prefix as text: parsing a date-only string yields UTC
  // midnight, and reading it back in local time shifts the 1st into the
  // previous month west of UTC.
  const inMonth = expenses.filter((e) => e.date.slice(0, 7) === month);
  // Sum in integer cents so float drift never reaches the result.
  let cents = 0;
  /** @type {Record<string, number>} */
  const byCategory = {};
  for (const e of inMonth) {
    const c = Math.round(e.amount * 100);
    cents += c;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + c;
  }
  return { cents, byCategory };
}

/**
 * Total and per-category totals for one month.
 * @param {Expense[]} expenses
 * @param {string} month  YYYY-MM
 * @returns {{ month: string, total: number, byCategory: Record<string, number> }}
 */
export function summary(expenses, month) {
  const { cents, byCategory: centsByCategory } = monthCents(expenses, month);
  /** @type {Record<string, number>} */
  const byCategory = {};
  for (const k in centsByCategory) byCategory[k] = centsByCategory[k] / 100;
  return { month, total: cents / 100, byCategory };
}

const CSV_HEADER = 'date,amount,category,note';
// Byte-order mark: without it Excel reads a double-clicked .csv as the legacy ANSI codepage.
const CSV_BOM = '\ufeff';

/**
 * RFC 4180 field: always quoted, inner quotes doubled. A leading = + - @ is
 * prefixed with an apostrophe so spreadsheets show it as text, not a formula.
 * @param {unknown} value
 */
function csvField(value) {
  const s = String(value);
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
}

/**
 * One month of expenses as CSV, oldest first, header row included.
 * @param {Expense[]} expenses
 * @param {string} month  YYYY-MM
 * @returns {string}
 */
export function toCsv(expenses, month) {
  const rows = expenses
    .filter((e) => e.date.slice(0, 7) === month)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [e.date, e.amount.toFixed(2), e.category, e.note].map(csvField).join(','));
  return CSV_BOM + [CSV_HEADER, ...rows].join('\n') + '\n';
}
