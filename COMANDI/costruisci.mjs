// Costruisce il PDF unico delle istruzioni dei comandi e copia i comandi dove Claude li legge.
// Uso (dalla radice del repository):   node COMANDI/costruisci.mjs        (copia + PDF)
//                                       node COMANDI/costruisci.mjs --verifica   (solo controllo)
// Il PDF richiede Playwright con Chromium: PLAYWRIGHT=/percorso/playwright, CHROMIUM=/percorso/chromium se servono.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dest = path.join(root, '.claude', 'commands');
const pdf = path.join(here, 'COMANDI-ISTRUZIONI.pdf');
const soloVerifica = process.argv.includes('--verifica');

// --- Lettura dei comandi ---
const nomi = fs.readdirSync(here).filter(f => f.endsWith('.md') && f !== 'README.md').map(f => f.slice(0, -3)).sort();
if (!nomi.length) { console.error('Nessun comando in COMANDI/'); process.exit(1); }

function frontmatter(testo) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(testo);
  const out = {};
  if (m) for (const riga of m[1].split('\n')) { const k = /^([\w-]+):\s*(.*)$/.exec(riga); if (k) out[k[1]] = k[2].trim(); }
  return out;
}

const comandi = nomi.map(nome => {
  const testo = fs.readFileSync(path.join(here, nome + '.md'), 'utf8');
  const fm = frontmatter(testo);
  const fileIstr = path.join(here, 'istruzioni', nome + '.md');
  const istr = fs.existsSync(fileIstr) ? fs.readFileSync(fileIstr, 'utf8') : null;
  return { nome, testo, descrizione: fm.description || '', argomenti: fm['argument-hint'] || '', istr };
});

const senza = comandi.filter(c => !c.istr).map(c => '/' + c.nome);
const senzaDescr = comandi.filter(c => !c.descrizione).map(c => '/' + c.nome);
if (senza.length) console.error('ATTENZIONE: mancano le istruzioni (COMANDI/istruzioni/<nome>.md) per: ' + senza.join(', '));
if (senzaDescr.length) console.error('ATTENZIONE: manca "description:" nell\'intestazione di: ' + senzaDescr.join(', '));
if (soloVerifica) { console.log(senza.length || senzaDescr.length ? 'Controllo: ci sono problemi (vedi sopra).' : 'Controllo: ok (' + comandi.length + ' comandi).'); process.exit(senza.length || senzaDescr.length ? 1 : 0); }

// --- Copia dei comandi dove Claude Code li legge ---
fs.mkdirSync(dest, { recursive: true });
for (const c of comandi) fs.writeFileSync(path.join(dest, c.nome + '.md'), c.testo);
console.log('Copiati in .claude/commands/: ' + comandi.map(c => '/' + c.nome).join(', '));

// --- Markdown semplice -> HTML ---
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
function md(testo) {
  const righe = testo.replace(/\r/g, '').split('\n');
  const html = [];
  let lista = null, par = [];
  const chiudiPar = () => { if (par.length) { html.push('<p>' + inline(par.join(' ')) + '</p>'); par = []; } };
  const chiudiLista = () => { if (lista) { html.push('</' + lista + '>'); lista = null; } };
  for (const r of righe) {
    let m;
    if ((m = /^#\s+(.*)$/.exec(r))) { continue; }                                // il titolo lo mette il PDF
    if ((m = /^##\s+(.*)$/.exec(r))) { chiudiPar(); chiudiLista(); html.push('<h3>' + inline(m[1]) + '</h3>'); continue; }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(r))) { chiudiPar(); if (lista !== 'ul') { chiudiLista(); html.push('<ul>'); lista = 'ul'; } html.push('<li>' + inline(m[1]) + '</li>'); continue; }
    if ((m = /^\s*\d+\.\s+(.*)$/.exec(r))) { chiudiPar(); if (lista !== 'ol') { chiudiLista(); html.push('<ol>'); lista = 'ol'; } html.push('<li>' + inline(m[1]) + '</li>'); continue; }
    if (!r.trim()) { chiudiPar(); chiudiLista(); continue; }
    chiudiLista(); par.push(r.trim());
  }
  chiudiPar(); chiudiLista();
  return html.join('\n');
}

const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const oggi = new Date();
const data = oggi.getDate() + ' ' + mesi[oggi.getMonth()] + ' ' + oggi.getFullYear();

const css = `
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1b1c2e; font-size: 10.8pt; line-height: 1.42; margin: 0; }
.copertina { height: 255mm; background: #0a0b1e; color: #fff; border-radius: 14px; padding: 28mm 20mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
.copertina .sigla { font-size: 12pt; letter-spacing: .18em; text-transform: uppercase; color: #b7a8ff; }
.copertina h1 { font-size: 40pt; line-height: 1.1; margin: 0 0 8mm; }
.copertina p { color: #cfd0e6; font-size: 13pt; margin: 0 0 3mm; }
.copertina .barra { height: 5px; width: 40mm; background: #7b5cff; border-radius: 3px; margin: 8mm 0; }
.indice { page-break-after: always; }
.indice h2 { font-size: 22pt; margin: 0 0 6mm; }
.indice .voce { display: flex; gap: 6mm; padding: 4mm 0; border-bottom: 1px solid #e3e3ef; align-items: baseline; }
.indice .voce b { color: #7b5cff; font-size: 13pt; min-width: 42mm; }
.indice .voce span { color: #4a4b66; }
.comando { page-break-before: always; }
.comando:first-of-type { page-break-before: auto; }
.testa { background: #f3f0ff; border-left: 6px solid #7b5cff; border-radius: 10px; padding: 5mm 7mm; margin-bottom: 4mm; }
.testa h2 { font-size: 24pt; margin: 0 0 2mm; color: #2c1e7a; }
.testa p { margin: 0; color: #3b3c5a; }
.testa .arg { margin-top: 2mm; font-size: 10pt; color: #6a6b86; }
h3 { font-size: 12.5pt; color: #2c1e7a; margin: 5mm 0 2mm; break-after: avoid; page-break-after: avoid; border-bottom: 2px solid #ece8ff; padding-bottom: 1mm; }
p { margin: 0 0 3mm; }
ul, ol { margin: 0 0 3mm; padding-left: 7mm; }
li { margin-bottom: 1.2mm; break-inside: avoid; }
code { font-family: "SF Mono", Menlo, Consolas, monospace; background: #f1f1f8; border-radius: 4px; padding: 0.5mm 1.6mm; font-size: 10pt; color: #2c1e7a; }
`;

const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Comandi di Claude — istruzioni</title><style>${css}</style></head><body>
<section class="copertina">
  <div class="sigla">momandis</div>
  <div><h1>Comandi<br>di Claude</h1><div class="barra"></div>
  <p>Come usarli, con esempi in italiano semplice.</p><p>${comandi.length} ${comandi.length === 1 ? 'comando' : 'comandi'} · aggiornato il ${data}</p></div>
  <div style="font-size:10pt;color:#9a9bb8">Questo PDF si rigenera da solo quando si aggiunge o si cambia un comando.</div>
</section>
<section class="indice"><h2>Elenco dei comandi</h2>
${comandi.map(c => `<div class="voce"><b>/${esc(c.nome)}</b><span>${esc(c.descrizione)}</span></div>`).join('\n')}
</section>
${comandi.map(c => `<section class="comando"><div class="testa"><h2>/${esc(c.nome)}</h2><p>${esc(c.descrizione)}</p>${c.argomenti ? `<div class="arg">Cosa scrivere dopo il comando: ${esc(c.argomenti)}</div>` : ''}</div>
${c.istr ? md(c.istr) : '<p><i>Istruzioni non ancora scritte.</i></p>'}</section>`).join('\n')}
</body></html>`;

let chromium;
try { ({ chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright')); }
catch { console.error('Playwright non trovato: indica il percorso con PLAYWRIGHT=… (i comandi sono comunque stati copiati).'); process.exit(2); }
const tmp = path.join(here, '.istruzioni.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('file://' + tmp);
  await page.pdf({
    path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#8a8ba8;text-align:center;font-family:Arial">Comandi di Claude · pagina <span class="pageNumber"></span> di <span class="totalPages"></span></div>',
  });
} finally { await browser.close(); fs.rmSync(tmp, { force: true }); }
console.log('PDF aggiornato: COMANDI/COMANDI-ISTRUZIONI.pdf (' + comandi.length + ' comandi)');
