// Costruisce GUIDA-TV-VANNINI.pdf dai pezzi in parts/ (HTML) e dalle immagini in img/.
// Uso: node build.mjs     Richiede Playwright con Chromium, pdftotext e Python (pypdf, reportlab).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const parts = fs.readdirSync(path.join(here, 'parts')).sort().map(f => fs.readFileSync(path.join(here, 'parts', f), 'utf8')).join('\n');
const TITLES = ['In breve', 'Indirizzi e componenti', 'Il sito: l\'elenco dei canali', 'Il lettore video', 'Le liste e le fonti', 'L\'area admin', 'La guida programmi (EPG)',
  'L\'app per Fire TV', 'Il modo auto (CarPlay)', 'Mac, Safari e Chrome', 'Dietro le quinte', 'Manutenzione: come fare', 'Se qualcosa non va', 'Punti di ripristino', 'Stato e glossario'];
const out = path.join(here, '..', 'GUIDA-TV-VANNINI.pdf');
const raw = path.join(here, '.raw.pdf');

async function render(pages) {
  let html = parts;
  for (let i = 1; i <= 15; i++) html = html.replace(`{{P:s${i}}}`, pages[i] || '–');
  const file = path.join(here, '.guida.html');
  fs.writeFileSync(file, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: raw, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
}
function pageTexts() {
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [raw]).toString())[1]);
  const t = [];
  for (let i = 1; i <= n; i++) t[i] = execFileSync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', raw, '-']).toString();
  return t;
}
function findPages() {
  const t = pageTexts(), pages = {};
  TITLES.forEach((title, i) => {
    const num = String(i + 1).padStart(2, '0');
    const re = new RegExp(num + '\\s+' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    for (let p = 3; p < t.length; p++) if (re.test(t[p])) { pages[i + 1] = p; break; }
  });
  return pages;
}
await render({});
let pages = findPages();
await render(pages);
const again = findPages();
if (JSON.stringify(again) !== JSON.stringify(pages)) { pages = again; await render(pages); }
console.log('Pagine dei capitoli:', JSON.stringify(pages));
execFileSync('python3', [path.join(here, 'stamp.py'), raw, out], { stdio: 'inherit' });
fs.rmSync(raw); fs.rmSync(path.join(here, '.guida.html'));
console.log('Scritto', out);
