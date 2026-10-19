// Esegui con:  node test-worker.mjs   (prova il Worker in Node con un KV finto, senza account Cloudflare)
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import worker from './src/worker.js';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(here, '..', 'public');
const M3U = require(path.join(PUB, 'm3u.js'));
const DTT = require(path.join(PUB, 'dtt-it.js'));

class KV {
  constructor() { this.m = new Map(); }
  async get(k, type) { const v = this.m.get(k); if (v === undefined) return null; return type === 'stream' ? new Response(v).body : v; }
  async put(k, v) { this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const ASSETS = {
  async fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === '/') p = '/index.html'; else if (p === '/admin') p = '/admin.html';
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return new Response('nf', { status: 404 });
    return new Response(fs.readFileSync(f), { headers: { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' } });
  },
};

const BASE = 'https://tv.example.test';
const mkEnv = (extra = {}) => ({ DATA: new KV(), ASSETS, ADMIN_PASSWORD: 'segreta-di-test', ALLOW_PRIVATE_URLS: '1', ...extra });
const call = (env, p, opt = {}) => worker.fetch(new Request(BASE + p, opt), env);
const post = (env, p, body, headers = {}) => call(env, p, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers });
const J = { 'Content-Type': 'application/json' };
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];

let fail2 = false;
const big = (() => {
  let t = '#EXTM3U\n';
  for (let i = 0; i < 11000; i++) t += `#EXTINF:-1 tvg-id="c${i}.xx" tvg-logo="https://l.example/${i}.png" group-title="G${i % 50}",Canale numero ${i}\nhttps://s.example/${i}.m3u8\n`;
  return t;
})();
const origin = http.createServer((q, r) => {
  const u = q.url;
  if (u === '/a.m3u') return r.end('#EXTM3U url-tvg="x"\n#EXTINF:-1 tvg-id="LA7.it" tvg-chno="7" group-title="Altro",LA7\nhttps://a.example/la7.m3u8\n#EXTINF:-1,Solo A\nhttps://a.example/solo.m3u8\n');
  if (u === '/b.m3u' && !fail2) return r.end('﻿#EXTM3U\n#EXTINF:-1,LA7\nhttps://b.example/la7.m3u8\n#EXTINF:-1,Doppio\nhttps://shared.example/x.m3u8');
  if (u === '/c.m3u') return r.end('#EXTM3U\n#EXTINF:-1,Doppio\nhttps://shared.example/x.m3u8\n');
  if (u === '/single.m3u8') return r.end('#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nseg.ts');
  if (u === '/big.m3u') return r.end(big);
  if (u === '/notm3u') return r.end('<html>ciao</html>');
  if (u === '/epg.json') return r.end('{"updated":"2026-10-19T18:00:00.000Z","channels":{"rai1":[[1,2,"TG1"]]}}');
  if (u === '/epg-rotto.json') return r.end('<html>ciao</html>');
  r.writeHead(500); r.end();
});
await new Promise(r => origin.listen(0, '127.0.0.1', r));
const O = 'http://127.0.0.1:' + origin.address().port;

try {
  const env = mkEnv();

  // --- pubblico
  assert.equal((await call(env, '/healthz')).status, 200, 'healthz');
  let r = await call(env, '/playlist.m3u');
  assert.equal(r.status, 200);
  assert.ok((await r.text()).startsWith('#EXTM3U'), 'playlist iniziale (di prova)');
  r = await call(env, '/');
  assert.equal(r.status, 200, 'pagina');
  assert.ok((await r.text()).includes('id="channels"'));
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/, 'intestazioni di sicurezza sulla pagina');
  r = await call(env, '/auto');
  assert.equal(r.status, 200, 'pagina auto');
  assert.ok((await r.text()).includes('id="channels"'), '/auto e\' la stessa pagina');
  r = await call(env, '/auto/');
  assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/auto', '/auto/ torna a /auto');
  assert.equal((await call(env, '/admin')).status, 200, 'pagina admin');
  assert.equal((await call(env, '/login.html')).status, 302);
  assert.equal((await call(env, '/non-esiste.js')).status, 404);
  assert.equal((await call(env, '/api/status')).status, 401, 'status senza login');
  assert.equal((await post(env, '/api/playlist', '#EXTM3U\n#EXTINF:-1,A\nhttps://h/a.m3u8')).status, 401, 'upload senza login');
  assert.equal((await post(env, '/api/sources', { urls: [O + '/a.m3u'] }, J)).status, 401);

  // --- accesso
  const noPass = mkEnv({ ADMIN_PASSWORD: undefined });
  assert.equal((await post(noPass, '/api/login', { password: 'x' }, J)).status, 503, 'senza ADMIN_PASSWORD non si entra');
  assert.equal((await post(env, '/api/login', { password: 'sbagliata' }, J)).status, 401);
  r = await post(env, '/api/login', { password: 'segreta-di-test' }, J);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie'), /HttpOnly/); assert.match(r.headers.get('set-cookie'), /Secure/); assert.match(r.headers.get('set-cookie'), /SameSite=Strict/);
  const auth = { Cookie: cookieOf(r) };
  assert.equal((await call(env, '/api/status', { headers: auth })).status, 200, 'con il cookie');
  const tampered = { Cookie: auth.Cookie.slice(0, -1) + (auth.Cookie.endsWith('0') ? '1' : '0') };
  assert.equal((await call(env, '/api/status', { headers: tampered })).status, 401, 'cookie manomesso');
  assert.equal((await call(mkEnv({ ADMIN_PASSWORD: 'altra' }), '/api/status', { headers: auth })).status, 401, 'cambio password disconnette');
  assert.equal((await post(env, '/api/playlist', '#EXTM3U\n#EXTINF:-1,X\nhttps://h/x.m3u8', { ...auth, Origin: 'https://altro.example' })).status, 403, 'origine diversa');
  r = await post(env, '/api/logout', '', auth);
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);

  // blocco dopo troppi tentativi (per indirizzo)
  const env2 = mkEnv();
  for (let i = 0; i < 5; i++) await post(env2, '/api/login', { password: 'x' }, { ...J, 'cf-connecting-ip': '1.1.1.1' });
  assert.equal((await post(env2, '/api/login', { password: 'segreta-di-test' }, { ...J, 'cf-connecting-ip': '1.1.1.1' })).status, 429, 'blocco');
  assert.equal((await post(env2, '/api/login', { password: 'segreta-di-test' }, { ...J, 'cf-connecting-ip': '2.2.2.2' })).status, 200, 'altro indirizzo libero');

  // --- fonti multiple
  const sources = (urls, e = env) => post(e, '/api/sources', { urls }, { ...J, ...auth });
  assert.equal((await sources([])).status, 400);
  assert.equal((await sources(['non-un-indirizzo'])).status, 400);
  assert.equal((await sources(['ftp://x/y'])).status, 400);
  assert.equal((await sources(Array.from({ length: 9 }, (_, i) => O + '/a.m3u?' + i))).status, 400, 'oltre il limite');

  r = await sources([O + '/a.m3u', O + '/b.m3u', O + '/c.m3u', O + '/single.m3u8', O + '/notm3u']);
  assert.equal(r.status, 200);
  const info = await r.json();
  assert.deepEqual(info.status.map(s => s.ok), [true, true, true, true, false], 'esito per fonte');
  assert.match(info.status[4].error, /manca #EXTM3U/);
  assert.equal(info.channels, 2 + 2 + 1 + 1, 'canali totali');
  const merged = await (await call(env, '/playlist.m3u')).text();
  assert.ok(merged.startsWith('#EXTM3U\n#X-SOURCE:1\n'), 'intestazione e fonte 1');
  assert.ok(!merged.includes('url-tvg') && !merged.includes('﻿'), 'intestazioni delle fonti tolte');
  assert.ok(merged.includes('#X-SOURCE:4\n#EXTINF:-1,single.m3u8'), 'flusso singolo come canale');

  // la pagina capisce il risultato: fonti, raggruppamento, ordine delle alternative
  const parsed = M3U.parseM3U(merged).channels;
  assert.deepEqual(parsed.map(c => c.src), [1, 1, 2, 2, 3, 4], 'fonte di ogni canale');
  const groups = DTT.groupChannels(parsed);
  const la7 = groups.find(g => g.head.name === 'LA7');
  assert.deepEqual(la7.alts.map(c => c.url), ['https://a.example/la7.m3u8', 'https://b.example/la7.m3u8'], 'LA7: fonte 1 poi fonte 2');
  assert.equal(groups.find(g => g.head.name === 'Doppio').alts.length, 1, 'lo stesso indirizzo in due liste conta una volta');

  // una fonte cade: si usa la copia salvata
  fail2 = true;
  r = await post(env, '/api/sources/refresh', '', auth);
  assert.equal(r.status, 200);
  const again = await r.json();
  assert.equal(again.status[1].ok, false);
  assert.equal(again.status[1].fromCache, true, 'copia salvata');
  assert.ok((await (await call(env, '/playlist.m3u')).text()).includes('https://b.example/la7.m3u8'), 'i canali della fonte caduta restano');

  // nessuna fonte raggiungibile: la playlist non cambia
  const env3 = mkEnv();
  r = await post(env3, '/api/login', { password: 'segreta-di-test' }, J);
  const auth3 = { Cookie: cookieOf(r) };
  const before = await (await call(env3, '/playlist.m3u')).text();
  r = await post(env3, '/api/sources', { urls: [O + '/morta.m3u'] }, { ...J, ...auth3 });
  assert.equal(r.status, 502);
  assert.equal(await (await call(env3, '/playlist.m3u')).text(), before, 'playlist invariata');

  // aggiornamento automatico (cron)
  const waits = [];
  await worker.scheduled({}, env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits);
  assert.ok((await getStatus(env)).updatedAt, 'il cron aggiorna');

  // --- sostituzione con una sola playlist: azzera le fonti
  r = await post(env, '/api/playlist', '#EXTM3U\n#EXTINF:-1,Uno\nhttps://h/1.m3u8\n#EXTINF:-1,Due\nhttps://h/2.m3u8', auth);
  assert.equal(r.status, 200); assert.equal((await r.json()).channels, 2);
  assert.deepEqual((await (await call(env, '/api/sources', { headers: auth })).json()).urls, [], 'fonti azzerate');
  assert.equal((await post(env, '/api/playlist', 'non e una playlist', auth)).status, 400);
  assert.equal((await post(env, '/api/playlist', '#EXTM3U\n#EXTINF:-1,Solo RTMP\nrtmp://h/a', auth)).status, 200, 'accettata: i canali non http si scartano nella pagina');
  r = await post(env, '/api/playlist-url', { url: O + '/a.m3u' }, { ...J, ...auth });
  assert.equal(r.status, 200); assert.equal((await r.json()).channels, 2, 'da un indirizzo');
  assert.equal((await post(env, '/api/playlist-url', { url: 'http://localhost:1/x' }, { ...J, ...auth }, 0)).status === 200, false);
  const strict = mkEnv({ ALLOW_PRIVATE_URLS: undefined });
  const l = await post(strict, '/api/login', { password: 'segreta-di-test' }, J);
  for (const u of ['http://localhost/x', 'http://127.0.0.1/x', 'http://10.0.0.5/x', 'http://169.254.169.254/x', 'http://[::1]/x']) {
    assert.equal((await post(strict, '/api/playlist-url', { url: u }, { ...J, Cookie: cookieOf(l) })).status, 400, 'bloccato ' + u);
  }

  // --- guida programmi (EPG): passa il file cosi' com'e', e se manca risponde 502
  r = await call(mkEnv({ EPG_URL: O + '/epg.json' }), '/api/epg');
  assert.equal(r.status, 200, 'epg');
  assert.equal((await r.json()).channels.rai1[0][2], 'TG1');
  assert.match(r.headers.get('content-type'), /application\/json/);
  assert.equal((await call(mkEnv({ EPG_URL: O + '/epg-rotto.json' }), '/api/epg')).status, 502, 'epg non valida');
  assert.equal((await call(mkEnv({ EPG_URL: O + '/non-esiste' }), '/api/epg')).status, 502, 'epg assente');

  // --- canali nascosti dall'admin: lettura pubblica, modifica solo con il login
  r = await call(env, '/api/hidden');
  assert.deepEqual(await r.json(), { ids: [] }, 'nessun canale nascosto all\'inizio');
  assert.equal((await post(env, '/api/hidden', { ids: ['x'] }, J)).status, 401, 'nascondere senza login');
  assert.equal((await post(env, '/api/hidden', { ids: 'x' }, { ...J, ...auth })).status, 400, 'formato errato');
  assert.equal((await post(env, '/api/hidden', { ids: [1] }, { ...J, ...auth })).status, 400, 'id non testo');
  r = await post(env, '/api/hidden', { ids: ['||n3', '|tv|prova', '||n3'] }, { ...J, ...auth });
  assert.equal(r.status, 200); assert.equal((await r.json()).hidden, 2, 'doppioni tolti');
  assert.deepEqual((await (await call(env, '/api/hidden')).json()).ids, ['||n3', '|tv|prova']);

  // --- lista grande: quanto lavoro serve per unirla (in Node; nel Worker il tempo di calcolo e' simile o minore)
  const t0 = performance.now();
  r = await sources([O + '/big.m3u']);
  const ms = Math.round(performance.now() - t0);
  assert.equal(r.status, 200);
  const bigInfo = await r.json();
  assert.equal(bigInfo.channels, 11000);
  console.log(`Lista da 11.000 canali (${(big.length / 1048576).toFixed(1)} MB): unita in ${ms} ms (compresa l'attesa della rete locale).`);

  console.log('Tutti i test del Worker sono passati.');
} catch (e) {
  console.error('TEST FALLITO:', e.message, e.stack.split('\n').slice(1, 3).join('\n'));
  process.exitCode = 1;
} finally {
  origin.close();
}

async function getStatus(env) { return JSON.parse((await env.DATA.get('sources')) || '{}'); }
