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
function pageAuthOk(req) {
  if (!PAGE_PASSWORD) return true;
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
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
function toCsv(leads) {
  const cols = ['receivedAt', 'name', 'email', 'phone', 'company', 'city', 'message', 'status', 'subject', 'from'];
  return '﻿' + [cols.join(',')].concat(leads.map(l => cols.map(c => csvCell(l[c])).join(','))).join('\r\n');
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

    if (!pageAuthOk(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Lead Collector"' });
      return res.end('Autenticazione richiesta');
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
