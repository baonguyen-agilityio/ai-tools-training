import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let dir;
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-'));
  process.env.EXPENSES_FILE = join(dir, 'expenses.json');
  process.env.BUDGETS_FILE = join(dir, 'budgets.json');
});
after(() => rmSync(dir, { recursive: true, force: true }));

test('store: resetFromSeed, load, save round-trip', async () => {
  const store = await import('../src/store.js');
  assert.ok(!existsSync(store.dataFile()));

  store.resetFromSeed();
  const seeded = store.load();
  assert.equal(seeded.length, 12);

  store.save([seeded[0]]);
  assert.deepEqual(store.load(), [seeded[0]]);
});
