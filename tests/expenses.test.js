import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, create, remove, list, summary } from '../src/expenses.js';

const seed = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url), 'utf8'));

test('validate: normalizes a valid input', () => {
  const out = validate({ date: '2026-03-01', amount: '12.345', category: ' Food ', note: ' x ' });
  assert.deepEqual(out, { date: '2026-03-01', amount: 12.35, category: 'food', note: 'x' });
});

test('validate: rejects bad date, amount, category', () => {
  assert.throws(() => validate({ date: '03/01/2026', amount: 1, category: 'a' }), /date/);
  assert.throws(() => validate({ date: '2026-13-01', amount: 1, category: 'a' }), /date/);
  assert.throws(() => validate({ date: '2026-03-01', amount: 0, category: 'a' }), /amount/);
  assert.throws(() => validate({ date: '2026-03-01', amount: 'abc', category: 'a' }), /amount/);
  assert.throws(() => validate({ date: '2026-03-01', amount: 1, category: '' }), /category/);
});

test('create: appends with a fresh id and does not mutate input list', () => {
  const { expenses, created } = create(seed, { date: '2026-03-20', amount: 5, category: 'food' });
  assert.equal(expenses.length, seed.length + 1);
  assert.equal(seed.length, 12);
  assert.ok(created.id);
  assert.equal(expenses.at(-1), created);
});

test('remove: drops the matching expense', () => {
  const { expenses, removed } = remove(seed, 'a1');
  assert.equal(removed?.id, 'a1');
  assert.equal(expenses.length, seed.length - 1);
  assert.ok(!expenses.some((e) => e.id === 'a1'));
});

test('list: defaults to newest first with total count', () => {
  const out = list(seed);
  assert.equal(out.total, 12);
  assert.equal(out.page, 1);
  assert.equal(out.limit, 10);
  assert.equal(out.items.length, 10);
  assert.equal(out.items[0].date, '2026-03-15');
});

test('list: honors limit and category filter', () => {
  assert.equal(list(seed, { limit: 3 }).items.length, 3);
  const food = list(seed, { category: 'Food' });
  assert.equal(food.total, 5);
  assert.ok(food.items.every((e) => e.category === 'food'));
});

test('list: second page returns the remaining oldest items', () => {
  const out = list(seed, { page: 2, limit: 10 });
  assert.equal(out.items.length, 2);
  assert.deepEqual(out.items.map((e) => e.date), ['2026-01-10', '2026-01-03']);
});

test('list: full middle page and short last page with a small limit', () => {
  const p2 = list(seed, { page: 2, limit: 5 });
  assert.deepEqual(
    p2.items.map((e) => e.date),
    ['2026-02-14', '2026-02-05', '2026-02-01', '2026-01-28', '2026-01-15'],
  );
  const p3 = list(seed, { page: 3, limit: 5 });
  assert.deepEqual(p3.items.map((e) => e.date), ['2026-01-10', '2026-01-03']);
  assert.equal(p3.total, 12);
});

test('summary: totals one month by category', () => {
  const out = summary(seed, '2026-01');
  assert.equal(out.total, 186.25);
  assert.deepEqual(out.byCategory, { food: 21.25, transport: 45, bills: 120 });
});

test('summary: empty month', () => {
  assert.deepEqual(summary(seed, '2025-12'), { month: '2025-12', total: 0, byCategory: {} });
});
