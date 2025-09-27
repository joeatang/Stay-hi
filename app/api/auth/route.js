// app/api/auth/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Cookie/session basics
 */
const COOKIE_NAME = "stayhi_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function ok(data = {}, status = 200) {
  return NextResponse.json(data, { status });
}
function err(message = "Internal server error", status = 500, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Supabase admin client (service role)
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, reason: "missing-envs", url: !!url, key: !!key };
  }
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { ok: true, client };
}

/**
 * Ensure a user row exists (by email) and return it.
 */
async function ensureUserRow(sb, email) {
  const { data: existing, error: selErr } = await sb
    .from("users")
    .select("id,email,username,avatar_url")
    .eq("email", email)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  const { data, error: insErr } = await sb
    .from("users")
    .insert({ email })
    .select("id,email,username,avatar_url")
    .single();

  if (insErr) throw insErr;
  return data;
}

/**
 * Helpers for data URLs -> Buffer (for avatar upload)
 */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  const mime = m[1];
  const base64 = m[2];
  const buffer = Buffer.from(base64, "base64");
  let ext = "png";
  if (mime === "image/jpeg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/png") ext = "png";
  return { mime, buffer, ext };
}

function validUsername(x) {
  return /^[a-zA-Z0-9._-]{2,32}$/.test(String(x || ""));
}

/**
 * Route handler
 */
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const {
    action,
    email,
    password,
    inviteCode,
    username,
    avatarDataUrl,
  } = body;

  // --- Health probe (quick sanity for env + db + storage) ---
  if (action === "health") {
    const admin = getSupabaseAdmin();
    const envs = {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    let dbOk = false;
    let storageOk = false;
    const diag = {};

    try {
      if (admin.ok) {
        const sb = admin.client;
        const { error: usersErr } = await sb.from("users").select("id").limit(1);
        dbOk = !usersErr;
        if (usersErr) diag.usersErr = String(usersErr.message || usersErr);

        const { data: buckets, error: stoErr } = await sb.storage.listBuckets();
        storageOk = !stoErr && Array.isArray(buckets);
        if (stoErr) diag.storageErr = String(stoErr.message || stoErr);
      }
    } catch (e) {
      diag.healthCatch = String(e);
    }

    return ok({ ok: true, envs, dbOk, storageOk, diag });
  }

  const jar = cookies();
  const rawSession = jar.get(COOKIE_NAME)?.value || null;

  // --- Who am I? ---
  if (action === "me") {
    if (!rawSession) return ok({ ok: true, user: null });
    try {
      const s = JSON.parse(rawSession);
      if (!s?.id || !s?.email) return ok({ ok: true, user: null });
      return ok({ ok: true, user: s });
    } catch {
      return ok({ ok: true, user: null });
    }
  }

  // --- Sign out ---
  if (action === "logout") {
    const res = ok({ ok: true });
    res.cookies.set(COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return res;
  }

  // --- Sign in (demo password rule just for MVP) ---
  if (action === "signin") {
    if (!email || !password) return err("Missing email/password", 400);
    if (String(password).length < 6) return err("Invalid credentials", 401);

    const session = {
      id: `user_${Date.now()}`,
      email: String(email).toLowerCase(),
      username: null,
      avatar_url: null,
      isAdmin: false,
    };

    try {
      const admin = getSupabaseAdmin();
      if (admin.ok) {
        const row = await ensureUserRow(admin.client, session.email);
        session.username = row?.username || null;
        session.avatar_url = row?.avatar_url || null;
      }
    } catch {}

    const res = ok({ ok: true, user: session });
    res.cookies.set(COOKIE_NAME, JSON.stringify(session), {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return res;
  }

  // --- Sign up (invite code check is a placeholder for later) ---
  if (action === "signup") {
    if (!email || !password || !inviteCode) return err("Missing fields", 400);
    if (String(password).length < 6) return err("Weak password", 400);

    const session = {
      id: `user_${Date.now()}`,
      email: String(email).toLowerCase(),
      username: null,
      avatar_url: null,
      isAdmin: false,
    };

    try {
      const admin = getSupabaseAdmin();
      if (admin.ok) {
        const row = await ensureUserRow(admin.client, session.email);
        session.username = row?.username || null;
        session.avatar_url = row?.avatar_url || null;
      }
    } catch {}

    const res = ok({ ok: true, user: session });
    res.cookies.set(COOKIE_NAME, JSON.stringify(session), {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return res;
  }

  // --- Profile update (username + avatar upload) ---
  if (action === "profile.update") {
    if (!rawSession) return err("Not signed in", 401);

    let session;
    try {
      session = JSON.parse(rawSession);
    } catch {
      return err("Bad session", 401);
    }
    if (!session?.email) return err("Bad session", 401);

    const admin = getSupabaseAdmin();
    if (!admin.ok) {
      return err("Server not configured", 500, {
        details:
          "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
      });
    }
    const sb = admin.client;

    // ensure row so we know userId
    const row = await ensureUserRow(sb, session.email);
    const userId = row.id;

    // username
    let newUsername = undefined; // undefined = no change
    if (typeof username !== "undefined" && username !== null) {
      if (username && !validUsername(username)) {
        return err(
          "Username must be 2–32 chars and only letters, numbers, dot, underscore, or hyphen.",
          400
        );
      }
      newUsername = username || null;

      if (newUsername) {
        const { count, error: cntErr } = await sb
          .from("users")
          .select("*", { head: true, count: "exact" })
          .eq("username", newUsername)
          .neq("id", userId);

        if (cntErr) return err("DB error", 500, { details: String(cntErr) });
        if ((count || 0) > 0) return err("Username already taken", 409);
      }
    }

    // avatar upload (optional)
    let avatarUrl = null;
    if (avatarDataUrl) {
      const parsed = parseDataUrl(avatarDataUrl);
      if (!parsed) return err("Bad image payload", 400);

      // Make sure you created a bucket named "avatars" in Supabase Storage
      const objectPath = `${userId}/${Date.now()}.${parsed.ext}`;
      const { data: put, error: upErr } = await sb.storage
        .from("avatars")
        .upload(objectPath, parsed.buffer, {
          contentType: parsed.mime,
          upsert: true,
        });

      if (upErr) return err("Upload failed", 500, { details: String(upErr) });

      const { data: pub } = sb.storage.from("avatars").getPublicUrl(put.path);
      avatarUrl = pub?.publicUrl || null;
    }

    // patch users row
    const patch = { updated_at: new Date().toISOString() };
    if (typeof newUsername !== "undefined") patch.username = newUsername;
    if (avatarUrl !== null) patch.avatar_url = avatarUrl;

    if (Object.keys(patch).length > 1) {
      const { error: upErr } = await sb.from("users").update(patch).eq("id", userId);
      if (upErr) return err("Update failed", 500, { details: String(upErr) });
    }

    // reflect in cookie
    const newSession = {
      ...session,
      username:
        typeof newUsername !== "undefined" ? newUsername : session.username,
      avatar_url: avatarUrl !== null ? avatarUrl : session.avatar_url,
    };

    const res = ok({ ok: true, user: newSession });
    res.cookies.set(COOKIE_NAME, JSON.stringify(newSession), {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return res;
  }

  return err("Unknown action", 400);
}

