// Esegui con:  node test-server.js   (avvia un server temporaneo con dati in una cartella temporanea)
const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 38000 + Math.floor(Math.random() * 1000);
const BASE = 'http://127.0.0.1:' + PORT;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm3u-test-'));
const child = spawn(process.execPath, ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, ADMIN_PASSWORD: 'segreta-di-test' },
  stdio: 'ignore',
});

const wait = ms => new Promise(r => setTimeout(r, ms));
async function ready() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/playlist.m3u'); return; } catch (_) { await wait(100); }
  }
  throw new Error('server non partito');
}
const post = (p, body, headers = {}) => fetch(BASE + p, { method: 'POST', body, headers });

(async () => {
  try {
    await ready();

    let r = await fetch(BASE + '/playlist.m3u');
    assert.strictEqual(r.status, 200);
    assert.ok((await r.text()).startsWith('#EXTM3U'), 'playlist iniziale');

    assert.strictEqual((await fetch(BASE + '/')).status, 200, 'pagina pubblica');
    assert.strictEqual((await fetch(BASE + '/admin')).status, 200, 'pagina admin');
    assert.strictEqual((await fetch(BASE + '/..%2Fserver.js')).status, 404, 'path traversal');
    assert.strictEqual((await fetch(BASE + '/%2e%2e/server.js')).status, 404, 'path traversal 2');

    assert.strictEqual((await fetch(BASE + '/api/status')).status, 401, 'status senza login');
    assert.strictEqual((await post('/api/playlist', '#EXTM3U\n#EXTINF:-1,A\nhttps://h/a.m3u8')).status, 401, 'upload senza login');

    r = await post('/api/login', JSON.stringify({ password: 'sbagliata' }), { 'Content-Type': 'application/json' });
    assert.strictEqual(r.status, 401, 'password errata');

    r = await post('/api/login', JSON.stringify({ password: 'segreta-di-test' }), { 'Content-Type': 'application/json' });
    assert.strictEqual(r.status, 200, 'login');
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const auth = { Cookie: cookie };
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);

    r = await fetch(BASE + '/api/status', { headers: auth });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).channels, 2, 'canali iniziali');

    r = await post('/api/playlist', 'questo non e una playlist', auth);
    assert.strictEqual(r.status, 400, 'playlist non valida');
    r = await post('/api/playlist', '#EXTM3U\n#EXTINF:-1,Solo RTMP\nrtmp://h/a', auth);
    assert.strictEqual(r.status, 400, 'playlist senza canali http');

    r = await post('/api/playlist', '#EXTM3U\n#EXTINF:-1 group-title="Nuovi",Uno\nhttps://h/1.m3u8\n#EXTINF:-1,Due\nhttps://h/2.m3u8\n#EXTINF:-1,Tre\nhttps://h/3.m3u8', auth);
    assert.strictEqual(r.status, 200, 'playlist valida');
    assert.strictEqual((await r.json()).channels, 3);
    assert.ok((await (await fetch(BASE + '/playlist.m3u')).text()).includes('Tre'), 'la pubblica mostra la nuova lista');
    assert.ok(fs.existsSync(path.join(dataDir, 'playlist.prev.m3u')), 'backup creato');

    r = await post('/api/playlist', '#EXTM3U\n#EXTINF:-1,X\nhttps://h/x.m3u8', { ...auth, Origin: 'http://altro-sito.example' });
    assert.strictEqual(r.status, 403, 'origine diversa');

    await post('/api/logout', '', auth);
    assert.strictEqual((await fetch(BASE + '/api/status', { headers: auth })).status, 401, 'dopo logout');

    for (let i = 0; i < 5; i++) await post('/api/login', JSON.stringify({ password: 'x' }), { 'Content-Type': 'application/json' });
    r = await post('/api/login', JSON.stringify({ password: 'segreta-di-test' }), { 'Content-Type': 'application/json' });
    assert.strictEqual(r.status, 429, 'blocco dopo troppi tentativi');

    console.log('Tutti i test del server sono passati.');
  } catch (e) {
    console.error('TEST FALLITO:', e.message);
    process.exitCode = 1;
  } finally {
    child.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})();
