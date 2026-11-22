(() => {
'use strict';

/* ---------- constants ---------- */
const ORDER = ['Projects', 'Areas', 'Resources', 'Archive'];
const CATS = {
  Projects:  { bg: '#5B5BF0', fg: '#FFFFFF', sub: '#E3E4FF', desc: 'Active work',          tint: '#E6E8FF', ink: '#3F3FCB', icon: 'layers' },
  Areas:     { bg: '#0F766E', fg: '#FFFFFF', sub: '#D5F3EE', desc: 'Health · Money · Study', tint: '#D5F3EE', ink: '#0B5C55', icon: 'target' },
  Resources: { bg: '#FBBF24', fg: '#3B2A00', sub: '#5A4300', desc: 'Ideas · Inspiration',  tint: '#FEF3C7', ink: '#8A5A00', icon: 'star' },
  Archive:   { bg: '#475569', fg: '#FFFFFF', sub: '#E2E8F0', desc: 'Done · Dormant',       tint: '#E2E8F0', ink: '#334155', icon: 'archive' },
};
const ICON = {
  layers: '<path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 002 2h10a2 2 0 002-2V9"/><path d="M10 13h4"/>',
  doc: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cap: '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
const ic = (n, s = 20, sw = 2) =>
  `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
let items = [];
try { items = JSON.parse(store.get('mv_items', '[]')) || []; } catch (e) { items = []; }
const saveItems = () => store.set('mv_items', JSON.stringify(items));

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : d + 'd';
}
function dayLabel(ts) {
  const a = new Date(ts); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

/* ---------- AI (Vercel API) with on-device fallback ---------- */
function apiBase() { return (store.get('mv_api', '') || window.MV_API || '').replace(/\/$/, ''); }
function endpoint(p) {
  const b = apiBase();
  if (/REPLACE_ME/.test(b)) return null;
  if (b) return b + p;
  const h = location.hostname;
  if (/^https?:$/.test(location.protocol) && h !== 'localhost' && h !== '127.0.0.1') return p;
  return null;
}
const aiReady = () => !!endpoint('/api/classify');
async function post(path, body, ms) {
  const url = endpoint(path);
  if (!url) throw new Error('AI is not connected');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || 15000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
const STOP = new Set('about after again also because before being could every first from have into just like make more most much only other should some than that their them then there these they this those very what when where which while with would your'.split(' '));
function localClassify(text) {
  const t = text.toLowerCase();
  let category = 'Resources';
  if (/\b(project|launch|deadline|milestone|ship|build|plan|todo|sprint|release|redesign|test)\b/.test(t)) category = 'Projects';
  else if (/\b(health|workout|study|budget|money|habit|routine|sleep|family|career|diet|learn)\b/.test(t)) category = 'Areas';
  const freq = {};
  (t.match(/[a-z]{5,}/g) || []).forEach((w) => { if (!STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const tags = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 3);
  const title = text.trim().split(/\s+/).slice(0, 6).join(' ');
  return { title, category, tags, summary: '', source: 'local' };
}
async function classify(text) {
  try {
    const r = await post('/api/classify', { text });
    if (!r || !ORDER.includes(r.category)) throw new Error('bad reply');
    return { title: r.title || '', category: r.category, tags: r.tags || [], summary: r.summary || '', source: 'ai' };
  } catch (e) { return localClassify(text); }
}

/* ---------- state & navigation ---------- */
let view = { name: 'home' };
let stack = [];
let draft = {};
const go = (name, params) => { stack.push(view); view = Object.assign({ name }, params || {}); render(); };
const root = (name, params) => { stack = []; view = Object.assign({ name }, params || {}); render(); };
const back = () => { view = stack.pop() || { name: 'home' }; render(); };

/* ---------- components ---------- */
function itemRow(it) {
  const c = CATS[it.cat] || CATS.Resources;
  return `<button class="row" data-open="${esc(it.id)}">
    <div class="ic" style="background:${c.tint};color:${c.ink}">${ic(it.type === 'link' ? 'link' : 'doc')}</div>
    <div class="tx"><div class="ti">${esc(it.title)}</div>
    <div class="me">${it.ai ? '<b>AI sorted</b>' : ''}${esc(it.cat)}</div></div>
    <div class="tm">${timeAgo(it.created)}</div></button>`;
}
const listHtml = (arr, emptyMsg) => arr.length ? `<div class="list">${arr.map(itemRow).join('')}</div>` : `<div class="empty">${emptyMsg}</div>`;
const sorted = () => items.slice().sort((a, b) => b.created - a.created);
const topbar = (title, icon) => `<div class="top"><button class="rbtn" data-back aria-label="Back">${ic(icon || 'back')}</button><h2>${esc(title)}</h2><div style="width:44px"></div></div>`;

/* ---------- views ---------- */
function vHome() {
  const cards = ORDER.map((n) => {
    const c = CATS[n];
    const count = items.filter((i) => i.cat === n).length;
    return `<button class="cat" data-cat="${n}" style="background:${c.bg};color:${c.fg}">
      <div class="r"><div class="ib">${ic(c.icon)}</div><span class="n">${count}</span></div>
      <div><div class="t">${n}</div><div class="s" style="color:${c.sub}">${c.desc}</div></div></button>`;
  }).join('');
  return `<div class="top"><div><div class="mut">${greet()}</div><h1>Your vault</h1></div><button class="av" data-root="profile" aria-label="Profile">M</button></div>
    <button class="sbar" data-go="search">${ic('search')}<span>Ask or search your notes</span><b>AI</b></button>
    <div class="grid2">${cards}</div>
    <div class="sec"><h3>Recent</h3><button data-root="timeline">See all</button></div>
    ${listHtml(sorted().slice(0, 6), 'Nothing here yet. Tap + to save your first idea.')}`;
}
function vCat() {
  const arr = sorted().filter((i) => i.cat === view.cat);
  return `${topbar(view.cat)}${listHtml(arr, 'No items in ' + esc(view.cat) + ' yet.')}`;
}
function vTimeline() {
  const arr = sorted();
  let html = '<div class="top"><h1>Timeline</h1></div>';
  if (!arr.length) return html + '<div class="empty">Your saved items will appear here, newest first.</div>';
  let last = '';
  arr.forEach((it) => {
    const d = dayLabel(it.created);
    if (d !== last) { html += `<div class="day">${esc(d)}</div>`; last = d; }
    html += `<div class="list" style="margin-bottom:10px">${itemRow(it)}</div>`;
  });
  return html;
}
function vLibrary() {
  const f = view.filter || 'All';
  const chips = ['All'].concat(ORDER).map((n) => `<button class="chip ${n === f ? 'on' : ''}" data-filter="${n}">${n}</button>`).join('');
  const arr = sorted().filter((i) => f === 'All' || i.cat === f);
  return `<div class="top"><h1>Library</h1></div><div class="chips" style="margin-bottom:16px">${chips}</div>${listHtml(arr, 'Nothing in this view yet.')}`;
}
function vCapture() {
  return `${topbar('New item', 'close')}
    <div class="seg"><button data-type="note" class="on">Note</button><button data-type="link">Link</button></div>
    <div class="card editor"><input id="t" placeholder="Title" maxlength="120" aria-label="Title"><textarea id="b" placeholder="Write an idea..." aria-label="Content"></textarea></div>
    <div class="ai"><div class="aih">${ic('spark', 18)}AI suggests</div><div id="sugg"></div></div>
    <div class="err" id="err" role="alert"></div>
    <button class="primary" id="save">${ic('check', 20, 2.4)}Save to vault</button>`;
}
function vSearch() {
  return `<div class="top" style="margin-bottom:12px"><button class="rbtn" data-back aria-label="Back">${ic('back')}</button>
    <label class="sfield">${ic('search', 18)}<input id="q" placeholder="Ask or search your notes" aria-label="Search"></label></div>
    <div class="chips" id="flt"></div><div id="ans"></div>
    <div class="sec"><h3>Results</h3><span class="mut" id="cnt"></span></div><div id="res"></div>`;
}
function linkify(s) {
  return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function vItem() {
  const it = items.find((i) => i.id === view.id);
  if (!it) return `${topbar('Item')}<div class="empty">This item no longer exists.</div>`;
  const c = CATS[it.cat] || CATS.Resources;
  const related = sorted().filter((o) => o.id !== it.id && o.tags && it.tags && o.tags.some((t) => it.tags.includes(t))).slice(0, 3);
  return `<div class="top"><button class="rbtn" data-back aria-label="Back">${ic('back')}</button>
    <div style="display:flex;gap:8px"><button class="rbtn" data-act="archive" aria-label="Move to archive">${ic('archive')}</button><button class="rbtn danger" data-act="delete" aria-label="Delete">${ic('trash')}</button></div></div>
    <div class="tags"><span class="pill" style="background:${c.bg};color:${c.fg}">${esc(it.cat)}</span>${it.ai ? '<span class="pill" style="background:#E6E8FF;color:#3F3FCB">AI sorted</span>' : ''}</div>
    <h1>${esc(it.title)}</h1><div class="mut" style="margin-top:8px">Created ${esc(dayLabel(it.created))}</div>
    ${it.summary ? `<div class="sum"><div class="aih">${ic('spark', 18)}AI summary</div><p>${esc(it.summary)}</p></div>` : ''}
    ${it.body ? `<div class="card body">${linkify(it.body)}</div>` : ''}
    ${(it.tags || []).length ? `<div class="chips" style="margin-top:16px">${it.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    ${related.length ? `<div class="sec"><h3>Related</h3></div>${listHtml(related, '')}` : ''}`;
}
function vProfile() {
  return `<div class="top"><h1>Profile</h1></div>
    <div class="card"><h3>AI</h3><p class="mut" style="margin:6px 0 0">${aiReady() ? 'Connected. New items are sorted by AI and search can answer questions.' : 'Not connected. Items are sorted on your device. Add your Vercel address below to turn AI on.'}</p>
    <input class="field" id="apiurl" placeholder="https://your-app.vercel.app" value="${esc(store.get('mv_api', ''))}" autocapitalize="off" autocomplete="off" aria-label="AI server address">
    <button class="ghost" id="saveapi">Save address</button></div>
    <div class="card" style="margin-top:12px"><h3>Your data</h3><p class="mut" style="margin:6px 0 0">${items.length} item${items.length === 1 ? '' : 's'} stored on this device.</p>
    <button class="ghost" data-act="export">Copy backup to clipboard</button>
    <button class="ghost danger" data-act="clear">Delete everything</button></div>`;
}

/* ---------- mounts (views with live inputs) ---------- */
function mCapture() {
  draft = { type: 'note', cat: null, picked: false, tags: [], summary: '', aiTitle: '', source: 'local' };
  const t = $('#t'), b = $('#b'), sg = $('#sugg');
  let timer = 0, run = 0;
  const draw = (loading) => {
    if (loading) { sg.innerHTML = '<p class="mut" style="margin:0">Sorting…</p>'; return; }
    if (!draft.cat) { sg.innerHTML = '<p class="mut" style="margin:0">Start writing and I will sort it for you.</p>'; return; }
    sg.innerHTML = `<p class="lab">Place in</p><div class="chips">${ORDER.map((c) => `<button class="pick ${c === draft.cat ? 'on' : ''}" data-pick="${c}">${c}</button>`).join('')}</div>
      ${draft.tags.length ? `<p class="lab" style="margin-top:14px">Tags</p><div class="chips">${draft.tags.map((x) => `<span class="tag">#${esc(x)}</span>`).join('')}</div>` : ''}
      <p class="lab" style="margin:14px 0 0">${draft.source === 'ai' ? 'Sorted by AI' : 'Sorted on your device'}</p>`;
  };
  const suggest = async () => {
    const text = (t.value + '\n' + b.value).trim();
    if (text.length < 12) { draft.cat = null; draw(); return; }
    const my = ++run;
    draw(true);
    const r = await classify(text);
    if (my !== run) return;
    if (!draft.picked) draft.cat = r.category;
    if (!draft.cat) draft.cat = r.category;
    Object.assign(draft, { tags: r.tags, summary: r.summary, aiTitle: r.title, source: r.source });
    draw();
  };
  const sched = () => { clearTimeout(timer); timer = setTimeout(suggest, 900); };
  t.addEventListener('input', sched);
  b.addEventListener('input', sched);
  sg.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pick]');
    if (p) { draft.cat = p.dataset.pick; draft.picked = true; draw(); }
  });
  document.querySelectorAll('[data-type]').forEach((btn) => btn.addEventListener('click', () => {
    draft.type = btn.dataset.type;
    document.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('on', x === btn));
    b.placeholder = draft.type === 'link' ? 'Paste a link...' : 'Write an idea...';
  }));
  $('#save').addEventListener('click', async (e) => {
    const title = t.value.trim(), body = b.value.trim();
    if (!title && !body) { $('#err').textContent = 'Write something first.'; return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    if (!draft.cat) {
      const r = await classify(title + '\n' + body);
      Object.assign(draft, { cat: r.category, tags: r.tags, summary: r.summary, aiTitle: r.title, source: r.source });
    }
    items.unshift({
      id: uid(),
      title: title || draft.aiTitle || body.slice(0, 40),
      body,
      type: draft.type === 'link' || /^https?:\/\//i.test(body) ? 'link' : 'note',
      cat: draft.cat,
      tags: draft.tags,
      summary: draft.summary,
      ai: draft.source === 'ai',
      created: Date.now(),
    });
    saveItems();
    root('home');
  });
  draw();
}
function mSearch() {
  const q = $('#q'), res = $('#res'), cnt = $('#cnt'), ans = $('#ans'), flt = $('#flt');
  let filter = 'All', timer = 0, run = 0;
  const drawFilters = () => { flt.innerHTML = ['All'].concat(ORDER).map((n) => `<button class="chip ${n === filter ? 'on' : ''}" data-f="${n}">${n}</button>`).join(''); };
  const score = (it, toks) => {
    const ti = it.title.toLowerCase(), bo = (it.body || '').toLowerCase(), tg = (it.tags || []).join(' ');
    return toks.reduce((s, w) => s + (ti.includes(w) ? 3 : 0) + (bo.includes(w) ? 1 : 0) + (tg.includes(w) ? 2 : 0), 0);
  };
  const results = () => {
    const toks = q.value.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
    const pool = sorted().filter((i) => filter === 'All' || i.cat === filter);
    if (!toks.length) return pool.slice(0, 20);
    return pool.map((i) => [i, score(i, toks)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 20);
  };
  const update = () => {
    const arr = results();
    cnt.textContent = arr.length + (arr.length === 1 ? ' result' : ' results');
    res.innerHTML = listHtml(arr, q.value.trim() ? 'No matches. Try other words.' : 'Nothing saved yet.');
    ans.innerHTML = '';
    clearTimeout(timer);
    const text = q.value.trim();
    if (text.length < 4 || !arr.length || !aiReady()) return;
    const my = ++run;
    timer = setTimeout(async () => {
      ans.innerHTML = `<div class="ans"><div class="aih">${ic('spark', 18)}AI answer</div><p>Thinking…</p></div>`;
      try {
        const r = await post('/api/ask', { question: text, context: arr.slice(0, 5).map((i) => ({ title: i.title, body: i.body })) }, 20000);
        if (my !== run) return;
        ans.innerHTML = `<div class="ans"><div class="aih">${ic('spark', 18)}AI answer</div><p>${esc(r.answer)}</p></div>`;
      } catch (e) { if (my === run) ans.innerHTML = ''; }
    }, 900);
  };
  flt.addEventListener('click', (e) => { const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; drawFilters(); update(); } });
  q.addEventListener('input', update);
  drawFilters();
  update();
}
function mProfile() {
  $('#saveapi').addEventListener('click', () => { store.set('mv_api', $('#apiurl').value.trim()); render(); });
}

/* ---------- render ---------- */
const VIEWS = { home: vHome, cat: vCat, timeline: vTimeline, library: vLibrary, capture: vCapture, search: vSearch, item: vItem, profile: vProfile };
const MOUNTS = { capture: mCapture, search: mSearch, profile: mProfile };
function renderNav() {
  const nav = $('#nav');
  nav.classList.toggle('hide', view.name === 'capture');
  const on = (n) => (view.name === n || (n === 'home' && ['cat', 'item', 'search'].includes(view.name)) ? 'on' : '');
  nav.innerHTML = `
    <button class="nb ${on('home')}" data-root="home">${ic('home', 22)}Home</button>
    <button class="nb ${on('timeline')}" data-root="timeline">${ic('clock', 22)}Timeline</button>
    <button class="fab" data-go="capture" aria-label="Add new item">${ic('plus', 24, 2.4)}</button>
    <button class="nb ${on('library')}" data-root="library">${ic('cap', 22)}Library</button>
    <button class="nb ${on('profile')}" data-root="profile">${ic('user', 22)}Profile</button>`;
}
function render() {
  const app = $('#app');
  app.innerHTML = (VIEWS[view.name] || vHome)();
  app.scrollTop = 0;
  renderNav();
  if (MOUNTS[view.name]) MOUNTS[view.name]();
}

/* ---------- global events ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-open],[data-cat],[data-go],[data-root],[data-back],[data-act],[data-filter]');
  if (!el) return;
  const d = el.dataset;
  if (d.open) return go('item', { id: d.open });
  if (d.cat) return go('cat', { cat: d.cat });
  if (d.go) return go(d.go);
  if (d.root) return root(d.root);
  if (d.back !== undefined) return back();
  if (d.filter) { view.filter = d.filter; return render(); }
  if (d.act === 'archive') { const it = items.find((i) => i.id === view.id); if (it) { it.cat = 'Archive'; saveItems(); } return render(); }
  if (d.act === 'delete') { if (confirm('Delete this item?')) { items = items.filter((i) => i.id !== view.id); saveItems(); back(); } return; }
  if (d.act === 'export') {
    const txt = JSON.stringify(items, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => alert('Backup copied.'), () => alert('Could not copy.'));
    return;
  }
  if (d.act === 'clear') { if (confirm('Delete all items on this device? This cannot be undone.')) { items = []; saveItems(); render(); } }
});

try {
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (App && App.addListener) App.addListener('backButton', () => { if (stack.length) back(); else App.exitApp(); });
} catch (e) { /* not running inside the app */ }

render();
})();
