// @ts-check
// HTTP layer: static files from public/ and the JSON API. No framework.
import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as store from './store.js';
import { create, remove, list, summary, toCsv, MONTH_RE } from './expenses.js';
import { validateBudget, effectiveBudget, toWire } from './budget.js';

const PUBLIC_DIR = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/** @param {import('node:http').ServerResponse} res */
function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

/** @param {import('node:http').IncomingMessage} req */
async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('invalid JSON body'), { status: 400 });
  }
}

/** The validated month=YYYY-MM query param, or a 400 error. */
function readMonth(searchParams) {
  const month = searchParams.get('month') ?? '';
  if (!MONTH_RE.test(month)) {
    throw Object.assign(new Error('month must be YYYY-MM'), { status: 400 });
  }
  return month;
}

/** Serve a file under public/; "/" maps to index.html. */
async function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + sep)) return sendJson(res, 404, { error: 'not found' });
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: 'not found' });
  }
}

/** Route API requests. Throws { status, message } for client errors. */
async function handleApi(req, res, url) {
  const { method } = req;
  const { pathname, searchParams } = url;

  if (pathname === '/api/expenses') {
    if (method === 'GET') {
      const page = Number(searchParams.get('page') ?? 1);
      const limit = Number(searchParams.get('limit') ?? 10);
      const category = searchParams.get('category') ?? undefined;
      const q = searchParams.get('q') ?? undefined;
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
        throw Object.assign(new Error('page and limit must be positive integers'), { status: 400 });
      }
      return sendJson(res, 200, list(store.load(), { page, limit, category, q }));
    }
    if (method === 'POST') {
      const input = await readJson(req);
      let result;
      try {
        result = create(store.load(), input);
      } catch (err) {
        throw Object.assign(err, { status: 400 });
      }
      store.save(result.expenses);
      return sendJson(res, 201, result.created);
    }
    throw Object.assign(new Error('method not allowed'), { status: 405 });
  }

  const idMatch = pathname.match(/^\/api\/expenses\/([^/]+)$/);
  if (idMatch) {
    if (method !== 'DELETE') throw Object.assign(new Error('method not allowed'), { status: 405 });
    const id = decodeURIComponent(idMatch[1]);
    const result = remove(store.load(), id);
    if (!result.removed) throw Object.assign(new Error('expense not found'), { status: 404 });
    store.save(result.expenses);
    return sendJson(res, 200, { id });
  }

  if (pathname === '/api/summary') {
    if (method !== 'GET') throw Object.assign(new Error('method not allowed'), { status: 405 });
    return sendJson(res, 200, summary(store.load(), readMonth(searchParams)));
  }

  if (pathname === '/api/export') {
    if (method !== 'GET') throw Object.assign(new Error('method not allowed'), { status: 405 });
    const month = readMonth(searchParams);
    // Build the body before writing headers: a load failure must still reach the 500 handler.
    const csv = toCsv(store.load(), month);
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="expenses-${month}.csv"`,
    });
    return res.end(csv);
  }

  if (pathname === '/api/budget') {
    if (method !== 'GET' && method !== 'PUT') {
      throw Object.assign(new Error('method not allowed'), { status: 405 });
    }
    const month = readMonth(searchParams);
    if (method === 'PUT') {
      const input = await readJson(req);
      let next;
      try {
        next = validateBudget(input);
      } catch (err) {
        throw Object.assign(err, { status: 400 });
      }
      // Full replace of this month only; inherited months are computed, never written.
      store.saveBudgets({ ...store.loadBudgets(), [month]: next });
    }
    const { source, budget } = effectiveBudget(store.loadBudgets(), month);
    return sendJson(res, 200, { month, source, budget: budget && toWire(budget) });
  }

  throw Object.assign(new Error('not found'), { status: 404 });
}

/** Build the server without listening; tests bind it to an ephemeral port. */
export function createServer() {
  return createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
      else if (req.method === 'GET') await serveStatic(res, url.pathname);
      else sendJson(res, 405, { error: 'method not allowed' });
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) console.error(err);
      sendJson(res, status, { error: status === 500 ? 'internal error' : err.message });
    }
  });
}

// Run directly: `npm start`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => console.log(`http://localhost:${port}`));
}
