// Esegui con:  node test-server.js   (avvia server temporanei con dati in cartelle temporanee)
const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const wait = ms => new Promise(r => setTimeout(r, ms));
const JSON_H = { 'Content-Type': 'application/json' };

async function withServer(env, fn, sharedDir) {
  const port = 38000 + Math.floor(Math.random() * 1000);
  const base = 'http://127.0.0.1:' + port;
  const dataDir = sharedDir || fs.mkdtempSync(path.join(os.tmpdir(), 'm3u-test-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD: 'segreta-di-test', ...env },
    stdio: 'ignore',
  });
  try {
    for (let i = 0; ; i++) {
      try { await fetch(base + '/healthz'); break; } catch (_) { if (i > 50) throw new Error('server non partito'); await wait(100); }
    }
    await fn(base, dataDir);
  } finally {
    child.kill();
    if (!sharedDir) fs.rmSync(dataDir, { recursive: true, force: true });
  }
}
const post = (base, p, body, headers = {}) => fetch(base + p, { method: 'POST', body, headers, redirect: 'manual' });
const login = (base, p, password, headers = {}) => post(base, p, JSON.stringify({ password }), { ...JSON_H, ...headers });
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];

async function scenarioBase() {
  await withServer({}, async (base, dataDir) => {
    assert.strictEqual((await fetch(base + '/healthz')).status, 200, 'healthz');
    let r = await fetch(base + '/playlist.m3u');
    assert.strictEqual(r.status, 200);
    assert.ok((await r.text()).startsWith('#EXTM3U'), 'playlist iniziale');
    assert.strictEqual((await fetch(base + '/')).status, 200, 'pagina pubblica');
    assert.strictEqual((await fetch(base + '/admin')).status, 200, 'pagina admin');
    assert.strictEqual((await fetch(base + '/login.html', { redirect: 'manual' })).status, 302, 'login spettatore assente');
    assert.strictEqual((await login(base, '/api/viewer-login', 'x')).status, 404, 'viewer-login disattivato');
    assert.strictEqual((await fetch(base + '/..%2Fserver.js')).status, 404, 'path traversal');
    assert.strictEqual((await fetch(base + '/%2e%2e/server.js')).status, 404, 'path traversal 2');

    assert.strictEqual((await fetch(base + '/api/status')).status, 401, 'status senza login');
    assert.strictEqual((await post(base, '/api/playlist', '#EXTM3U\n#EXTINF:-1,A\nhttps://h/a.m3u8')).status, 401, 'upload senza login');
    assert.strictEqual((await login(base, '/api/login', 'sbagliata')).status, 401, 'password errata');

    r = await login(base, '/api/login', 'segreta-di-test');
    assert.strictEqual(r.status, 200, 'login');
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);
    assert.doesNotMatch(r.headers.get('set-cookie'), /Secure/, 'senza proxy il cookie non e Secure');
    const auth = { Cookie: cookieOf(r) };

    r = await fetch(base + '/api/status', { headers: auth });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).channels, 2, 'canali iniziali');

    assert.strictEqual((await post(base, '/api/playlist', 'questo non e una playlist', auth)).status, 400, 'playlist non valida');
    assert.strictEqual((await post(base, '/api/playlist', '#EXTM3U\n#EXTINF:-1,Solo RTMP\nrtmp://h/a', auth)).status, 400, 'senza canali http');

    r = await post(base, '/api/playlist', '#EXTM3U\n#EXTINF:-1 group-title="Nuovi",Uno\nhttps://h/1.m3u8\n#EXTINF:-1,Due\nhttps://h/2.m3u8\n#EXTINF:-1,Tre\nhttps://h/3.m3u8', auth);
    assert.strictEqual(r.status, 200, 'playlist valida');
    assert.strictEqual((await r.json()).channels, 3);
    assert.ok((await (await fetch(base + '/playlist.m3u')).text()).includes('Tre'), 'la pubblica mostra la nuova lista');
    assert.ok(fs.existsSync(path.join(dataDir, 'playlist.prev.m3u')), 'backup creato');

    r = await post(base, '/api/playlist', '#EXTM3U\n#EXTINF:-1,X\nhttps://h/x.m3u8', { ...auth, Origin: 'http://altro-sito.example' });
    assert.strictEqual(r.status, 403, 'origine diversa');

    const out = await post(base, '/api/logout', '', auth);
    assert.match(out.headers.get('set-cookie'), /Max-Age=0/, 'il logout cancella il cookie del browser');

    for (let i = 0; i < 5; i++) await login(base, '/api/login', 'x');
    assert.strictEqual((await login(base, '/api/login', 'segreta-di-test')).status, 429, 'blocco dopo troppi tentativi');
  });
}

async function scenarioViewerPassword() {
  await withServer({ VIEWER_PASSWORD: 'guarda-di-test' }, async base => {
    let r = await fetch(base + '/', { redirect: 'manual' });
    assert.strictEqual(r.status, 302, 'senza accesso la home rimanda al login');
    assert.strictEqual(r.headers.get('location'), '/login.html');
    assert.strictEqual((await fetch(base + '/playlist.m3u')).status, 401, 'playlist protetta');
    assert.strictEqual((await fetch(base + '/app.js')).status, 401, 'app protetta');
    assert.strictEqual((await fetch(base + '/login.html')).status, 200, 'pagina di accesso aperta');
    assert.strictEqual((await fetch(base + '/healthz')).status, 200, 'healthz aperto');

    assert.strictEqual((await login(base, '/api/viewer-login', 'sbagliata')).status, 401);
    r = await login(base, '/api/viewer-login', 'guarda-di-test');
    assert.strictEqual(r.status, 200, 'accesso spettatore');
    const viewer = { Cookie: cookieOf(r) };
    assert.strictEqual((await fetch(base + '/playlist.m3u', { headers: viewer })).status, 200, 'playlist con accesso');
    assert.strictEqual((await fetch(base + '/', { headers: viewer })).status, 200, 'home con accesso');
    assert.strictEqual((await fetch(base + '/api/status', { headers: viewer })).status, 401, 'lo spettatore non e admin');

    r = await login(base, '/api/login', 'segreta-di-test');
    assert.strictEqual((await fetch(base + '/playlist.m3u', { headers: { Cookie: cookieOf(r) } })).status, 200, 'l\'admin vede la playlist');
  });
}

async function scenarioProxy() {
  await withServer({ TRUST_PROXY: '1' }, async base => {
    let r = await login(base, '/api/login', 'segreta-di-test', { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '9.9.9.9' });
    assert.strictEqual(r.status, 200);
    assert.match(r.headers.get('set-cookie'), /; Secure/, 'cookie Secure dietro proxy https');
    // il blocco anti-tentativi e' per indirizzo: un altro IP non e' bloccato
    for (let i = 0; i < 5; i++) await login(base, '/api/login', 'x', { 'X-Forwarded-For': '1.1.1.1' });
    assert.strictEqual((await login(base, '/api/login', 'segreta-di-test', { 'X-Forwarded-For': '1.1.1.1' })).status, 429);
    assert.strictEqual((await login(base, '/api/login', 'segreta-di-test', { 'X-Forwarded-For': '2.2.2.2' })).status, 200);
  });
}

async function scenarioSessionsSurviveRestart() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm3u-test-'));
  let auth;
  try {
    await withServer({}, async base => {
      const r = await login(base, '/api/login', 'segreta-di-test');
      assert.strictEqual(r.status, 200);
      const maxAge = Number(/Max-Age=(\d+)/.exec(r.headers.get('set-cookie'))[1]);
      assert.ok(maxAge >= 390 * 24 * 3600, 'accesso di lunga durata');
      auth = { Cookie: cookieOf(r) };
      assert.strictEqual((await fetch(base + '/api/status', { headers: auth })).status, 200);
    }, dir);
    await withServer({}, async base => {          // stesso disco, server riavviato
      assert.strictEqual((await fetch(base + '/api/status', { headers: auth })).status, 200, 'accesso valido dopo riavvio');
      const renewed = await fetch(base + '/playlist.m3u', { headers: auth });
      assert.ok(renewed.headers.getSetCookie().some(c => c.startsWith('sid=')), 'la scadenza viene rinnovata a ogni apertura');
      const tampered = { Cookie: auth.Cookie.slice(0, -1) + (auth.Cookie.endsWith('0') ? '1' : '0') };
      assert.strictEqual((await fetch(base + '/api/status', { headers: tampered })).status, 401, 'cookie manomesso');
    }, dir);
    await withServer({ ADMIN_PASSWORD: 'nuova-password' }, async base => {
      assert.strictEqual((await fetch(base + '/api/status', { headers: auth })).status, 401, 'cambio password disconnette');
    }, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function scenarioSinglePassword() {
  await withServer({ VIEWER_PASSWORD: 'segreta-di-test' }, async base => {
    const r = await login(base, '/api/viewer-login', 'segreta-di-test');
    assert.strictEqual(r.status, 200);
    const cookies = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    assert.strictEqual((await fetch(base + '/playlist.m3u', { headers: { Cookie: cookies } })).status, 200, 'canali con un solo accesso');
    assert.strictEqual((await fetch(base + '/api/status', { headers: { Cookie: cookies } })).status, 200, 'admin con lo stesso accesso');
  });
}

async function scenarioPlaylistFromUrl() {
  const http = require('http');
  const origin = http.createServer((req, res) => {
    if (req.url === '/lista.m3u') { res.end('#EXTM3U\n#EXTINF:-1,Da URL Uno\nhttps://h/1.m3u8\n#EXTINF:-1,Da URL Due\nhttps://h/2.m3u8'); }
    else if (req.url === '/redir') { res.writeHead(302, { Location: '/lista.m3u' }); res.end(); }
    else if (req.url === '/nonlista') { res.end('non e una playlist'); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(r => origin.listen(0, '127.0.0.1', r));
  const o = 'http://127.0.0.1:' + origin.address().port;
  try {
    const run = (env, fn) => withServer({ ...env }, async base => {
      const r = await login(base, '/api/login', 'segreta-di-test');
      await fn(base, { Cookie: cookieOf(r) });
    });
    const byUrl = (base, auth, url) => post(base, '/api/playlist-url', JSON.stringify({ url }), { ...JSON_H, ...auth });

    await run({ ALLOW_PRIVATE_URLS: '1' }, async (base, auth) => {
      assert.strictEqual((await post(base, '/api/playlist-url', JSON.stringify({ url: o + '/lista.m3u' }), JSON_H)).status, 401, 'senza login');
      let r = await byUrl(base, auth, o + '/lista.m3u');
      assert.strictEqual(r.status, 200, 'download da URL');
      assert.strictEqual((await r.json()).channels, 2);
      assert.ok((await (await fetch(base + '/playlist.m3u')).text()).includes('Da URL Due'), 'la pubblica mostra la lista scaricata');
      assert.strictEqual((await byUrl(base, auth, o + '/redir')).status, 200, 'segue un reindirizzamento');
      assert.strictEqual((await byUrl(base, auth, o + '/nonlista')).status, 400, 'contenuto non valido');
      assert.strictEqual((await byUrl(base, auth, o + '/assente')).status, 400, 'errore 404 del server remoto');
      assert.strictEqual((await byUrl(base, auth, 'file:///etc/passwd')).status, 400, 'schema non ammesso');
      assert.strictEqual((await byUrl(base, auth, 'non-un-indirizzo')).status, 400, 'indirizzo non valido');
    });
    await run({}, async (base, auth) => {              // senza ALLOW_PRIVATE_URLS la rete locale e' vietata
      for (const u of [o + '/lista.m3u', 'http://localhost:1/x', 'http://[::1]:1/x', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.1/x']) {
        assert.strictEqual((await byUrl(base, auth, u)).status, 400, 'bloccato ' + u);
      }
    });
  } finally {
    origin.close();
  }
}

(async () => {
  try {
    await scenarioBase();
    await scenarioViewerPassword();
    await scenarioProxy();
    await scenarioSessionsSurviveRestart();
    await scenarioSinglePassword();
    await scenarioPlaylistFromUrl();
    console.log('Tutti i test del server sono passati.');
  } catch (e) {
    console.error('TEST FALLITO:', e.message);
    process.exitCode = 1;
  }
})();
