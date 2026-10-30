import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const isOctober = (e) => e.date.startsWith('2026-10-');

// The demo pair is copied to temp files by resetFromSeed({ demo: true }) and read back through store.
let dir, demoExpenses, demoBudgets, summaryWithBudget, validate;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-demo-'));
  process.env.EXPENSES_FILE = join(dir, 'expenses.json');
  process.env.BUDGETS_FILE = join(dir, 'budgets.json');
  const store = await import('../src/store.js');
  ({ summaryWithBudget } = await import('../src/budget.js'));
  ({ validate } = await import('../src/expenses.js'));
  store.resetFromSeed({ demo: true });
  demoExpenses = store.load();
  demoBudgets = store.loadBudgets();
});
after(() => rmSync(dir, { recursive: true, force: true }));

test('g-AC2: demo October total 1320.5 and byCategory figures', () => {
  const s = summaryWithBudget(demoExpenses, demoBudgets, '2026-10');
  assert.equal(s.total, 1320.5);
  assert.deepEqual(s.byCategory, { food: 450, transport: 120.5, bills: 620, fun: 100, coffee: 30 });
});

test('g-AC3: demo overall 88% warn, food 90% warn', () => {
  const { budget } = summaryWithBudget(demoExpenses, demoBudgets, '2026-10');
  assert.deepEqual(budget.total, { budget: 1500, spent: 1320.5, left: 179.5, pct: 88, state: 'warn' });
  assert.deepEqual(budget.categories.food, { budget: 500, spent: 450, left: 50, pct: 90, state: 'warn' });
});

test('g-AC4: demo fun 66% ok, categories exactly food, fun', () => {
  const { budget } = summaryWithBudget(demoExpenses, demoBudgets, '2026-10');
  assert.deepEqual(budget.categories.fun, { budget: 150, spent: 100, left: 50, pct: 66, state: 'ok' });
  assert.deepEqual(Object.keys(budget.categories), ['food', 'fun']);
});

test('g-AC5: 2026-09 has no budget', () => {
  assert.equal(summaryWithBudget(demoExpenses, demoBudgets, '2026-09').budget, null);
});

test('g-AC6: at least 12 October rows on 8 distinct days, all valid, unique ids', () => {
  const october = demoExpenses.filter(isOctober);
  assert.ok(october.length >= 12, `${october.length} October rows`);
  assert.ok(new Set(october.map((e) => e.date)).size >= 8);
  for (const e of demoExpenses) assert.doesNotThrow(() => validate(e), e.id);
  for (const { id, ...row } of october) assert.deepEqual(validate(row), row, id);
  assert.equal(new Set(demoExpenses.map((e) => e.id)).size, demoExpenses.length);
});

test('g-AC7: non-October rows equal data/seed.json', () => {
  assert.deepEqual(demoExpenses.filter((e) => !isOctober(e)), readJson('data/seed.json'));
});
