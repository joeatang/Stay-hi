// /api/auth/route.js
// Next.js (Vercel) Route Handler – no supabase-js dependency.
// Uses Supabase REST & Storage HTTP + cookie session.

export const config = { runtime: 'nodejs' };

/* ---------------- cookie helpers ---------------- */
const COOKIE_NAME = 'stayhi_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function readCookie(headers, name) {
  const cookie = headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function cookieHeaderForSession(session) {
  const val = encodeURIComponent(JSON.stringify(session));
  return `${COOKIE_NAME}=${val}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`;
}

/* ---------------- env + helpers ---------------- */
function env(name) {
  try { return process.env[name]; } catch { return undefined; }
}
const SB_URL = () => env('SUPABASE_URL');
const SB_ANON = () => env('SUPABASE_ANON_KEY');
const SB_SERVICE = () => env('SUPABASE_SERVICE_ROLE_KEY');

function assertEnv() {
  const url = SB_URL();
  const anon = SB_ANON();
  const srv = SB_SERVICE();
  return {
    hasUrl: !!url,
    hasKey: !!anon,
    hasService: !!srv,
    urlLooksRight: /^https?:\/\/.+\.supabase\.co$/.test(url || ''),
  };
}

// PostgREST helper
async function sbRest(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${SB_URL()}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SB_SERVICE(),
      'Authorization': `Bearer ${SB_SERVICE()}`,
      ...(body && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text || '{}'); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}

// Storage upload via REST
async function sbUploadToBucket(bucket, objectPath, buffer, contentType) {
  const url = `${SB_URL()}/storage/v1/object/${encodeURIComponent(`${bucket}/${objectPath}`)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SB_SERVICE()}`,
      'apikey': SB_SERVICE(),
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text || '{}'); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
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

function validUsername(x) {
  return /^[a-zA-Z0-9._-]{2,32}$/.test(String(x || ''));
}

/* ---------------- route ---------------- */
export async function POST(request) {
  try {
    const { action, email, password, inviteCode, username, avatarDataUrl } =
      await request.json().catch(() => ({}));

    // ---- health ----
    if (action === 'health') {
      const envs = assertEnv();

      let dbOk = false, storageOk = false, diag = {};
      try {
        const r = await sbRest('/rest/v1/users?select=id&limit=1');
        dbOk = r.ok || r.status === 406;
        diag.usersErr = r.ok ? null : (r.json?.message || r.text || r.status);
      } catch (e) { diag.usersCatch = String(e); }

      try {
        const res = await fetch(`${SB_URL()}/storage/v1/bucket`, {
          headers: { 'Authorization': `Bearer ${SB_SERVICE()}`, 'apikey': SB_SERVICE() }
        });
        storageOk = res.ok;
        if (!res.ok) diag.storageErr = `${res.status}`;
      } catch (e) { diag.storageCatch = String(e); }

      return json({ ok: true, envs, dbOk, storageOk, diag });
    }

    // ---- me ----
    if (action === 'me') {
      const raw = readCookie(request.headers, COOKIE_NAME);
      if (!raw) return json({ ok: true, user: null });
      try {
        const s = JSON.parse(raw);
        return json({ ok: true, user: s?.id ? s : null });
      } catch {
        return json({ ok: true, user: null });
      }
    }

    // ---- logout ----
    if (action === 'logout') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`,
        },
      });
    }

    // ---- signin (demo) ----
    if (action === 'signin') {
      if (!email || !password) return json({ error: 'Missing email/password' }, { status: 400 });
      if (String(password).length < 6) return json({ error: 'Invalid credentials' }, { status: 401 });

      const session = {
        id: `user_${Date.now()}`,
        email: String(email).toLowerCase(),
        username: null,
        avatar_url: null,
        isAdmin: false,
      };

      const { ok, json: j } = await sbRest('/rest/v1/users?select=id,email,username,avatar_url&email=eq.' + encodeURIComponent(session.email));
      let row = (ok && Array.isArray(j) && j[0]) ? j[0] : null;
      if (!row) {
        const ins = await sbRest('/rest/v1/users', { method: 'POST', body: { email: session.email } });
        if (!ins.ok) return json({ error: 'DB insert failed', details: ins.json || ins.text }, { status: 500 });
        row = Array.isArray(ins.json) ? ins.json[0] : ins.json;
      }
      session.username = row?.username || null;
      session.avatar_url = row?.avatar_url || null;

      return new Response(JSON.stringify({ ok: true, user: session }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeaderForSession(session),
        },
      });
    }

    // ---- signup (demo) ----
    if (action === 'signup') {
      if (!email || !password) return json({ error: 'Missing fields' }, { status: 400 });
      if (String(password).length < 6) return json({ error: 'Weak password' }, { status: 400 });

      const session = {
        id: `user_${Date.now()}`,
        email: String(email).toLowerCase(),
        username: null,
        avatar_url: null,
        isAdmin: false,
      };

      const { ok, json: j } = await sbRest('/rest/v1/users?select=id,email,username,avatar_url&email=eq.' + encodeURIComponent(session.email));
      let row = (ok && Array.isArray(j) && j[0]) ? j[0] : null;
      if (!row) {
        const ins = await sbRest('/rest/v1/users', { method: 'POST', body: { email: session.email } });
        if (!ins.ok) return json({ error: 'DB insert failed', details: ins.json || ins.text }, { status: 500 });
        row = Array.isArray(ins.json) ? ins.json[0] : ins.json;
      }
      session.username = row?.username || null;
      session.avatar_url = row?.avatar_url || null;

      return new Response(JSON.stringify({ ok: true, user: session }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeaderForSession(session),
        },
      });
    }

    // ---- profile.update ----
    if (action === 'profile.update') {
      const raw = readCookie(request.headers, COOKIE_NAME);
      if (!raw) return json({ error: 'Not signed in' }, { status: 401 });

      let session;
      try { session = JSON.parse(raw); } catch { return json({ error: 'Bad session' }, { status: 401 }); }
      if (!session?.email) return json({ error: 'Bad session' }, { status: 401 });

      const sel = await sbRest('/rest/v1/users?select=id,email,username,avatar_url&email=eq.' + encodeURIComponent(session.email));
      if (!sel.ok || !Array.isArray(sel.json) || !sel.json[0]) {
        return json({ error: 'User not found' }, { status: 404 });
      }
      const userId = sel.json[0].id;

      // username
      let newUsername = undefined;
      if (typeof username !== 'undefined') {
        if (username && !validUsername(username)) {
          return json({ error: 'Username must be 2–32 chars and only letters, numbers, dot, underscore, or hyphen.' }, { status: 400 });
        }
        newUsername = username || null;

        if (newUsername) {
          const chk = await sbRest(`/rest/v1/users?select=id&username=eq.${encodeURIComponent(newUsername)}&id=neq.${encodeURIComponent(userId)}&limit=1`);
          if (chk.ok && Array.isArray(chk.json) && chk.json.length > 0) {
            return json({ error: 'Username already taken' }, { status: 409 });
          }
        }
      }

      // avatar upload
      let avatarUrl = null;
      if (avatarDataUrl) {
        const parsed = parseDataUrl(avatarDataUrl);
        if (!parsed) return json({ error: 'Bad image payload' }, { status: 400 });

        const objectPath = `${userId}/${Date.now()}.${parsed.ext}`;
        const up = await sbUploadToBucket('avatars', objectPath, parsed.buffer, parsed.mime);
        if (!up.ok) return json({ error: 'Upload failed', details: up.json || up.text }, { status: 500 });

        avatarUrl = `${SB_URL()}/storage/v1/object/public/avatars/${encodeURIComponent(objectPath)}`;
      }

      const patch = { updated_at: new Date().toISOString() };
      if (typeof newUsername !== 'undefined') patch.username = newUsername;
      if (avatarUrl !== null) patch.avatar_url = avatarUrl;

      if (Object.keys(patch).length > 1) {
        const upd = await sbRest('/rest/v1/users?id=eq.' + encodeURIComponent(userId), { method: 'PATCH', body: patch });
        if (!upd.ok) return json({ error: 'Update failed', details: upd.json || upd.text }, { status: 500 });
      }

      const newSession = {
        ...session,
        username: typeof newUsername !== 'undefined' ? newUsername : session.username,
        avatar_url: avatarUrl !== null ? avatarUrl : session.avatar_url,
      };

      return new Response(JSON.stringify({ ok: true, user: newSession }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeaderForSession(newSession),
        },
      });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('/api/auth error:', e);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

