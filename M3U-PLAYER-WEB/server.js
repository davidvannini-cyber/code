'use strict';
/* Server senza dipendenze: pagina pubblica + area admin per sostituire la playlist M3U.
   Variabili: PORT (3000), HOST (127.0.0.1), ADMIN_PASSWORD, VIEWER_PASSWORD (facoltativa), DATA_DIR (./data),
   TRUST_PROXY=1 (dietro a un proxy HTTPS: usa X-Forwarded-Proto / X-Forwarded-For) */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseM3U } = require('./public/m3u.js');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PLAYLIST = path.join(DATA, 'playlist.m3u');
const BACKUP = path.join(DATA, 'playlist.prev.m3u');
const MAX_PLAYLIST = 10 * 1024 * 1024;
const SESSION_MS = 12 * 60 * 60 * 1000;

const sha = s => crypto.createHash('sha256').update(s).digest();
let generatedPassword = null;
const adminPassword = process.env.ADMIN_PASSWORD || (generatedPassword = crypto.randomBytes(9).toString('base64url'));
const adminHash = sha(adminPassword);
const viewerHash = process.env.VIEWER_PASSWORD ? sha(process.env.VIEWER_PASSWORD) : null;

fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(PLAYLIST)) fs.copyFileSync(path.join(__dirname, 'sample.m3u'), PLAYLIST);

/* ---------- Richiesta: HTTPS, IP, origine ---------- */
function isHttps(req) {
  if (req.socket.encrypted) return true;
  return TRUST_PROXY && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}
function clientIp(req) {
  if (TRUST_PROXY) {
    const parts = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];     // l'ultimo lo aggiunge il nostro proxy
  }
  return req.socket.remoteAddress || '?';
}
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (_) { return false; }
}

/* ---------- Sessioni (un cookie per ruolo) ---------- */
function makeSessions(cookie) {
  const store = new Map();                                // token -> scadenza
  const re = new RegExp(`(?:^|;\\s*)${cookie}=([0-9a-f]{64})`);
  const token = req => { const m = re.exec(req.headers.cookie || ''); return m ? m[1] : null; };
  const attrs = req => `HttpOnly; SameSite=Strict; Path=/${isHttps(req) ? '; Secure' : ''}`;
  setInterval(() => { for (const [t, exp] of store) if (exp < Date.now()) store.delete(t); }, 60 * 60 * 1000).unref();
  return {
    check(req) {
      const t = token(req);
      const exp = t && store.get(t);
      if (!exp) return false;
      if (exp < Date.now()) { store.delete(t); return false; }
      return true;
    },
    create(req) {
      const t = crypto.randomBytes(32).toString('hex');
      store.set(t, Date.now() + SESSION_MS);
      return `${cookie}=${t}; ${attrs(req)}; Max-Age=${SESSION_MS / 1000}`;
    },
    destroy(req) {
      const t = token(req);
      if (t) store.delete(t);
      return `${cookie}=; ${attrs(req)}; Max-Age=0`;
    },
  };
}
const adminSessions = makeSessions('sid');
const viewerSessions = makeSessions('vid');
const attempts = new Map();                               // ip -> { count, until }

/* ---------- Risposte ---------- */
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self'; " +
    "img-src * data: blob:; media-src * blob:; connect-src *; worker-src blob:; frame-ancestors 'none'",
};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.m3u': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png' };

function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    ...SECURITY,
    'Cache-Control': 'no-store',
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}
const httpError = (status, message) => Object.assign(new Error(message), { status });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(httpError(413, 'File troppo grande.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* ---------- Login (admin e spettatore) ---------- */
async function handleLogin(req, res, expectedHash, sessions) {
  const ip = clientIp(req);
  const a = attempts.get(ip) || { count: 0, until: 0 };
  if (a.until > Date.now()) throw httpError(429, 'Troppi tentativi. Riprova tra un minuto.');
  let password = '';
  try { password = String(JSON.parse((await readBody(req, 1024)).toString('utf8')).password || ''); }
  catch (e) { if (e.status) throw e; throw httpError(400, 'Richiesta non valida.'); }
  if (!crypto.timingSafeEqual(sha(password), expectedHash)) {
    a.count += 1;
    if (a.count >= 5) { a.count = 0; a.until = Date.now() + 60_000; }
    attempts.set(ip, a);
    throw httpError(401, 'Password errata.');
  }
  attempts.delete(ip);
  send(res, 200, { ok: true }, { 'Set-Cookie': sessions.create(req) });
}

function requireAdmin(req) { if (!adminSessions.check(req)) throw httpError(401, 'Accesso richiesto.'); }

function playlistInfo() {
  const { channels } = parseM3U(fs.readFileSync(PLAYLIST, 'utf8'));
  const st = fs.statSync(PLAYLIST);
  return {
    channels: channels.length,
    groups: new Set(channels.map(c => c.group).filter(Boolean)).size,
    bytes: st.size,
    updatedAt: st.mtime.toISOString(),
  };
}

// Percorsi raggiungibili senza password di spettatore (nessun dato della playlist).
const OPEN_PATHS = new Set(['/healthz', '/login.html', '/login.js', '/style.css', '/admin', '/admin.html', '/admin.js']);

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch (_) { throw httpError(400, 'Percorso non valido.'); }

  if (req.method === 'POST' && !sameOrigin(req)) throw httpError(403, 'Origine non consentita.');

  if (pathname === '/healthz') return send(res, 200, 'ok');

  /* API */
  if (pathname === '/api/login' && req.method === 'POST') return handleLogin(req, res, adminHash, adminSessions);
  if (pathname === '/api/viewer-login' && req.method === 'POST') {
    if (!viewerHash) throw httpError(404, 'Non trovato.');
    return handleLogin(req, res, viewerHash, viewerSessions);
  }
  if (pathname === '/api/logout' && req.method === 'POST') {
    return send(res, 200, { ok: true }, { 'Set-Cookie': adminSessions.destroy(req) });
  }
  if (pathname === '/api/status' && req.method === 'GET') {
    requireAdmin(req);
    return send(res, 200, playlistInfo());
  }
  if (pathname === '/api/playlist' && req.method === 'POST') {
    requireAdmin(req);
    const text = (await readBody(req, MAX_PLAYLIST)).toString('utf8');
    let parsed;
    try { parsed = parseM3U(text); } catch (e) { throw httpError(400, e.message); }
    if (!parsed.channels.length) throw httpError(400, 'La playlist non contiene canali http/https.');
    fs.copyFileSync(PLAYLIST, BACKUP);
    const tmp = PLAYLIST + '.tmp';
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, PLAYLIST);
    return send(res, 200, { ok: true, ...playlistInfo() });
  }

  /* Pagina pubblica: con VIEWER_PASSWORD serve l'accesso (o la sessione admin). */
  if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Metodo non consentito.');
  if (pathname === '/') pathname = '/index.html';
  if (viewerHash && !OPEN_PATHS.has(pathname) && !viewerSessions.check(req) && !adminSessions.check(req)) {
    if (pathname === '/index.html') return send(res, 302, '', { Location: '/login.html' });
    throw httpError(401, 'Accesso richiesto.');
  }
  if (pathname === '/playlist.m3u') {
    return send(res, 200, fs.readFileSync(PLAYLIST), { 'Content-Type': MIME['.m3u'] });
  }
  if (pathname === '/login.html' && !viewerHash) return send(res, 302, '', { Location: '/' });
  if (pathname === '/admin') pathname = '/admin.html';
  const file = path.join(PUBLIC, pathname);
  if (!file.startsWith(PUBLIC + path.sep)) throw httpError(404, 'Non trovato.');
  let st;
  try { st = fs.statSync(file); } catch (_) { throw httpError(404, 'Non trovato.'); }
  if (!st.isFile()) throw httpError(404, 'Non trovato.');
  res.writeHead(200, { ...SECURITY, 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  route(req, res).catch(e => {
    if (res.headersSent) return res.end();
    if (e.status) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Errore interno.' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Player M3U su http://${HOST}:${PORT}   (admin: /admin)${viewerHash ? '   [accesso con password spettatore]' : ''}`);
  if (generatedPassword) console.log(`Password admin temporanea: ${generatedPassword}   (imposta ADMIN_PASSWORD per fissarla)`);
});
