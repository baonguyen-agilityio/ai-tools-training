// Minimal client: fetch from the API, render, re-fetch after every mutation.
const state = { page: 1, limit: 10, category: '' };

const $ = (sel) => document.querySelector(sel);
const rows = $('#expense-rows');
const pageInfo = $('#page-info');
const form = $('#expense-form');
const formError = $('#form-error');
const summaryMonth = $('#summary-month');

async function api(path, init) {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body;
}

async function loadList() {
  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.category) params.set('category', state.category);
  const { items, total, page, limit } = await api(`/api/expenses?${params}`);
  const pages = Math.max(1, Math.ceil(total / limit));

  rows.replaceChildren(
    ...items.map((e) => {
      const tr = document.createElement('tr');
      tr.dataset.testid = 'expense-row';
      tr.dataset.id = e.id;
      tr.innerHTML = `
        <td>${escapeHtml(e.date)}</td>
        <td class="amount">${escapeHtml(e.amount)}</td>
        <td>${escapeHtml(e.category)}</td>
        <td>${escapeHtml(e.note)}</td>
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
  if (!month) return;
  const { total, byCategory } = await api(`/api/summary?month=${month}`);
  $('#summary-total').textContent = total;
  $('#summary-categories').replaceChildren(
    ...Object.entries(byCategory).map(([cat, amt]) => {
      const li = document.createElement('li');
      li.dataset.testid = 'summary-category';
      li.dataset.category = cat;
      li.textContent = `${cat}: ${amt}`;
      return li;
    }),
  );
}

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
  try {
    await api('/api/expenses', {
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
  await Promise.all([loadList(), loadSummary()]);
});

rows.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-testid="delete-btn"]');
  if (!btn) return;
  try {
    await api(`/api/expenses/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
  } catch {
    // Already gone (stale page, double-click) or failed: the refresh shows the real state.
  }
  await Promise.all([loadList(), loadSummary()]);
});

$('#filter-category').addEventListener('change', (ev) => {
  state.category = ev.target.value.trim();
  state.page = 1;
  loadList();
});

$('#page-prev').addEventListener('click', () => { state.page -= 1; loadList(); });
$('#page-next').addEventListener('click', () => { state.page += 1; loadList(); });
summaryMonth.addEventListener('change', loadSummary);

// --- init ---
summaryMonth.value = currentMonth();
loadList();
loadSummary();
