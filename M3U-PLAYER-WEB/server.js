'use strict';
/* Server senza dipendenze: pagina pubblica + area admin per sostituire la playlist M3U.
   Variabili: PORT (3000), HOST (127.0.0.1), ADMIN_PASSWORD, VIEWER_PASSWORD (facoltativa), DATA_DIR (./data),
   TRUST_PROXY=1 (dietro a un proxy HTTPS: usa X-Forwarded-Proto / X-Forwarded-For) */
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseM3U } = require('./public/m3u.js');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const ALLOW_PRIVATE_URLS = process.env.ALLOW_PRIVATE_URLS === '1';   // consente di scaricare playlist da indirizzi di rete locale
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PLAYLIST = path.join(DATA, 'playlist.m3u');
const BACKUP = path.join(DATA, 'playlist.prev.m3u');
const MAX_PLAYLIST = 10 * 1024 * 1024;
const MAX_MERGED = 40 * 1024 * 1024;
const MAX_SOURCES = 20;
const SOURCES = path.join(DATA, 'sources.json');
const CACHE_DIR = path.join(DATA, 'src-cache');
const REFRESH_MS = 6 * 60 * 60 * 1000;           // aggiornamento automatico delle fonti
const SESSION_MS = 400 * 24 * 60 * 60 * 1000;     // massimo che i browser accettano; si rinnova a ogni apertura della pagina

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

/* ---------- Sessioni (un cookie per ruolo) ----------
   Il cookie contiene scadenza + firma (HMAC): nessun dato in memoria, quindi l'accesso sopravvive ai riavvii.
   La chiave unisce un segreto salvato in DATA_DIR/session.key e le password: cambiare una password disconnette tutti. */
const keyFile = path.join(DATA, 'session.key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32), { mode: 0o600 });
const SESSION_KEY = crypto.createHmac('sha256', fs.readFileSync(keyFile))
  .update(Buffer.concat([adminHash, viewerHash || Buffer.alloc(0)])).digest();

function makeSessions(cookie) {
  const sign = exp => crypto.createHmac('sha256', SESSION_KEY).update(cookie + '.' + exp).digest('hex');
  const re = new RegExp(`(?:^|;\\s*)${cookie}=(\\d{10,15})\\.([0-9a-f]{64})`);
  const attrs = req => `HttpOnly; SameSite=Strict; Path=/${isHttps(req) ? '; Secure' : ''}`;
  return {
    check(req) {
      const m = re.exec(req.headers.cookie || '');
      if (!m || Number(m[1]) < Date.now()) return false;
      const good = Buffer.from(sign(m[1]), 'hex');
      const given = Buffer.from(m[2], 'hex');
      return given.length === good.length && crypto.timingSafeEqual(given, good);
    },
    create(req) {
      const exp = Date.now() + SESSION_MS;
      return `${cookie}=${exp}.${sign(exp)}; ${attrs(req)}; Max-Age=${SESSION_MS / 1000}`;
    },
    destroy(req) { return `${cookie}=; ${attrs(req)}; Max-Age=0`; },
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
async function handleLogin(req, res, expectedHash, sessions, alsoAdmin = false) {
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
  const cookies = [sessions.create(req)];
  // Con la stessa password per spettatore e admin, un solo accesso apre entrambe le aree.
  if (alsoAdmin && crypto.timingSafeEqual(sha(password), adminHash)) cookies.push(adminSessions.create(req));
  send(res, 200, { ok: true }, { 'Set-Cookie': cookies });
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

function savePlaylist(text) {
  let parsed;
  try { parsed = parseM3U(text); } catch (e) { throw httpError(400, e.message); }
  if (!parsed.channels.length) throw httpError(400, 'La playlist non contiene canali http/https.');
  fs.copyFileSync(PLAYLIST, BACKUP);
  const tmp = PLAYLIST + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, PLAYLIST);
  return playlistInfo();
}

/* ---------- Scarica una playlist da un indirizzo (solo admin) ----------
   Rifiuta indirizzi di rete locale/riservati (anche dopo i reindirizzamenti e la risoluzione DNS), salvo ALLOW_PRIVATE_URLS=1. */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return v.includes('.') ? isPrivateIp(v.slice(7)) : true;
  return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}
function safeLookup(hostname, options, cb) {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err);
    if (!ALLOW_PRIVATE_URLS && addrs.some(a => isPrivateIp(a.address))) return cb(new Error('indirizzo non consentito'));
    if (options && options.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}
function fetchText(urlStr, hops = 0) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (_) { return reject(httpError(400, 'Indirizzo non valido.')); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return reject(httpError(400, 'Sono ammessi solo indirizzi http o https.'));
    const host = u.hostname.replace(/^\[|\]$/g, '');
    if (!ALLOW_PRIVATE_URLS && net.isIP(host) && isPrivateIp(host)) return reject(httpError(400, 'Indirizzo non consentito.'));
    const req = (u.protocol === 'https:' ? https : http).get(u, {
      lookup: safeLookup, timeout: 20000, headers: { 'User-Agent': 'm3u-player-web', Accept: '*/*' },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (hops >= 3) return reject(httpError(400, 'Troppi reindirizzamenti.'));
        return resolve(fetchText(new URL(res.headers.location, u).href, hops + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(httpError(400, 'Il server ha risposto ' + res.statusCode + '.')); }
      const chunks = []; let size = 0;
      res.on('data', c => {
        size += c.length;
        if (size > MAX_PLAYLIST) { req.destroy(); reject(httpError(413, 'File troppo grande (massimo 10 MB).')); } else chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', () => reject(httpError(502, 'Download interrotto.')));
    });
    const total = setTimeout(() => { req.destroy(); reject(httpError(504, 'Il download ha impiegato troppo tempo.')); }, 60000);
    req.on('close', () => clearTimeout(total));
    req.on('timeout', () => { req.destroy(); reject(httpError(504, 'Il server non risponde.')); });
    req.on('error', e => {
      if (e.status) return reject(e);
      if (e.message === 'indirizzo non consentito') return reject(httpError(400, 'Indirizzo non consentito.'));
      reject(httpError(502, 'Impossibile scaricare la playlist (' + (e.code || e.message) + ').'));
    });
  });
}

/* ---------- Fonti multiple: piu' liste unite in una ---------- */
function readSources() {
  try { return JSON.parse(fs.readFileSync(SOURCES, 'utf8')); } catch (_) { return { urls: [], status: [], updatedAt: null }; }
}
function writeSources(o) {
  const tmp = SOURCES + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(o));
  fs.renameSync(tmp, SOURCES);
}
const clearSources = () => { if (readSources().urls.length) writeSources({ urls: [], status: [], updatedAt: null }); };
const cacheFile = url => path.join(CACHE_DIR, crypto.createHash('sha1').update(url).digest('hex') + '.m3u');

// Una fonte puo' essere anche l'indirizzo di un singolo flusso HLS: diventa un canale.
function parseSource(text, url) {
  try { return parseM3U(text); } catch (e) {
    if (e.code !== 'hls-manifest') throw e;
    let name = url;
    try { name = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || url); } catch (_) { /* resta l'indirizzo */ }
    return { channels: [{ name, url, group: null, logo: null, tvgId: null, chno: null }] };
  }
}

function serializeChannel(c, src) {
  const q = v => String(v).replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
  const attrs = [];
  if (c.tvgId) attrs.push(`tvg-id="${q(c.tvgId)}"`);
  if (c.chno) attrs.push(`tvg-chno="${c.chno}"`);
  if (c.logo) attrs.push(`tvg-logo="${q(c.logo)}"`);
  if (c.group) attrs.push(`group-title="${q(c.group)}"`);
  attrs.push(`x-src="${src}"`);
  return `#EXTINF:-1 ${attrs.join(' ')},${q(c.name)}\n${c.url}\n`;
}

let refreshing = null;
function refreshSources() {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

async function doRefresh() {
  const cfg = readSources();
  if (!cfg.urls.length) throw httpError(400, 'Nessuna fonte configurata.');
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const at = new Date().toISOString();

  const results = await Promise.all(cfg.urls.map(async url => {
    const r = { url, ok: false, fromCache: false, channels: 0, error: null, at, parsed: null };
    try {
      const text = await fetchText(url);
      const parsed = parseSource(text, url);
      if (!parsed.channels.length) throw new Error('La lista non contiene canali http/https.');
      fs.writeFileSync(cacheFile(url), text);
      r.ok = true; r.parsed = parsed;
    } catch (e) {
      r.error = e.message || 'Errore';
      try {                                              // fonte non raggiungibile: uso l'ultima copia buona
        const parsed = parseSource(fs.readFileSync(cacheFile(url), 'utf8'), url);
        r.fromCache = true; r.parsed = parsed;
      } catch (_) { /* nessuna copia disponibile */ }
    }
    r.channels = r.parsed ? r.parsed.channels.length : 0;
    return r;
  }));

  const seen = new Set();
  let out = '#EXTM3U\n';
  let total = 0;
  results.forEach((r, i) => {
    if (!r.parsed) return;
    for (const c of r.parsed.channels) {
      if (seen.has(c.url)) continue;                     // stesso indirizzo in piu' liste: tengo il primo
      seen.add(c.url);
      out += serializeChannel(c, i + 1);
      total += 1;
    }
  });
  const status = results.map(({ parsed, ...rest }) => rest);
  if (!total) {
    writeSources({ ...cfg, status, updatedAt: at });
    throw httpError(502, 'Nessuna fonte raggiungibile e nessuna copia salvata: la playlist non e\' stata modificata.');
  }
  if (Buffer.byteLength(out) > MAX_MERGED) throw httpError(413, 'Le liste unite superano 40 MB.');

  fs.copyFileSync(PLAYLIST, BACKUP);
  const tmp = PLAYLIST + '.tmp';
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, PLAYLIST);
  writeSources({ ...cfg, status, updatedAt: at });
  return { ok: true, ...readSources(), ...playlistInfo() };
}

setInterval(() => { if (readSources().urls.length) refreshSources().catch(e => console.error('Aggiornamento fonti:', e.message)); }, REFRESH_MS).unref();

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
    return handleLogin(req, res, viewerHash, viewerSessions, true);
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
    const info = savePlaylist(text);
    clearSources();
    return send(res, 200, { ok: true, ...info });
  }
  if (pathname === '/api/sources' && req.method === 'GET') {
    requireAdmin(req);
    return send(res, 200, { ...readSources(), max: MAX_SOURCES });
  }
  if (pathname === '/api/sources' && req.method === 'POST') {
    requireAdmin(req);
    let urls;
    try { urls = JSON.parse((await readBody(req, 64 * 1024)).toString('utf8')).urls; }
    catch (e) { if (e.status) throw e; throw httpError(400, 'Richiesta non valida.'); }
    if (!Array.isArray(urls)) throw httpError(400, 'Richiesta non valida.');
    urls = [...new Set(urls.map(u => String(u).trim()).filter(Boolean))];
    if (!urls.length) throw httpError(400, 'Scrivi almeno un indirizzo.');
    if (urls.length > MAX_SOURCES) throw httpError(400, 'Al massimo ' + MAX_SOURCES + ' liste.');
    for (const u of urls) {
      let ok = false;
      try { ok = ['http:', 'https:'].includes(new URL(u).protocol) && u.length <= 2000; } catch (_) { /* non e' un indirizzo */ }
      if (!ok) throw httpError(400, 'Indirizzo non valido: ' + u.slice(0, 80));
    }
    writeSources({ urls, status: [], updatedAt: null });
    return send(res, 200, await refreshSources());
  }
  if (pathname === '/api/sources/refresh' && req.method === 'POST') {
    requireAdmin(req);
    return send(res, 200, await refreshSources());
  }
  if (pathname === '/api/playlist-url' && req.method === 'POST') {
    requireAdmin(req);
    let target = '';
    try { target = String(JSON.parse((await readBody(req, 4096)).toString('utf8')).url || '').trim(); }
    catch (e) { if (e.status) throw e; throw httpError(400, 'Richiesta non valida.'); }
    const info = savePlaylist(await fetchText(target));
    clearSources();
    return send(res, 200, { ok: true, ...info });
  }

  /* Pagina pubblica: con VIEWER_PASSWORD serve l'accesso (o la sessione admin). */
  if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Metodo non consentito.');
  if (pathname === '/') pathname = '/index.html';
  if (viewerHash && !OPEN_PATHS.has(pathname) && !viewerSessions.check(req) && !adminSessions.check(req)) {
    if (pathname === '/index.html') return send(res, 302, '', { Location: '/login.html' });
    throw httpError(401, 'Accesso richiesto.');
  }
  if (pathname === '/playlist.m3u') {
    // Accesso scorrevole: ogni caricamento dell'elenco riporta la scadenza a 400 giorni da adesso.
    const renewed = [viewerSessions, adminSessions].filter(x => x.check(req)).map(x => x.create(req));
    return send(res, 200, fs.readFileSync(PLAYLIST), { 'Content-Type': MIME['.m3u'], ...(renewed.length ? { 'Set-Cookie': renewed } : {}) });
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
