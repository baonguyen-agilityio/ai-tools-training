// Minimal client: fetch from the API, render, re-fetch after every mutation.
const state = { page: 1, limit: 10, category: '', q: '' };
let listSeq = 0; // bumped per loadList(); a response for an older request is dropped
let summarySeq = 0; // same for loadSummary(), so an older month can't overwrite a newer one
let budgetSeq = 0; // same guard for loadBudget()
let noticeSeq = 0; // same guard for the post-add notice, so an older add can't overwrite a newer one
const CAPS = ['food', 'transport', 'bills', 'fun']; // mirrors BUDGET_CATEGORIES in src/budget.js (source of truth)

const $ = (sel) => document.querySelector(sel);
const rows = $('#expense-rows');
const pageInfo = $('#page-info');
const form = $('#expense-form');
const formError = $('#form-error');
const summaryMonth = $('#summary-month');
const budgetForm = $('#budget-form');
const budgetSource = $('#budget-source');
const budgetSaved = $('#budget-saved');
const budgetError = $('#budget-error');
const budgetNotice = $('#budget-notice');

async function api(path, init) {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status });
  return body;
}

async function loadList() {
  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.category) params.set('category', state.category);
  if (state.q) params.set('q', state.q);
  const seq = ++listSeq;
  const { items, total, page, limit } = await api(`/api/expenses?${params}`);
  if (seq !== listSeq) return;
  const pages = Math.max(1, Math.ceil(total / limit));

  rows.replaceChildren(
    ...items.map((e) => {
      const tr = document.createElement('tr');
      tr.dataset.testid = 'expense-row';
      tr.dataset.id = e.id;
      tr.innerHTML = `
        <td>${escapeHtml(e.date)}</td>
        <td class="amount">${escapeHtml(money(e.amount))}</td>
        <td>${escapeHtml(e.category)}</td>
        <td>${highlight(e.note, state.q)}</td>
        <td><button type="button" data-testid="delete-btn" data-id="${escapeHtml(e.id)}">Delete</button></td>`;
      return tr;
    }),
  );
  pageInfo.textContent = `Page ${page} of ${pages} (${total} total)`;
  $('#page-prev').disabled = page <= 1;
  $('#page-next').disabled = page >= pages;
}

async function loadSummary() {
  const month = summaryMonth.value;
  const seq = ++summarySeq;
  // Empty picker: nothing to show, and the bumped seq drops any response still in flight.
  if (!month) {
    $('#export-link').href = '#';
    $('#summary-total').textContent = '';
    delete $('#summary-total').dataset.state;
    $('#summary-categories').replaceChildren();
    return;
  }
  $('#export-link').href = `/api/export?month=${month}`;
  const data = await api(`/api/summary?month=${month}`);
  // Stale for the picker, but still right for its own month, so the post-add notice can use it.
  if (seq !== summarySeq) return data;
  const { total, byCategory, budget } = data;
  // Plain amount, or `spent / budget (Left: …)` with data-state when the line has a budget.
  const render = (el, label, amount, line) => {
    el.textContent = label + money(amount) + (line ? ` / ${money(line.budget)} ${statusText(line)}` : '');
    if (line) el.dataset.state = line.state;
    else delete el.dataset.state;
  };
  render($('#summary-total'), '', total, budget?.total);
  const caps = budget?.categories ?? {};
  // byCategory order first, then capped categories with no spend (API already orders caps).
  const cats = [...Object.keys(byCategory), ...Object.keys(caps).filter((c) => !(c in byCategory))];
  $('#summary-categories').replaceChildren(
    ...cats.map((cat) => {
      const li = document.createElement('li');
      li.dataset.testid = 'summary-category';
      li.dataset.category = cat;
      render(li, `${cat}: `, byCategory[cat] ?? 0, caps[cat]);
      return li;
    }),
  );
  return data;
}

// One line per warn/over budget line of a /api/summary response: the category cap, then the total (D4, R27).
// No summary (failed fetch) or no budget (D9) leaves the list empty and hidden.
function renderNotice(category, summary) {
  const budget = summary?.budget;
  const lines = [[category, budget?.categories?.[category]], ['total', budget?.total]].filter(([, l]) => l && l.state !== 'ok');
  budgetNotice.replaceChildren(
    ...lines.map(([name, l]) => {
      const li = document.createElement('li');
      li.dataset.testid = 'budget-notice-line';
      li.dataset.line = name;
      li.dataset.state = l.state;
      li.textContent = `${name}: ${l.state === 'over' ? 'over budget' : `${l.pct}% of budget`} ${statusText(l)}`;
      return li;
    }),
  );
  budgetNotice.hidden = !lines.length;
}

// Pre-fills the budget form with the month's effective budget; an inherited one is flagged (D3a).
async function loadBudget() {
  const month = summaryMonth.value;
  const seq = ++budgetSeq;
  const { source, budget } = month ? await api(`/api/budget?month=${month}`) : {}; // empty picker clears the form
  if (seq !== budgetSeq) return;
  const f = budgetForm.elements;
  f.total.value = budget ? money(budget.total) : '';
  for (const cat of CAPS) f[cat].value = budget?.categories[cat] ? money(budget.categories[cat]) : '';
  budgetSource.textContent = `copied from ${source}, not saved`;
  budgetSource.hidden = !source || source === month;
}

function hideBudgetMessages() {
  budgetSaved.hidden = true;
  budgetError.hidden = true;
}

/**
 * Escaped text with every literal, case-insensitive match of the search term
 * wrapped in <mark>. Matching runs on the raw note and escaping on each piece,
 * so the term can never match inside an escaped entity like &#39;.
 */
function highlight(text, q) {
  const s = String(text);
  if (!q) return escapeHtml(s);
  const lower = s.toLowerCase();
  const needle = q.toLowerCase();
  let out = '';
  let i = 0;
  for (let j = lower.indexOf(needle, i); j !== -1; j = lower.indexOf(needle, i)) {
    out += escapeHtml(s.slice(i, j)) + `<mark>${escapeHtml(s.slice(j, j + needle.length))}</mark>`;
    i = j + needle.length;
  }
  return out + escapeHtml(s.slice(i));
}

// Two decimals, same as the CSV export; non-numbers pass through untouched so they still render literally.
const money = (n) => (typeof n === 'number' ? n.toFixed(2) : n);

// `(Left: 50.00)` or `(Over by 35.50)` for one /api/summary budget line; shared with the post-add notice.
const statusText = ({ left }) => (left >= 0 ? `(Left: ${money(left)})` : `(Over by ${money(-left)})`);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// --- events ---
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  formError.hidden = true;
  const input = Object.fromEntries(new FormData(form));
  let created;
  try {
    created = await api('/api/expenses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
    return;
  }
  form.reset();
  const seq = ++noticeSeq;
  const month = created.date.slice(0, 7);
  const pickerMonth = summaryMonth.value;
  const summary = loadSummary();
  // Same month: reuse the summary just fetched (one request, R41); otherwise fetch the expense's month.
  const status = month === pickerMonth ? summary : api(`/api/summary?month=${month}`);
  const notice = status.then(
    (s) => seq === noticeSeq && renderNotice(created.category, s),
    () => seq === noticeSeq && renderNotice(), // failed status fetch hides the notice silently (R29)
  );
  // A failed summary is already handled by `notice` (same month) or harmless (other month): never unhandled (R29).
  await Promise.all([loadList(), summary.catch(() => {}), notice]);
});

budgetForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  hideBudgetMessages();
  const month = summaryMonth.value;
  const f = budgetForm.elements;
  // Numbers on the wire, empty caps omitted (R18).
  const categories = Object.fromEntries(CAPS.filter((cat) => f[cat].value).map((cat) => [cat, Number(f[cat].value)]));
  const failure = await api(`/api/budget?month=${month}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ total: Number(f.total.value), categories }),
  }).then(() => null, (err) => err);
  // Month changed mid-save: the form now shows another month, so neither outcome is reported there,
  // but a successful save may change what that month inherits, so it is still reloaded.
  const changed = summaryMonth.value !== month;
  if (failure) {
    if (!changed) {
      budgetError.textContent = failure.message;
      budgetError.hidden = false;
    }
    return;
  }
  if (!changed) {
    budgetSaved.textContent = `Saved for ${month}.`;
    budgetSaved.hidden = false;
  }
  await Promise.all([loadBudget(), loadSummary()]);
});

rows.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-testid="delete-btn"]');
  if (!btn) return;
  // The notice describes the last add only; any delete hides it, and the bump drops a pending add's notice (R42).
  ++noticeSeq;
  renderNotice();
  try {
    await api(`/api/expenses/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
  } catch (err) {
    // 404: already gone (stale page, double-click), nothing to report. Anything else is a real failure.
    if (err.status !== 404) throw err;
  } finally {
    await Promise.all([loadList(), loadSummary()]);
  }
});

$('#filter-category').addEventListener('change', (ev) => {
  state.category = ev.target.value.trim();
  state.page = 1;
  loadList();
});

$('#search-note').addEventListener('input', (ev) => {
  state.q = ev.target.value.trim();
  state.page = 1;
  loadList();
});

$('#page-prev').addEventListener('click', () => { state.page -= 1; loadList(); });
$('#page-next').addEventListener('click', () => { state.page += 1; loadList(); });
summaryMonth.addEventListener('change', loadSummary);
summaryMonth.addEventListener('change', () => { hideBudgetMessages(); loadBudget(); });

// --- init ---
summaryMonth.value = currentMonth();
loadList();
loadSummary();
loadBudget();
