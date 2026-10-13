// @ts-check
import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PORT = 3100;
// Isolated data file so e2e never touches data/expenses.json.
const EXPENSES_FILE = join(tmpdir(), 'expense-tracker-e2e.json');

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: 'npm run seed && npm start',
    port: PORT,
    env: { PORT: String(PORT), EXPENSES_FILE },
    reuseExistingServer: false,
  },
});
