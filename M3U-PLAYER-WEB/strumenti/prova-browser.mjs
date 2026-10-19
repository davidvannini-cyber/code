// Prova nel browser (Playwright + Chromium) del sito servito da server.js, SENZA toccare i dati veri:
//  - pagina normale: niente deve cambiare (nessun tabindex sulle righe, cronologia invariata, Tab come sempre);
//  - /auto: una sola tappa, frecce e Tab a giro, Invio apre, cambio canale nel video, Indietro torna all'elenco.
// Uso:  node M3U-PLAYER-WEB/strumenti/prova-browser.mjs      (PLAYWRIGHT=/percorso/playwright se non e' installato qui;
//                                                             CHROMIUM=/percorso/chromium, predefinito /opt/pw-browsers/chromium)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');

const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-browser-'));
const names = ['Rai 1', 'Rai 2', 'Rai 3', 'Rete 4', 'Canale 5', 'Italia 1', 'La7', 'TV8'];
fs.writeFileSync(path.join(data, 'playlist.m3u'), '#EXTM3U\n' + names.map((n, i) =>
  `#EXTINF:-1 tvg-id="${n.replace(/ /g, '')}.it" group-title="Italy",${n}\nhttps://example.invalid/${i}.m3u8\n`).join(''));
const server = spawn(process.execPath, ['server.js'], { cwd: root, stdio: 'ignore',
  env: { ...process.env, PORT: String(port), DATA_DIR: data, ADMIN_PASSWORD: 'prova-prova-prova', EPG_URL: 'http://127.0.0.1:1/x' } });
const base = 'http://127.0.0.1:' + port;
for (let i = 0; ; i++) { try { await fetch(base + '/healthz'); break; } catch (_) { if (i > 50) throw new Error('server non partito'); await new Promise(r => setTimeout(r, 100)); } }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
try {
  const open = async p => {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
    page.errs = []; page.on('pageerror', e => page.errs.push(String(e)));
    await page.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: '' }));   // niente librerie esterne
    await page.goto(base + p); await page.waitForSelector('#channels li button');
    return page;
  };
  const names2 = p => p.$$eval('#channels li button', bs => bs.map(x => x.querySelector('.name').textContent));
  const focused = p => p.evaluate(() => { const a = document.activeElement; return a && a.tagName === 'BUTTON' && a.querySelector('.name') ? a.querySelector('.name').textContent : null; });

  // ---- pagina normale
  let p = await open('/');
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('auto')), false);
  assert.equal(await p.$$eval('#channels li button', bs => bs.filter(x => x.hasAttribute('tabindex')).length), 0, 'normale: nessun tabindex');
  const h0 = await p.evaluate(() => history.length);
  await p.focus('#channels li:first-child button');
  await p.keyboard.press('ArrowDown'); assert.equal(await focused(p), 'Rai 1', 'normale: freccia giu\' non sposta');
  await p.keyboard.press('Tab'); assert.equal(await focused(p), 'Rai 2', 'normale: Tab come sempre');
  await p.keyboard.press('Enter'); await p.waitForSelector('#player:not([hidden])');
  assert.equal(await p.evaluate(() => history.length), h0, 'normale: cronologia invariata');
  await p.click('#close'); await p.waitForSelector('#player', { state: 'hidden' });
  console.log('Pagina normale: ok');

  // ---- /auto
  p = await open('/auto');
  assert.equal(await p.$$eval('#channels li button', bs => bs.filter(x => x.tabIndex === 0).length), 1, 'auto: una sola tappa');
  const n = (await names2(p)).length;
  await p.focus('#channels li:first-child button');
  await p.keyboard.press('ArrowDown'); assert.equal(await focused(p), 'Rai 2');
  await p.keyboard.press('Tab'); assert.equal(await focused(p), 'Rai 3');
  await p.keyboard.press('Shift+Tab'); assert.equal(await focused(p), 'Rai 2');
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); assert.equal(await focused(p), (await names2(p))[n - 1], 'a giro: dalla cima al fondo');
  await p.keyboard.press('ArrowDown'); assert.equal(await focused(p), 'Rai 1', 'a giro: dal fondo alla cima');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  const h1 = await p.evaluate(() => history.length);
  await p.keyboard.press('Enter'); await p.waitForSelector('#player:not([hidden])');
  assert.equal(await p.evaluate(() => history.length), h1 + 1, 'auto: un passo in cronologia');
  const title = () => p.$eval('#title', e => e.textContent);
  assert.ok((await title()).startsWith('Rai 3'));
  await p.keyboard.press('ArrowRight'); assert.ok((await title()).startsWith('Rete 4'));
  await p.keyboard.press('Tab'); assert.ok((await title()).startsWith('Canale 5'));
  await p.keyboard.press('ArrowDown'); assert.ok((await title()).startsWith('Rete 4'));
  await p.goBack(); await p.waitForSelector('#player', { state: 'hidden' }); await p.waitForTimeout(400);
  assert.equal(await focused(p), 'Rete 4', 'auto: Indietro torna all\'elenco sul canale guardato');
  const r = await (await browser.newContext()).request.get(base + '/auto/', { maxRedirects: 0 });
  assert.equal(r.status(), 302);
  console.log('Modo auto: ok');
} finally {
  await browser.close();
  server.kill();
  fs.rmSync(data, { recursive: true, force: true });
}
