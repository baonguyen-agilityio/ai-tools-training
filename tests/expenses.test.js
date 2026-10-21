import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, create, remove, list, summary, toCsv } from '../src/expenses.js';

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

test('validate: accepts the last real day of a month and rejects the day after', () => {
  for (const date of ['2026-01-31', '2026-04-30', '2026-12-31', '2028-02-29']) {
    assert.equal(validate({ date, amount: 1, category: 'a' }).date, date);
  }
  for (const date of ['2026-02-29', '2026-04-31', '2026-02-31']) {
    assert.throws(() => validate({ date, amount: 1, category: 'a' }), /date/, date);
  }
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

test('summary: totals have at most 2 decimals (BUG-002)', () => {
  const feb = summary(seed, '2026-02');
  assert.equal(feb.total, 315.29);
  assert.deepEqual(feb.byCategory, { food: 40.09, transport: 15.2, fun: 60, bills: 200 });

  const drift = [
    { id: 'x1', date: '2026-04-01', amount: 0.1, category: 'misc', note: '' },
    { id: 'x2', date: '2026-04-02', amount: 0.2, category: 'misc', note: '' },
  ];
  assert.deepEqual(summary(drift, '2026-04'), { month: '2026-04', total: 0.3, byCategory: { misc: 0.3 } });
});

test('summary: an expense dated the 1st stays in its month regardless of process timezone', () => {
  const tz = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const jan = summary(seed, '2026-01');
    assert.equal(jan.total, 186.25);
    assert.deepEqual(jan.byCategory, { food: 21.25, transport: 45, bills: 120 });
    const feb = summary(seed, '2026-02');
    assert.equal(feb.total, 315.29);
    assert.equal(feb.byCategory.food, 40.09);
  } finally {
    if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz;
  }
});

test('list: q matches notes case-insensitively and paging counts only the matches', () => {
  const { items, total, hasMore } = list(seed, { q: 'COFFEE' });
  assert.deepEqual(items.map((e) => e.id), ['a3']);
  assert.equal(total, 1);
  assert.equal(hasMore, false);
});

test('toCsv: BOM, header, then one quoted row per expense in the month, oldest first', () => {
  const csv = toCsv(seed, '2026-01');
  assert.ok(csv.startsWith('\ufeff'), 'starts with a UTF-8 BOM so Excel decodes it as UTF-8');
  const lines = csv.slice(1).trimEnd().split('\n');
  assert.equal(lines[0], 'date,amount,category,note');
  assert.equal(lines.length, 5);
  assert.equal(lines[1], '"2026-01-03","12.50","food","Lunch"');
});

test('toCsv: quotes delimiters and quotes inside fields and neutralises formula prefixes', () => {
  const rows = [
    { id: 'x1', date: '2026-05-01', amount: 1, category: 'food', note: 'Lunch, "team"\nday 2' },
    { id: 'x2', date: '2026-05-02', amount: 2, category: 'food', note: '=HYPERLINK("http://evil","x")' },
    { id: 'x3', date: '2026-05-03', amount: 3, category: '+bills', note: '-5' },
    { id: 'x4', date: '2026-05-04', amount: 4, category: 'fun', note: '@me' },
  ];
  const lines = toCsv(rows, '2026-05').slice(1).trimEnd().split('\n');
  assert.equal(lines.length, 6, 'the embedded newline stays inside its quoted field');
  assert.equal(lines[1] + '\n' + lines[2], '"2026-05-01","1.00","food","Lunch, ""team""\nday 2"');
  assert.equal(lines[3], `"2026-05-02","2.00","food","'=HYPERLINK(""http://evil"",""x"")"`);
  assert.equal(lines[4], `"2026-05-03","3.00","'+bills","'-5"`);
  assert.equal(lines[5], `"2026-05-04","4.00","fun","'@me"`);
});
