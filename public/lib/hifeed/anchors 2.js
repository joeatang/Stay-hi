// HI-OS S-ISL/3: feed skeleton + local append hook (dev-safe, reversible)

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  });
  children.forEach(c => n.appendChild(c));
  return n;
}

export function renderFeedSkeleton(container = document.getElementById('hiFeedContainer')) {
  if (!container) {
    console.warn('[S-ISL/3] missing #hiFeedContainer');
    return { ok: false, reason: 'missing container' };
  }
  if (container.dataset.sisl3 === 'ready') {
    return { ok: true, reason: 'already ready' };
  }

  // Header row
  const header = el('div', { class: 'hi-feed-header' }, [
    el('h2', { class: 'hi-feed-title', text: 'Hi Island — Community Feed' })
  ]);

  // List wrapper
  const list = el('div', { id: 'hiFeedList', class: 'hi-feed-list' });

  // Placeholder empty state
  const empty = el('div', { id: 'hiFeedEmpty', class: 'hi-feed-empty', text: 'No shares yet — be the first to post a Hi ✋' });

  container.appendChild(header);
  container.appendChild(list);
  container.appendChild(empty);

  container.dataset.sisl3 = 'ready';
  console.log('[S-ISL/3] Feed skeleton rendered', { container });
  return { ok: true };
}

export function appendHiCard({ text = '✨ New Hi!', user = 'Anonymous', ts = Date.now() } = {}) {
  const list = document.getElementById('hiFeedList');
  const empty = document.getElementById('hiFeedEmpty');
  if (!list) return console.warn('[S-ISL/3] appendHiCard: list missing');

  const date = new Date(ts).toLocaleString();
  const card = el('div', { class: 'hi-feed-card' }, [
    el('div', { class: 'hi-feed-card-top' }, [
      el('span', { class: 'hi-feed-user', text: user }),
      el('span', { class: 'hi-feed-ts', text: date })
    ]),
    el('p', { class: 'hi-feed-text', text })
  ]);
  list.prepend(card);
  if (empty) empty.style.display = 'none';

  console.log('[S-ISL/3] Hi card appended', { user, ts });
}

// Optional quick style shim (kept tiny, can move to CSS later)
const style = document.createElement('style');
style.textContent = `
  .hi-feed-header{display:flex;align-items:center;justify-content:space-between;margin:8px 0}
  .hi-feed-title{font-size:1.1rem;margin:0}
  .hi-feed-list{display:flex;flex-direction:column;gap:10px}
  .hi-feed-empty{opacity:0.7;padding:8px 0}
  .hi-feed-card{border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:12px;backdrop-filter:saturate(140%) blur(6px)}
  .hi-feed-card-top{display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.9rem;opacity:0.8}
  .hi-feed-user{font-weight:600}
  .hi-feed-text{margin:0;font-size:1rem;line-height:1.35}
`;
document.head.appendChild(style);