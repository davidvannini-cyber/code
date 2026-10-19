'use strict';
// Legge le impostazioni dal file .env (se esiste), righe tipo CHIAVE=valore
try {
  for (const line of require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./store');
const { ingest } = require('./ingest');

const PORT = +(process.env.PORT || 3000);
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';   // protegge POST /api/inbound
const PAGE_PASSWORD = process.env.PAGE_PASSWORD || ''; // Basic auth (utente qualsiasi) per pagina e API

function eq(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const COOKIE = 'lc_auth';
const authToken = () => crypto.createHash('sha256').update('lead-collector:' + PAGE_PASSWORD).digest('hex');
function pageAuthOk(req) {
  if (!PAGE_PASSWORD) return true;
  const ck = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (ck && eq(ck.slice(COOKIE.length + 1), authToken())) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const pass = Buffer.from(h.slice(6), 'base64').toString().split(':').slice(1).join(':');
  return eq(pass, PAGE_PASSWORD);
}
function readBody(req, limit = 5e6) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('troppo grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
// Chiude le schede del browser aperte su questa pagina (solo macOS: Chrome e Safari)
function closeBrowserTabs() {
  if (process.platform !== 'darwin') return;
  // finestra "app" di Lead Collector (profilo Chrome separato)
  const profile = path.join(__dirname, 'data', 'chrome-profile').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const k = require('child_process').spawnSync('pkill', ['-f', 'user-data-dir=' + profile]);
  console.log('shutdown: pkill esito', k.status, k.error ? k.error.message : '', '| profilo', profile);
  const u = `http://localhost:${PORT}`;
  const chrome = `tell application "Google Chrome"\nrepeat with w in windows\ntry\nrepeat with i from (count of tabs of w) to 1 by -1\nif URL of tab i of w starts with "${u}" then close tab i of w\nend repeat\nend try\nend repeat\nend tell`;
  const safari = chrome.replace(/Google Chrome/, 'Safari');
  const script = `delay 1\ntell application "System Events" to set procs to name of every process\nif procs contains "Google Chrome" then\ntry\n${chrome}\nend try\nend if\nif procs contains "Safari" then\ntry\n${safari}\nend try\nend if`;
  require('child_process').spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' }).unref();
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

// Accesso senza password per la console LEADREWORKS (/api/ext/*): solo dal Mac stesso (localhost)
function isLocalRequest(req) {
  const a = req.socket.remoteAddress || '';
  const host = (req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(a) && ['localhost', '127.0.0.1', '::1'].includes(host);
}
// La console è un file aperto dal disco (origine "null") o una pagina locale
function corsOrigin(req) {
  const o = req.headers.origin;
  return o === 'null' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o || '') ? o : '';
}

const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
function toCsv(leads) {
  const cols = ['receivedAt', 'name', 'email', 'phone', 'company', 'city', 'message', 'status', 'exported', 'subject', 'from'];
  const cell = (l, c) => c === 'exported' ? (l.exported ? 'sì' : 'no') : l[c];
  return '﻿' + [cols.join(',')].concat(leads.map(l => cols.map(c => csvCell(cell(l, c))).join(','))).join('\r\n');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    // Webhook di ingresso email: protetto da token, non da password pagina
    if (req.method === 'POST' && url.pathname === '/api/inbound') {
      const tok = req.headers['x-token'] || url.searchParams.get('token') || '';
      if (INGEST_TOKEN && !eq(tok, INGEST_TOKEN)) return json(res, 401, { error: 'token non valido' });
      const body = await readBody(req);
      const ct = req.headers['content-type'] || '';
      let input = body;
      if (ct.includes('json')) input = JSON.parse(body);
      else if (ct.includes('urlencoded')) {
        const p = new URLSearchParams(body);
        input = { subject: p.get('subject') || '', from: p.get('from') || p.get('sender') || '', text: p.get('text') || p.get('body-plain') || p.get('body') || '' };
      }
      return json(res, 200, ingest(input));
    }

    // Accesso diretto dall'app: /?pw=PASSWORD imposta un cookie e torna alla pagina pulita
    if (PAGE_PASSWORD && req.method === 'GET' && url.pathname === '/' && url.searchParams.has('pw')) {
      if (eq(url.searchParams.get('pw'), PAGE_PASSWORD)) {
        res.writeHead(302, { 'Set-Cookie': `${COOKIE}=${authToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`, Location: '/' });
        return res.end();
      }
    }
    // Ponte con LEADREWORKS: lead non ancora esportati e segno "esportato" (solo da localhost, senza password)
    if (url.pathname.startsWith('/api/ext/')) {
      if (!isLocalRequest(req)) return json(res, 403, { error: 'solo da localhost' });
      const co = corsOrigin(req);
      if (co) {
        res.setHeader('Access-Control-Allow-Origin', co);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS') {
        if (co && req.headers['access-control-request-private-network']) res.setHeader('Access-Control-Allow-Private-Network', 'true');
        res.writeHead(204); return res.end();
      }
      if (req.method === 'GET' && url.pathname === '/api/ext/pending') {
        // dal più vecchio al più recente, così LEADREWORKS li lavora in ordine di arrivo
        return json(res, 200, store.load().filter(l => !l.exported).reverse());
      }
      if (req.method === 'POST' && url.pathname === '/api/ext/exported') {
        const { id } = JSON.parse(await readBody(req));
        const leads = store.load(); const l = leads.find(x => x.id === id);
        if (!l) return json(res, 404, { error: 'non trovato' });
        l.exported = true; l.exportedAt = new Date().toISOString();
        store.save(leads); return json(res, 200, l);
      }
      return json(res, 404, { error: 'non trovato' });
    }
    if (!pageAuthOk(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Lead Collector"' });
      return res.end('Autenticazione richiesta');
    }

    if (req.method === 'POST' && url.pathname === '/api/shutdown') {
      console.log('shutdown richiesto, origin:', req.headers.origin, 'host:', req.headers.host);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'origine non valida' });
      json(res, 200, { ok: true });
      res.on('finish', () => {
        try { fs.unlinkSync(path.join(__dirname, 'data', 'server.pid')); } catch {}
        closeBrowserTabs();
        setTimeout(() => process.exit(0), 300);
      });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/leads') return json(res, 200, store.load());
    if (req.method === 'GET' && url.pathname === '/api/export.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"' });
      return res.end(toCsv(store.load()));
    }
    if (req.method === 'POST' && url.pathname === '/api/paste') {
      const body = await readBody(req);
      return json(res, 200, ingest(body));
    }
    const m = url.pathname.match(/^\/api\/leads\/([\w-]+)$/);
    if (m && req.method === 'PATCH') {
      const patch = JSON.parse(await readBody(req));
      const leads = store.load(); const l = leads.find(x => x.id === m[1]);
      if (!l) return json(res, 404, { error: 'non trovato' });
      for (const k of ['status', 'name', 'email', 'phone', 'company', 'city', 'message']) if (typeof patch[k] === 'string') l[k] = patch[k];
      if (typeof patch.exported === 'boolean') { l.exported = patch.exported; l.exportedAt = patch.exported ? new Date().toISOString() : ''; }
      store.save(leads); return json(res, 200, l);
    }
    if (m && req.method === 'DELETE') {
      store.save(store.load().filter(x => x.id !== m[1])); return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
    }
    json(res, 404, { error: 'non trovato' });
  } catch (e) { json(res, 400, { error: e.message }); }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Lead Collector su http://localhost:${PORT}`));
  require('./imap').start();
}
module.exports = server;
