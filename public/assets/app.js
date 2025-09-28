// Minimal shared UI + session helpers for static HTML pages
window.StayHi = (() => {
  const HEADER_ID = 'app-header';

  async function me() {
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'me' })
      });
      const data = await r.json();
      return r.ok ? data : null;
    } catch {
      return null;
    }
  }

  function headerHTML({ user, active }) {
    const links = [
      { href: '/', label: 'Home' },
      { href: '/hi-island.html', label: 'Hi Island' },
      { href: '/profile.html', label: 'Profile' },
    ];
    return `
      <div class="header-inner">
        <a class="brand" href="/">Stay Hi</a>
        <nav class="nav">
          ${links.map(l => `
            <a class="nav-link ${active === l.label ? 'active' : ''}" href="${l.href}">${l.label}</a>
          `).join('')}
        </nav>
        <div class="spacer"></div>
        <div class="auth">
          ${user ? `
            <span class="user">@${(user.username || user.email || 'you')}</span>
            <button id="btn-logout" class="link">Logout</button>
          ` : `
            <a class="link" href="/signin.html">Sign in</a>
          `}
        </div>
      </div>
    `;
  }

  async function initHeader({ active } = {}) {
    const session = await me();
    const header = document.getElementById(HEADER_ID);
    if (header) {
      header.innerHTML = headerHTML({ user: session?.user, active });
      const btn = document.getElementById('btn-logout');
      if (btn) {
        btn.addEventListener('click', async () => {
          try {
            const r = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'logout' })
            });
            // ignore response, just go home
          } finally {
            window.location.href = '/';
          }
        });
      }
    }
    return session;
  }

  return { initHeader, me };
})();
