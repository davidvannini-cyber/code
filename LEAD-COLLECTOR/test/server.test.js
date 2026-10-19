'use strict';
// Prova del ponte con LEADREWORKS (/api/ext/*) e del segno "esportato"
const assert = require('assert');
const os = require('os'), path = require('path'), http = require('http');
process.env.LEADS_FILE = path.join(os.tmpdir(), 'leads-server-test-' + process.pid + '.json');
process.env.PAGE_PASSWORD = 'segreta';
const store = require('../store');
const server = require('../server');

store.save([
  { id: 'b', name: 'Bruno', email: 'b@x.it', phone: '', status: 'nuovo', receivedAt: '2026-01-02T10:00:00Z' },
  { id: 'a', name: 'Anna', email: '', phone: '3471234567', status: 'nuovo', receivedAt: '2026-01-01T10:00:00Z' },
  { id: 'c', name: 'Carlo', exported: true, exportedAt: '2026-01-03T10:00:00Z', status: 'nuovo', receivedAt: '2026-01-03T09:00:00Z' },
]);

function call(port, method, p, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: p, headers: Object.assign({ Origin: 'null' }, headers) }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  try {
    // senza password: /api/leads è protetta, /api/ext/pending no (ma solo da localhost)
    assert.strictEqual((await call(port, 'GET', '/api/leads')).status, 401, 'api normale protetta');
    let r = await call(port, 'GET', '/api/ext/pending');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers['access-control-allow-origin'], 'null', 'CORS per la console aperta da file');
    const pend = JSON.parse(r.body);
    assert.deepStrictEqual(pend.map(l => l.id), ['a', 'b'], 'solo i non esportati, dal più vecchio');
    // host diverso da localhost: rifiutato (anti DNS rebinding)
    assert.strictEqual((await call(port, 'GET', '/api/ext/pending', { headers: { Host: 'evil.example.com' } })).status, 403);
    // origine estranea: nessun permesso CORS
    r = await call(port, 'GET', '/api/ext/pending', { headers: { Origin: 'https://evil.example.com' } });
    assert.strictEqual(r.headers['access-control-allow-origin'], undefined);
    assert.strictEqual((await call(port, 'OPTIONS', '/api/ext/exported')).status, 204);
    // segna come esportato
    r = await call(port, 'POST', '/api/ext/exported', { body: JSON.stringify({ id: 'a' }) });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(store.load().find(l => l.id === 'a').exported, true);
    assert(store.load().find(l => l.id === 'a').exportedAt);
    assert.deepStrictEqual(JSON.parse((await call(port, 'GET', '/api/ext/pending')).body).map(l => l.id), ['b']);
    assert.strictEqual((await call(port, 'POST', '/api/ext/exported', { body: JSON.stringify({ id: 'zzz' }) })).status, 404);
    // la casella nella tabella (PATCH con password): si può togliere e rimettere
    const auth = { Authorization: 'Basic ' + Buffer.from('u:segreta').toString('base64') };
    await call(port, 'PATCH', '/api/leads/a', { body: JSON.stringify({ exported: false }), headers: auth });
    assert.strictEqual(store.load().find(l => l.id === 'a').exported, false);
    assert.deepStrictEqual(JSON.parse((await call(port, 'GET', '/api/ext/pending')).body).map(l => l.id), ['a', 'b']);
    await call(port, 'PATCH', '/api/leads/a', { body: JSON.stringify({ exported: true }), headers: auth });
    assert.strictEqual(store.load().find(l => l.id === 'a').exported, true);
    // CSV con la colonna esportato
    assert(/exported/.test((await call(port, 'GET', '/api/export.csv', { headers: auth })).body));
    console.log('server.test.js: ok');
  } catch (e) { console.error(e); process.exitCode = 1; }
  server.close();
});
