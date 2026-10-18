'use strict';
/* Server senza dipendenze: pagina pubblica + area admin per sostituire la playlist M3U.
   Variabili: PORT (3000), HOST (127.0.0.1), ADMIN_PASSWORD, DATA_DIR (./data) */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseM3U } = require('./public/m3u.js');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PLAYLIST = path.join(DATA, 'playlist.m3u');
const BACKUP = path.join(DATA, 'playlist.prev.m3u');
const MAX_PLAYLIST = 10 * 1024 * 1024;
const SESSION_MS = 12 * 60 * 60 * 1000;

const sha = s => crypto.createHash('sha256').update(s).digest();
let generatedPassword = null;
const adminPassword = process.env.ADMIN_PASSWORD || (generatedPassword = crypto.randomBytes(9).toString('base64url'));
const passHash = sha(adminPassword);

fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(PLAYLIST)) fs.copyFileSync(path.join(__dirname, 'sample.m3u'), PLAYLIST);

const sessions = new Map();     // token -> scadenza
const attempts = new Map();     // ip -> { count, until }

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

function sessionToken(req) {
  const m = /(?:^|;\s*)sid=([0-9a-f]{64})/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}
function isAuthed(req) {
  const t = sessionToken(req);
  const exp = t && sessions.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}
function requireAuth(req) { if (!isAuthed(req)) throw httpError(401, 'Accesso richiesto.'); }

function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (_) { return false; }
}

function playlistInfo() {
  const text = fs.readFileSync(PLAYLIST, 'utf8');
  const { channels } = parseM3U(text);
  const st = fs.statSync(PLAYLIST);
  return {
    channels: channels.length,
    groups: new Set(channels.map(c => c.group).filter(Boolean)).size,
    bytes: st.size,
    updatedAt: st.mtime.toISOString(),
  };
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch (_) { throw httpError(400, 'Percorso non valido.'); }

  if (req.method === 'POST' && !sameOrigin(req)) throw httpError(403, 'Origine non consentita.');

  if (pathname === '/playlist.m3u' && req.method === 'GET') {
    return send(res, 200, fs.readFileSync(PLAYLIST), { 'Content-Type': MIME['.m3u'] });
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress || '?';
    const a = attempts.get(ip) || { count: 0, until: 0 };
    if (a.until > Date.now()) throw httpError(429, 'Troppi tentativi. Riprova tra un minuto.');
    let password = '';
    try { password = String(JSON.parse((await readBody(req, 1024)).toString('utf8')).password || ''); }
    catch (e) { if (e.status) throw e; throw httpError(400, 'Richiesta non valida.'); }
    if (!crypto.timingSafeEqual(sha(password), passHash)) {
      a.count += 1;
      if (a.count >= 5) { a.count = 0; a.until = Date.now() + 60_000; }
      attempts.set(ip, a);
      throw httpError(401, 'Password errata.');
    }
    attempts.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_MS);
    return send(res, 200, { ok: true }, {
      'Set-Cookie': `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`,
    });
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const t = sessionToken(req);
    if (t) sessions.delete(t);
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (pathname === '/api/status' && req.method === 'GET') {
    requireAuth(req);
    return send(res, 200, playlistInfo());
  }

  if (pathname === '/api/playlist' && req.method === 'POST') {
    requireAuth(req);
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

  if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Metodo non consentito.');
  if (pathname === '/') pathname = '/index.html';
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
  console.log(`Player M3U su http://${HOST}:${PORT}   (admin: http://${HOST}:${PORT}/admin)`);
  if (generatedPassword) console.log(`Password admin temporanea: ${generatedPassword}   (imposta ADMIN_PASSWORD per fissarla)`);
});
