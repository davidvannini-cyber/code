/* Parser M3U/M3U8 esteso (#EXTM3U / #EXTINF). Nessuna dipendenza: gira nel browser e in Node. */
(function (root) {
  function fail(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }

  // Legge coppie chiave="valore" (o chiave=valore) da una stringa.
  function scanAttributes(s, from, stopAtComma) {
    const attrs = {};
    let i = from;
    while (i < s.length) {
      const c = s[i];
      if (c === ',' && stopAtComma) break;
      if (c === ' ') { i++; continue; }
      let key = '';
      while (i < s.length && s[i] !== '=' && !(stopAtComma && s[i] === ',') && s[i] !== ' ') key += s[i++];
      if (s[i] !== '=') continue;
      i++;
      let value = '';
      if (s[i] === '"') {
        i++;
        while (i < s.length && s[i] !== '"') value += s[i++];
        i++;
      } else {
        while (i < s.length && s[i] !== ' ' && !(stopAtComma && s[i] === ',')) value += s[i++];
      }
      if (key) attrs[key.toLowerCase()] = value;
    }
    return { attrs, end: i };
  }

  // Input: cio' che segue "#EXTINF:", es. `-1 tvg-id="a" group-title="News",Rai News`
  function parseExtInf(s) {
    let i = 0;
    while (i < s.length && s[i] !== ' ' && s[i] !== ',') i++;           // durata
    const { attrs, end } = scanAttributes(s, i, true);
    const title = s[end] === ',' ? s.slice(end + 1).trim() : '';
    return { attrs, title };
  }

  function parseM3U(text) {
    const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length || !lines[0].startsWith('#EXTM3U')) throw fail('missing-header', 'Non sembra una playlist M3U (manca #EXTM3U).');
    if (lines.some(l => l.startsWith('#EXT-X-STREAM-INF') || l.startsWith('#EXT-X-TARGETDURATION'))) {
      throw fail('hls-manifest', 'Questo e\' un flusso HLS, non una lista di canali.');
    }

    const header = scanAttributes(lines[0], '#EXTM3U'.length, false).attrs;
    const epgUrl = header['url-tvg'] || header['x-tvg-url'] || null;
    const channels = [];
    let pending = null;
    let pendingGroup = null;
    let currentSrc = 0;                      // fonte corrente, dichiarata da righe "#X-SOURCE:n" nelle playlist unite

    for (const line of lines.slice(1)) {
      if (line.startsWith('#EXTINF:')) {
        pending = parseExtInf(line.slice('#EXTINF:'.length));
      } else if (line.startsWith('#X-SOURCE:')) {
        currentSrc = Number(line.slice('#X-SOURCE:'.length)) || 0;
      } else if (line.startsWith('#EXTGRP:')) {
        pendingGroup = line.slice('#EXTGRP:'.length).trim();
      } else if (line.startsWith('#')) {
        continue;
      } else {
        let url;
        try { url = new URL(line); } catch (_) { continue; }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
        const a = pending ? pending.attrs : {};
        channels.push({
          id: channels.length,
          name: (pending && pending.title) || a['tvg-name'] || url.hostname || 'Canale ' + (channels.length + 1),
          url: url.href,
          logo: a['tvg-logo'] || null,
          group: a['group-title'] || pendingGroup || null,
          tvgId: a['tvg-id'] || null,
          chno: /^\d{1,4}$/.test(a['tvg-chno'] || '') ? Number(a['tvg-chno']) : null,   // numero di canale scelto dalla lista
          src: Number(a['x-src']) || currentSrc,                                                   // fonte (lista) di provenienza, se la playlist e' unita
        });
        pending = null;
        pendingGroup = null;
      }
    }
    return { channels, epgUrl };
  }

  const api = { parseM3U, parseExtInf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3U = api;
})(typeof window !== 'undefined' ? window : globalThis);
