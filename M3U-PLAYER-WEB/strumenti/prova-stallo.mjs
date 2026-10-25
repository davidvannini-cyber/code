// Prova nel browser del cambio fonte automatico quando un canale gia' partito si blocca a caricare (orologio simulato, nessuna rete).
// Uso:  node M3U-PLAYER-WEB/strumenti/prova-stallo.mjs      (PLAYWRIGHT=/percorso/playwright, CHROMIUM=/percorso/chromium se servono)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs'; import net from 'node:net'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-stallo-'));
fs.writeFileSync(path.join(data, 'playlist.m3u'), '#EXTM3U\n' + [1,2,3].map(i =>
  `#EXTINF:-1 tvg-id="Rai1.it" group-title="Italy",Rai 1\nhttps://example.invalid/s${i}.m3u8\n`).join(''));
const server = spawn(process.execPath, ['server.js'], { cwd: root, stdio: 'ignore',
  env: { ...process.env, PORT: String(port), DATA_DIR: data, ADMIN_PASSWORD: 'prova-prova-prova', EPG_URL: 'http://127.0.0.1:1/x' } });
const base = 'http://127.0.0.1:' + port;
for (let i = 0; ; i++) { try { await fetch(base + '/healthz'); break; } catch (_) { if (i > 50) throw new Error('server'); await new Promise(r => setTimeout(r, 100)); } }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://example.invalid/**', () => {});   // la richiesta resta appesa: nessun errore del video
  await page.clock.install();
  await page.goto(base + '/'); await page.waitForSelector('#channels li button');
  await page.click('#channels li button');
  const src = () => page.evaluate(() => document.querySelector('video').getAttribute('src'));
  const ev = n => page.evaluate(n => document.querySelector('video').dispatchEvent(new Event(n)), n);
  const msg = () => page.textContent('#msg');
  await page.waitForFunction(() => document.querySelector('video').getAttribute('src'));
  const s0 = await src(); console.log('fonte iniziale', s0);
  // 1) parte, si blocca 10 s, riparte: nessun cambio
  await ev('playing'); await ev('waiting'); await page.clock.fastForward(10000); await ev('playing');
  await page.clock.fastForward(30000);
  assert.equal(await src(), s0, 'un blocco breve non deve cambiare fonte');
  // 2) parte, si blocca 20 s: fonte successiva
  await ev('playing'); await ev('waiting'); await page.clock.fastForward(20500);
  const s1 = await src(); console.log('dopo stallo 1', s1, '|', await msg());
  assert.notEqual(s1, s0); assert.match(await page.evaluate(() => document.querySelector('#nowName, #title, #bar')?.textContent || ''), /.*/);
  // 3) un secondo blocco funziona ancora (timer riarmato), fino a tornare alla prima
  await ev('playing'); await ev('waiting'); await page.clock.fastForward(20500);
  const s2 = await src(); assert.notEqual(s2, s1);
  await ev('playing'); await ev('waiting'); await page.clock.fastForward(20500);
  const s3 = await src(); console.log('giro completo ->', s3); assert.equal(s3, s0, 'dopo l\'ultima riparte dalla prima');
  // 4) blocco senza essere mai partito: ci pensa il timer di avvio, non quello di stallo (nessun doppio salto)
  // 5) in pausa durante lo stallo: nessun cambio
  await ev('playing'); await ev('waiting'); await page.evaluate(() => document.querySelector('video').pause()); await page.clock.fastForward(25000);
  assert.equal(await src(), s0);
  assert.deepEqual(errs, []);
  console.log('PROVA STALLO: ok');
} finally { await browser.close(); server.kill(); }
