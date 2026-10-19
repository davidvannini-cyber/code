/* Cloudflare Worker: stessa pagina e stesse API del server Node (server.js), con i dati nel KV "DATA".
   Pensato per il piano gratuito (pochi ms di calcolo per richiesta): la playlist non viene mai analizzata qui,
   solo unita come testo. Segreti/variabili: ADMIN_PASSWORD (segreto), ALLOW_PRIVATE_URLS=1 (solo per prove locali). */

const MAX_SOURCES = 8;                       // il piano gratuito concede 50 richieste esterne per esecuzione
const MAX_TEXT = 18 * 1024 * 1024;           // un valore KV puo' arrivare a 25 MiB
const SESSION_MS = 400 * 24 * 60 * 60 * 1000;
const LOGIN_LOCK_MS = 60 * 1000;
const enc = new TextEncoder();

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self'; " +
    "img-src * data: blob:; media-src * blob:; connect-src *; worker-src blob:; frame-ancestors 'none'",
};

const SAMPLE = '#EXTM3U\n#EXTINF:-1 tvg-id="apple.bipbop" group-title="Test",Apple Bip-Bop (HLS di prova)\n' +
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8\n' +
  '#EXTINF:-1 tvg-id="mux.test" group-title="Test",Mux Test Stream (HLS di prova)\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8\n';

// Guida programmi leggera (epg.json), pubblicata ogni due ore dal lavoro su GitHub (.github/workflows/epg.yml).
const EPG_URL = 'https://github.com/davidvannini-cyber/code/releases/download/epg-latest/epg.json';
const EPG_MAX = 1024 * 1024;
const EPG_TTL_S = 20 * 60;

const MAX_HIDDEN = 20000;                    // canali nascosti dall'amministratore (identificativi dei canali)

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------- Utilita' ---------- */
function respond(status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !(body instanceof ReadableStream) && !(body instanceof Uint8Array);
  const h = new Headers({ ...SECURITY, 'Cache-Control': 'no-store', 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' });
  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) v.forEach(x => h.append(k, x)); else h.set(k, v);
  }
  return new Response(isObj ? JSON.stringify(body) : body, { status, headers: h });
}

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => crypto.subtle.digest('SHA-256', enc.encode(s));

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

async function readText(request, limit) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > limit) throw new HttpError(413, 'File troppo grande.');
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, 'File troppo grande.');
  return text;
}

async function readJson(request, limit) {
  try { return JSON.parse(await readText(request, limit)); }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'Richiesta non valida.'); }
}

function sameOrigin(request) {
  const o = request.headers.get('origin');
  if (!o) return true;
  try { return new URL(o).host === new URL(request.url).host; } catch (_) { return false; }
}

/* ---------- Accesso: cookie firmato, nessuno stato da conservare ---------- */
async function sessionKey(env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'ADMIN_PASSWORD non impostata sul Worker.');
  const raw = await sha256('m3u-player-session:' + env.ADMIN_PASSWORD);       // cambiare la password disconnette tutti
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function signExp(env, exp) {
  return hex(await crypto.subtle.sign('HMAC', await sessionKey(env), enc.encode('sid.' + exp)));
}
async function isAdmin(request, env) {
  const m = /(?:^|;\s*)sid=(\d{10,15})\.([0-9a-f]{64})/.exec(request.headers.get('cookie') || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  const good = enc.encode(await signExp(env, m[1]));
  return sameBytes(good, enc.encode(m[2]));
}
async function requireAdmin(request, env) {
  if (!(await isAdmin(request, env))) throw new HttpError(401, 'Accesso richiesto.');
}
const cookieAttrs = 'HttpOnly; SameSite=Strict; Path=/; Secure';

async function handleLogin(request, env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'ADMIN_PASSWORD non impostata sul Worker.');
  const ip = request.headers.get('cf-connecting-ip') || '?';
  const key = 'rl:' + ip;
  const now = Date.now();
  const state = JSON.parse((await env.DATA.get(key)) || '{"count":0,"until":0}');
  if (state.until > now) throw new HttpError(429, 'Troppi tentativi. Riprova tra un minuto.');
  const body = await readJson(request, 1024);
  const given = new Uint8Array(await sha256(String(body.password || '')));
  const real = new Uint8Array(await sha256(env.ADMIN_PASSWORD || '\u0000no-password'));
  if (!env.ADMIN_PASSWORD || !sameBytes(given, real)) {
    state.count += 1;
    if (state.count >= 5) { state.count = 0; state.until = now + LOGIN_LOCK_MS; }
    await env.DATA.put(key, JSON.stringify(state), { expirationTtl: 120 });
    throw new HttpError(401, 'Password errata.');
  }
  if (state.count || state.until) await env.DATA.delete(key);
  const exp = now + SESSION_MS;
  return respond(200, { ok: true }, { 'Set-Cookie': `sid=${exp}.${await signExp(env, exp)}; ${cookieAttrs}; Max-Age=${SESSION_MS / 1000}` });
}

/* ---------- Scaricare una playlist da un indirizzo ---------- */
function isPrivateHost(h) {
  h = h.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  return h.includes(':') && (h === '::' || h === '::1' || /^f[cd]/.test(h) || /^fe[89ab]/.test(h));
}

async function fetchText(env, urlStr) {
  let u;
  try { u = new URL(urlStr); } catch (_) { throw new HttpError(400, 'Indirizzo non valido.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new HttpError(400, 'Sono ammessi solo indirizzi http o https.');
  if (env.ALLOW_PRIVATE_URLS !== '1' && isPrivateHost(u.hostname)) throw new HttpError(400, 'Indirizzo non consentito.');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(u.href, { signal: ctl.signal, headers: { 'User-Agent': 'm3u-player-web', Accept: '*/*' } });
    if (!res.ok) throw new HttpError(400, 'Il server ha risposto ' + res.status + '.');
    if (Number(res.headers.get('content-length') || 0) > MAX_TEXT) throw new HttpError(413, 'File troppo grande.');
    const text = await res.text();
    if (text.length > MAX_TEXT) throw new HttpError(413, 'File troppo grande.');
    return text;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e.name === 'AbortError') throw new HttpError(504, 'Il server non risponde.');
    throw new HttpError(502, 'Impossibile scaricare la playlist.');
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Playlist come testo (senza analizzarla) ---------- */
function countExtinf(text) {
  let n = 0;
  for (let i = text.indexOf('#EXTINF'); i !== -1; i = text.indexOf('#EXTINF', i + 7)) n += 1;
  return n;
}

// Controlla un testo e ne toglie l'intestazione; un flusso HLS singolo diventa un canale.
function prepare(text, url) {
  text = text.replace(/^﻿/, '');
  if (!text.startsWith('#EXTM3U')) throw new Error('Non sembra una playlist M3U (manca #EXTM3U).');
  if (text.includes('#EXT-X-STREAM-INF') || text.includes('#EXT-X-TARGETDURATION')) {
    let name = url || 'Flusso';
    try { name = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || name); } catch (_) { /* resta l'indirizzo */ }
    return { body: `#EXTINF:-1,${name.replace(/[\r\n,]+/g, ' ')}\n${url}\n`, count: 1 };
  }
  const nl = text.indexOf('\n');
  const body = nl === -1 ? '' : text.slice(nl + 1);
  const count = countExtinf(body);
  if (!count) throw new Error('La lista non contiene canali.');
  return { body: body.endsWith('\n') ? body : body + '\n', count };
}

async function savePlaylist(env, text, count) {
  const meta = { channels: count, groups: null, bytes: text.length, updatedAt: new Date().toISOString() };
  await env.DATA.put('playlist', text);
  await env.DATA.put('meta', JSON.stringify(meta));
  return meta;
}

async function getMeta(env) {
  const raw = await env.DATA.get('meta');
  if (raw) return JSON.parse(raw);
  return { channels: countExtinf(SAMPLE), groups: null, bytes: SAMPLE.length, updatedAt: new Date().toISOString() };
}

/* ---------- Fonti multiple ---------- */
async function getSources(env) {
  const raw = await env.DATA.get('sources');
  return raw ? JSON.parse(raw) : { urls: [], status: [], updatedAt: null };
}

async function refreshSources(env) {
  const cfg = await getSources(env);
  if (!cfg.urls.length) throw new HttpError(400, 'Nessuna fonte configurata.');
  const at = new Date().toISOString();

  const results = await Promise.all(cfg.urls.map(async url => {
    const r = { url, ok: false, fromCache: false, channels: 0, error: null, at, body: null };
    const cacheKey = 'src:' + hex(await sha256(url));
    try {
      const prepared = prepare(await fetchText(env, url), url);
      r.ok = true; r.body = prepared.body; r.channels = prepared.count;
      await env.DATA.put(cacheKey, JSON.stringify({ body: prepared.body, count: prepared.count }));
    } catch (e) {
      r.error = e.message || 'Errore';
      const cached = JSON.parse((await env.DATA.get(cacheKey)) || 'null');      // fonte non raggiungibile: ultima copia buona
      if (cached) { r.fromCache = true; r.body = cached.body; r.channels = cached.count; }
    }
    return r;
  }));

  const status = results.map(({ body, ...rest }) => rest);
  const usable = results.map((r, i) => ({ r, i })).filter(x => x.r.body);
  const total = usable.reduce((n, x) => n + x.r.channels, 0);
  if (!total) {
    await env.DATA.put('sources', JSON.stringify({ ...cfg, status, updatedAt: at }));
    throw new HttpError(502, "Nessuna fonte raggiungibile e nessuna copia salvata: la playlist non e' stata modificata.");
  }
  // "#X-SOURCE:n" dice alla pagina da quale lista arrivano i canali che seguono.
  const merged = '#EXTM3U\n' + usable.map(x => '#X-SOURCE:' + (x.i + 1) + '\n' + x.r.body).join('');
  if (merged.length > MAX_TEXT) throw new HttpError(413, 'Le liste unite sono troppo grandi.');
  const meta = await savePlaylist(env, merged, total);
  const out = { ...cfg, status, updatedAt: at };
  await env.DATA.put('sources', JSON.stringify(out));
  return { ok: true, ...out, ...meta };
}

/* ---------- Instradamento ---------- */
// Passa la guida programmi com'e', con una copia di 20 minuti: nessun calcolo, solo un trasferimento.
async function handleEpg(env) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request('https://epg.cache.invalid/epg.json');
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' };
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return respond(200, await hit.text(), headers);
  }
  let text;
  try {
    const res = await fetch(env.EPG_URL || EPG_URL, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'tv-vannini', Accept: 'application/json' } });
    if (!res.ok) throw new Error('risposta ' + res.status);
    text = await res.text();
  } catch (_) {
    throw new HttpError(502, 'Guida programmi non disponibile.');
  }
  if (text.length > EPG_MAX || !text.startsWith('{')) throw new HttpError(502, 'Guida programmi non valida.');
  if (cache) await cache.put(cacheKey, new Response(text, { headers: { 'Cache-Control': 'max-age=' + EPG_TTL_S } }));
  return respond(200, text, headers);
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'POST' && !sameOrigin(request)) throw new HttpError(403, 'Origine non consentita.');

  if (path === '/healthz') return respond(200, 'ok');

  if (path === '/playlist.m3u' && (request.method === 'GET' || request.method === 'HEAD')) {
    const body = await env.DATA.get('playlist', 'stream');                   // in streaming: nessun calcolo
    return respond(200, body || SAMPLE, { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  if (path === '/api/epg' && request.method === 'GET') return handleEpg(env);

  // Canali nascosti dall'amministratore: elenco pubblico (lo leggono pagina e app), modifica solo da admin.
  if (path === '/api/hidden' && request.method === 'GET') {
    return respond(200, (await env.DATA.get('hidden')) || '{"ids":[]}', { 'Content-Type': 'application/json; charset=utf-8' });
  }
  if (path === '/api/hidden' && request.method === 'POST') {
    await requireAdmin(request, env);
    const ids = (await readJson(request, 1024 * 1024)).ids;
    if (!Array.isArray(ids) || ids.length > MAX_HIDDEN || ids.some(x => typeof x !== 'string' || x.length > 300)) throw new HttpError(400, 'Richiesta non valida.');
    const clean = [...new Set(ids)];
    await env.DATA.put('hidden', JSON.stringify({ ids: clean, updatedAt: new Date().toISOString() }));
    return respond(200, { hidden: clean.length });
  }

  if (path === '/api/login' && request.method === 'POST') return handleLogin(request, env);
  if (path === '/api/logout' && request.method === 'POST') {
    return respond(200, { ok: true }, { 'Set-Cookie': `sid=; ${cookieAttrs}; Max-Age=0` });
  }
  if (path === '/api/status' && request.method === 'GET') {
    await requireAdmin(request, env);
    return respond(200, await getMeta(env));
  }
  if (path === '/api/sources' && request.method === 'GET') {
    await requireAdmin(request, env);
    return respond(200, { ...(await getSources(env)), max: MAX_SOURCES });
  }
  if (path === '/api/sources' && request.method === 'POST') {
    await requireAdmin(request, env);
    let urls = (await readJson(request, 64 * 1024)).urls;
    if (!Array.isArray(urls)) throw new HttpError(400, 'Richiesta non valida.');
    urls = [...new Set(urls.map(u => String(u).trim()).filter(Boolean))];
    if (!urls.length) throw new HttpError(400, 'Scrivi almeno un indirizzo.');
    if (urls.length > MAX_SOURCES) throw new HttpError(400, 'Al massimo ' + MAX_SOURCES + ' liste.');
    for (const u of urls) {
      let ok = false;
      try { ok = ['http:', 'https:'].includes(new URL(u).protocol) && u.length <= 2000; } catch (_) { /* non e' un indirizzo */ }
      if (!ok) throw new HttpError(400, 'Indirizzo non valido: ' + u.slice(0, 80));
    }
    await env.DATA.put('sources', JSON.stringify({ urls, status: [], updatedAt: null }));
    return respond(200, await refreshSources(env));
  }
  if (path === '/api/sources/refresh' && request.method === 'POST') {
    await requireAdmin(request, env);
    return respond(200, await refreshSources(env));
  }
  if (path === '/api/playlist' && request.method === 'POST') {
    await requireAdmin(request, env);
    const prepared = prepareOrThrow(await readText(request, MAX_TEXT), 'Flusso');
    const meta = await savePlaylist(env, '#EXTM3U\n' + prepared.body, prepared.count);
    await env.DATA.delete('sources');
    return respond(200, { ok: true, ...meta });
  }
  if (path === '/api/playlist-url' && request.method === 'POST') {
    await requireAdmin(request, env);
    const target = String((await readJson(request, 4096)).url || '').trim();
    const prepared = prepareOrThrow(await fetchText(env, target), target);
    const meta = await savePlaylist(env, '#EXTM3U\n' + prepared.body, prepared.count);
    await env.DATA.delete('sources');
    return respond(200, { ok: true, ...meta });
  }

  if (path === '/login.html') return respond(302, '', { Location: '/' });     // senza password per vedere i canali
  if (request.method !== 'GET' && request.method !== 'HEAD') throw new HttpError(405, 'Metodo non consentito.');

  // /auto e' la stessa pagina; la pagina stessa riconosce l'indirizzo e attiva i comandi per l'auto.
  if (path === '/auto/') return respond(302, '', { Location: '/auto' });
  const assetRequest = path === '/auto' ? new Request(new URL('/', request.url), request) : request;

  // Tutto il resto e' la pagina (file statici).
  const res = await env.ASSETS.fetch(assetRequest);
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY)) h.set(k, v);
  h.set('Cache-Control', 'no-cache');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function prepareOrThrow(text, url) {
  try { return prepare(text, url); } catch (e) { throw new HttpError(400, e.message); }
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      if (e instanceof HttpError) return respond(e.status, { error: e.message });
      console.error(e);
      return respond(500, { error: 'Errore interno.' });
    }
  },
  // Aggiornamento automatico delle fonti (ogni 6 ore, vedi wrangler.toml).
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      if ((await getSources(env)).urls.length) await refreshSources(env);
    })().catch(e => console.error('Aggiornamento fonti:', e.message)));
  },
};
