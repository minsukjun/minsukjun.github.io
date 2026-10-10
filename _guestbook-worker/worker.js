/* Guestbook API for minsukjun.com — Cloudflare Worker + D1 + Turnstile.
 *
 * Bindings / settings (Worker > Settings):
 *   DB               D1 database binding
 *   ADMIN_TOKEN      secret, long random string; used by /guestbook/admin.html
 *   TURNSTILE_SECRET secret, from Turnstile > your widget
 *
 * Public:  GET  /api/entries            approved entries; private ones without their text
 *          POST /api/entries            { name, message, secret, token }  -> pending approval
 * Admin:   GET  /api/admin/entries      all entries (Authorization: Bearer ADMIN_TOKEN)
 *          POST /api/admin/entries/:id  { action: "approve" | "hide" | "delete" | "reply", reply }
 */
const ORIGINS = ['https://minsukjun.com', 'https://www.minsukjun.com', 'https://minsukjun.github.io'];
const LIMITS = { name: 30, message: 300, reply: 300, perWindow: 3, windowMin: 10 };

function cors(req) {
  const o = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(req, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } });
}
function clean(s, max) {
  return String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}
async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  const body = new FormData(); body.append('secret', secret); body.append('response', token); if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = await r.json().catch(() => ({}));
  return d.success === true;
}

async function listPublic(req, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, message, secret, reply, created_at FROM entries WHERE approved = 1 ORDER BY created_at DESC LIMIT 200'
  ).all();
  return json(req, { entries: results.map(e => ({
    id: e.id, name: e.name, secret: !!e.secret, created_at: e.created_at,
    message: e.secret ? null : e.message, reply: e.secret ? null : (e.reply || null)
  })) });
}

async function create(req, env) {
  let b; try { b = await req.json(); } catch { return json(req, { error: 'bad_request' }, 400); }
  const name = clean(b.name, LIMITS.name), message = clean(b.message, LIMITS.message), secret = b.secret ? 1 : 0;
  if (!name || !message) return json(req, { error: 'empty' }, 400);
  const ip = req.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(b.token, ip, env.TURNSTILE_SECRET))) return json(req, { error: 'captcha' }, 403);
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = ip ? (await sha256(ip + '|' + day + '|' + env.ADMIN_TOKEN)).slice(0, 32) : null;   // daily-rotating, not reversible
  if (ipHash) {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entries WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)"
    ).bind(ipHash, `-${LIMITS.windowMin} minutes`).first();
    if (row && row.n >= LIMITS.perWindow) return json(req, { error: 'rate' }, 429);
  }
  await env.DB.prepare('INSERT INTO entries (name, message, secret, ip_hash) VALUES (?, ?, ?, ?)').bind(name, message, secret, ipHash).run();
  return json(req, { ok: true, pending: true }, 201);
}

function isAdmin(req, env) {
  const h = req.headers.get('Authorization') || '';
  return !!env.ADMIN_TOKEN && env.ADMIN_TOKEN.length >= 16 && safeEqual(h.replace(/^Bearer\s+/i, ''), env.ADMIN_TOKEN);
}
async function adminList(req, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, message, secret, approved, reply, created_at FROM entries ORDER BY approved ASC, created_at DESC LIMIT 500'
  ).all();
  return json(req, { entries: results.map(e => ({ ...e, secret: !!e.secret, approved: !!e.approved })) });
}
async function adminAction(req, env, id) {
  let b; try { b = await req.json(); } catch { return json(req, { error: 'bad_request' }, 400); }
  const q = {
    approve: ['UPDATE entries SET approved = 1 WHERE id = ?', [id]],
    hide:    ['UPDATE entries SET approved = 0 WHERE id = ?', [id]],
    delete:  ['DELETE FROM entries WHERE id = ?', [id]],
    reply:   ['UPDATE entries SET reply = ? WHERE id = ?', [clean(b.reply, LIMITS.reply) || null, id]]
  }[b.action];
  if (!q) return json(req, { error: 'bad_action' }, 400);
  const r = await env.DB.prepare(q[0]).bind(...q[1]).run();
  return json(req, { ok: true, changed: r.meta ? r.meta.changes : undefined });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    try {
      if (path === '/api/entries' && req.method === 'GET') return await listPublic(req, env);
      if (path === '/api/entries' && req.method === 'POST') return await create(req, env);
      if (path.startsWith('/api/admin/')) {
        if (!isAdmin(req, env)) return json(req, { error: 'unauthorized' }, 401);
        if (path === '/api/admin/entries' && req.method === 'GET') return await adminList(req, env);
        const m = path.match(/^\/api\/admin\/entries\/(\d+)$/);
        if (m && req.method === 'POST') return await adminAction(req, env, Number(m[1]));
      }
      return json(req, { error: 'not_found' }, 404);
    } catch (e) {
      return json(req, { error: 'server' }, 500);
    }
  }
};
