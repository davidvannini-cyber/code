/* Costruisce epg.json: "adesso in onda" e "dopo" per i canali italiani, a partire da guide XMLTV pubbliche.
   Uso: node build-epg.mjs [uscita.json]   (gira ogni due ore su GitHub, vedi .github/workflows/epg.yml)
   Il file prodotto e' piccolo (poche decine di KB): { updated, channels: { chiave: [[inizio, fine, titolo], ...] } }
   con orari in secondi UNIX. Le chiavi sono le stesse che usano il sito e l'app (DTT.key / DTT.idKey). */
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const DTT = require('../public/dtt-it.js');

// In ordine di preferenza: la prima che ha il programma in corso vince, le altre riempiono i buchi.
export const SOURCES = [
  'https://epgshare01.online/epgshare01/epg_ripper_IT1.xml.gz',
  'https://www.open-epg.com/files/italy3.xml.gz',
];
const AHEAD_S = 8 * 3600;        // quanto avanti tenere i programmi
const MAX_PER_CHANNEL = 8;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s) {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
      }
      return Object.prototype.hasOwnProperty.call(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
    })
    .replace(/\s+/g, ' ').trim();
}

// "20261019203000 +0200" -> secondi UNIX
export function parseTime(s) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-])?(\d{2})?(\d{2})?/.exec(String(s || '').trim());
  if (!m) return NaN;
  let t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) / 1000;
  if (m[7]) t -= (m[7] === '-' ? -1 : 1) * ((+m[8] || 0) * 3600 + (+m[9] || 0) * 60);
  return t;
}

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

// Legge un file XMLTV: { channels: Map(id -> { names, progs: [[inizio, fine, titolo]] }) }
export function parseXmltv(xml) {
  const channels = new Map();
  for (const m of xml.matchAll(/<channel\s+([^>]*)>([\s\S]*?)<\/channel>/g)) {
    const id = attrs(m[1]).id;
    if (!id) continue;
    const names = [...m[2].matchAll(/<display-name[^>]*>([\s\S]*?)<\/display-name>/g)].map(x => decode(x[1])).filter(Boolean);
    channels.set(id, { names, progs: [] });
  }
  for (const m of xml.matchAll(/<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g)) {
    const a = attrs(m[1]);
    const ch = channels.get(a.channel);
    if (!ch) continue;
    const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[2]);
    const start = parseTime(a.start);
    const stop = parseTime(a.stop);
    if (!title || !Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) continue;
    const t = decode(title[1]);
    if (t) ch.progs.push([start, stop, t]);
  }
  return channels;
}

// Chiavi con cui un canale XMLTV puo' essere ritrovato dal sito: dall'id e dai nomi.
function keysOf(id, ch) {
  return new Set([DTT.idKey(id), ...ch.names.map(DTT.key)].filter(Boolean));
}

// sources: elenco (in ordine di preferenza) di Map prodotte da parseXmltv. now: secondi UNIX.
export function buildEpg(sources, now) {
  const candidates = new Map();                       // chiave -> [{ progs, order }]
  sources.forEach((channels, order) => {
    for (const [id, ch] of channels) {
      const progs = ch.progs
        .filter(p => p[1] > now && p[0] < now + AHEAD_S)
        .sort((a, b) => a[0] - b[0])
        .filter((p, i, all) => i === 0 || p[0] >= all[i - 1][1] || p[0] > all[i - 1][0])      // niente doppioni
        .slice(0, MAX_PER_CHANNEL);
      if (!progs.length) continue;
      for (const k of keysOf(id, ch)) {
        if (!candidates.has(k)) candidates.set(k, []);
        candidates.get(k).push({ progs, order });
      }
    }
  });
  const out = {};
  for (const [k, list] of candidates) {
    // meglio chi ha il programma in corso, poi chi copre piu' ore, poi la fonte preferita
    const score = c => [c.progs[0][0] <= now ? 1 : 0, c.progs[c.progs.length - 1][1]];
    list.sort((a, b) => score(b)[0] - score(a)[0] || score(b)[1] - score(a)[1] || a.order - b.order);
    out[k] = list[0].progs;
  }
  return { updated: new Date(now * 1000).toISOString(), channels: out };
}

async function download(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; tv-vannini-epg)' }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error('risposta ' + res.status);
  let buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  return buf.toString('utf8');
}

async function main() {
  const outFile = process.argv[2] || 'epg.json';
  const parsed = [];
  for (const url of SOURCES) {
    try {
      const channels = parseXmltv(await download(url));
      const withProgs = [...channels.values()].filter(c => c.progs.length).length;
      console.log(`${url}: ${channels.size} canali, ${withProgs} con programmi`);
      if (withProgs) parsed.push(channels);
    } catch (e) {
      console.log(`${url}: non disponibile (${e.message})`);
    }
  }
  if (!parsed.length) throw new Error('Nessuna guida scaricata: file non scritto.');
  const epg = buildEpg(parsed, Math.floor(Date.now() / 1000));
  const n = Object.keys(epg.channels).length;
  if (n < 10) throw new Error(`Troppi pochi canali con programmi (${n}): file non scritto.`);
  writeFileSync(outFile, JSON.stringify(epg));
  console.log(`Scritto ${outFile}: ${n} chiavi, ${JSON.stringify(epg).length} byte`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
