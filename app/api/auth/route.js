// /api/auth.js  (Vercel Node serverless function, CommonJS + fetch to Supabase REST)

const COOKIE_NAME = 'stayhi_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getEnv(name) {
  try { return process.env[name]; } catch { return undefined; }
}

function readCookie(header, name) {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function cookieHeaderForSession(session) {
  const val = encodeURIComponent(JSON.stringify(session));
  return `${COOKIE_NAME}=${val}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`;
}

function baseUrl() {
  const u = getEnv('SUPABASE_URL') || '';
  return u.replace(/\/+$/, '');
}

function hasEnv() {
  return {
    hasUrl: !!getEnv('SUPABASE_URL'),
    hasKey: !!getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    urlLooksRight: /^https?:\/\/.+\.supabase\.co/.test(getEnv('SUPABASE_URL') || '')
  };
}

// generic Supabase REST fetch
async function sfetch(path, init = {}) {
  const url = `${baseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = Object.assign(
    {
      Authorization: `Bearer ${getEnv('SUPABASE_SERVICE_ROLE_KEY')}`,
      apikey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },
    init.headers || {}
  );
  const res = await fetch(url, { ...init, headers });
  return res;
}

// users helpers (REST)
async function selectUserByEmail(email) {
  const res = await sfetch(`/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email,username,avatar_url&limit=1`, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`users select failed: ${res.status}`);
  const rows = await res.json();
  return rows?.[0] || null;
}

async function insertUser(email) {
  const res = await sfetch(`/rest/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error(`users insert failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows?.[0] || null;
}

async function ensureUserRow(email) {
  const got = await selectUserByEmail(email);
  if (got) return got;
  return await insertUser(email);
}

async function updateUserById(id, patch) {
  const res = await sfetch(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(`users update failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows?.[0] || null;
}

function validUsername(x) {
  return /^[a-zA-Z0-9._-]{2,32}$/.test(String(x || ''));
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  const mime = m[1];
  const base64 = m[2];
  const buf = Buffer.from(base64, 'base64');
  let ext = 'png';
  if (mime === 'image/jpeg') ext = 'jpg';
  else if (mime === 'image/webp') ext = 'webp';
  else if (mime === 'image/png') ext = 'png';
  return { mime, buffer: buf, ext };
}

async function uploadAvatar(userId, dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('bad-image');
  const objectPath = `${encodeURIComponent(userId)}/${Date.now()}.${parsed.ext}`;

  // PUT bytes
  const res = await sfetch(`/storage/v1/object/avatars/${objectPath}`, {
    method: 'PUT',
    headers: {
      'Content-Type': parsed.mime,
      'x-upsert': 'true'
    },
    body: parsed.buffer
  });
  if (!res.ok) throw new Error(`upload failed ${res.status} ${await res.text()}`);

  // if bucket is public, we can build the public URL
  const publicUrl = `${baseUrl()}/storage/v1/object/public/avatars/${objectPath}`;
  return publicUrl;
}

async function readJsonBody(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body; // Vercel sometimes parses for us
  } catch {}
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const txt = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(txt || '{}'); } catch { return {}; }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = await readJsonBody(req);
    const { action } = body || {};

    // -------- health
    if (action === 'health') {
      const envs = hasEnv();
      let dbOk = false;
      let storageOk = false;
      const diag = {};

      try {
        if (envs.hasUrl && envs.hasKey) {
          // users table check
          const r1 = await sfetch(`/rest/v1/users?select=id&limit=1`, { headers: { Accept: 'application/json' } });
          dbOk = r1.ok;
          if (!r1.ok) diag.usersErr = await r1.text();

          // storage check (list buckets)
          const r2 = await sfetch(`/storage/v1/bucket`, { headers: { Accept: 'application/json' } });
          storageOk = r2.ok;
          if (!r2.ok) diag.storageErr = await r2.text();
        }
      } catch (e) {
        diag.healthCatch = String(e);
      }

      res.status(200).json({ ok: true, envs, dbOk, storageOk, diag });
      return;
    }

    // -------- me (from cookie)
    if (action === 'me') {
      const raw = readCookie(req.headers.cookie || '', COOKIE_NAME);
      if (!raw) {
        res.status(200).json({ ok: true, user: null });
        return;
      }
      try {
        const s = JSON.parse(raw);
        if (!s?.id || !s?.email) {
          res.status(200).json({ ok: true, user: null });
          return;
        }
        res.status(200).json({ ok: true, user: s });
        return;
      } catch {
        res.status(200).json({ ok: true, user: null });
        return;
      }
    }

    // -------- logout
    if (action === 'logout') {
      res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
      res.status(200).json({ ok: true });
      return;
    }

    // -------- signin (demo)
    if (action === 'signin') {
      const { email, password } = body || {};
      if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
      if (String(password).length < 6) return res.status(401).json({ error: 'Invalid credentials' });

      const session = {
        id: `user_${Date.now()}`,
        email: String(email).toLowerCase(),
        username: null,
        avatar_url: null,
        isAdmin: false
      };

      try {
        const row = await ensureUserRow(session.email);
        if (row) {
          session.username = row.username || null;
          session.avatar_url = row.avatar_url || null;
        }
      } catch {}

      res.setHeader('Set-Cookie', cookieHeaderForSession(session));
      res.status(200).json({ ok: true, user: session });
      return;
    }

    // -------- signup (demo)
    if (action === 'signup') {
      const { email, password, inviteCode } = body || {};
      if (!email || !password || !inviteCode) return res.status(400).json({ error: 'Missing fields' });
      if (String(password).length < 6) return res.status(400).json({ error: 'Weak password' });

      const session = {
        id: `user_${Date.now()}`,
        email: String(email).toLowerCase(),
        username: null,
        avatar_url: null,
        isAdmin: false
      };

      try {
        const row = await ensureUserRow(session.email);
        if (row) {
          session.username = row.username || null;
          session.avatar_url = row.avatar_url || null;
        }
      } catch {}

      res.setHeader('Set-Cookie', cookieHeaderForSession(session));
      res.status(200).json({ ok: true, user: session });
      return;
    }

    // -------- profile.update
    if (action === 'profile.update') {
      const raw = readCookie(req.headers.cookie || '', COOKIE_NAME);
      if (!raw) return res.status(401).json({ error: 'Not signed in' });

      let session;
      try { session = JSON.parse(raw); } catch { return res.status(401).json({ error: 'Bad session' }); }
      if (!session?.email) return res.status(401).json({ error: 'Bad session' });

      if (!getEnv('SUPABASE_URL') || !getEnv('SUPABASE_SERVICE_ROLE_KEY')) {
        return res.status(500).json({ error: 'Server not configured', details: 'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
      }

      // ensure row
      const row = await ensureUserRow(session.email);
      const userId = row.id;

      const { username, avatarDataUrl } = body || {};

      // username validation & uniqueness
      let newUsername;
      if (typeof username !== 'undefined' && username !== null) {
        if (username && !validUsername(username)) {
          return res.status(400).json({ error: 'Username must be 2–32 chars and only letters, numbers, dot, underscore, or hyphen.' });
        }
        newUsername = username || null;

        if (newUsername) {
          const r = await sfetch(`/rest/v1/users?username=eq.${encodeURIComponent(newUsername)}&id=neq.${encodeURIComponent(userId)}&select=id`, {
            headers: { Accept: 'application/json' }
          });
          if (!r.ok) return res.status(500).json({ error: 'DB error', details: await r.text() });
          const rows = await r.json();
          if (Array.isArray(rows) && rows.length > 0) {
            return res.status(409).json({ error: 'Username already taken' });
          }
        }
      }

      // avatar upload (optional)
      let newAvatarUrl = null;
      if (avatarDataUrl) {
        try {
          newAvatarUrl = await uploadAvatar(userId, avatarDataUrl);
        } catch (e) {
          return res.status(500).json({ error: 'Upload failed', details: String(e) });
        }
      }

      // build patch
      const patch = {};
      if (typeof newUsername !== 'undefined') patch.username = newUsername;
      if (newAvatarUrl !== null) patch.avatar_url = newAvatarUrl;

      if (Object.keys(patch).length > 0) {
        try {
          await updateUserById(userId, patch);
        } catch (e) {
          return res.status(500).json({ error: 'Update failed', details: String(e) });
        }
      }

      // reflect in cookie
      const newSession = {
        ...session,
        username: typeof newUsername !== 'undefined' ? newUsername : session.username,
        avatar_url: newAvatarUrl !== null ? newAvatarUrl : session.avatar_url
      };

      res.setHeader('Set-Cookie', cookieHeaderForSession(newSession));
      res.status(200).json({ ok: true, user: newSession });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('/api/auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
