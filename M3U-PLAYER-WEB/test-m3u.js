// Esegui con:  node test-m3u.js
const assert = require('assert');
const { parseM3U } = require('./public/m3u.js');

{
  const r = parseM3U(`#EXTM3U url-tvg="https://e.it/epg.xml.gz"
#EXTINF:-1 tvg-id="rai1.it" tvg-logo="https://x.it/l.png" group-title="Generali, Italia",Rai 1
https://example.com/rai1/index.m3u8`);
  const c = r.channels[0];
  assert.strictEqual(r.epgUrl, 'https://e.it/epg.xml.gz');
  assert.strictEqual(c.name, 'Rai 1');
  assert.strictEqual(c.group, 'Generali, Italia');
  assert.strictEqual(c.tvgId, 'rai1.it');
  assert.strictEqual(c.logo, 'https://x.it/l.png');
  assert.strictEqual(c.url, 'https://example.com/rai1/index.m3u8');
}
{
  const r = parseM3U('﻿#EXTM3U\r\n#EXTINF:-1,Canale\r\n#EXTGRP:Sport\r\nhttp://h/s.m3u8\r\n');
  assert.strictEqual(r.channels[0].name, 'Canale');
  assert.strictEqual(r.channels[0].group, 'Sport');
}
{
  const r = parseM3U('#EXTM3U\n#EXTINF:-1,A\nrtmp://h/a\n#EXTINF:-1,B\nhttps://h/b.m3u8\n#EXTINF:-1,C\nhttps://h/c.m3u8');
  assert.deepStrictEqual(r.channels.map(c => c.name), ['B', 'C']);
}
{
  // Formato tipico delle liste pubbliche (es. iptv-org): righe #EXTVLCOPT tra #EXTINF e URL, qualita' e note nel nome,
  // gruppi con piu' valori, loghi con parametri, righe vuote e commenti.
  const r = parseM3U(`#EXTM3U

#EXTINF:-1 tvg-id="Canale1.it@SD" tvg-logo="https://i.imgur.com/a.png?x=1&y=2" group-title="News;General",Canale Uno (576p) [Not 24/7]
#EXTVLCOPT:http-referrer=https://sito.example/
#EXTVLCOPT:http-user-agent=Mozilla/5.0
https://stream.example/uno/index.m3u8?token=abc&x=1
# commento
#EXTINF:-1 tvg-id="" tvg-logo="" group-title="",Senza gruppo
https://stream.example/due.m3u8
#EXTINF:-1 group-title="Musica",Nome, con virgola
https://stream.example/tre.m3u8`);
  assert.strictEqual(r.channels.length, 3);
  assert.strictEqual(r.channels[0].name, 'Canale Uno (576p) [Not 24/7]');
  assert.strictEqual(r.channels[0].group, 'News;General');
  assert.strictEqual(r.channels[0].logo, 'https://i.imgur.com/a.png?x=1&y=2');
  assert.strictEqual(r.channels[0].url, 'https://stream.example/uno/index.m3u8?token=abc&x=1');
  assert.strictEqual(r.channels[1].group, null);
  assert.strictEqual(r.channels[1].logo, null);
  assert.strictEqual(r.channels[2].name, 'Nome, con virgola');
}
assert.throws(() => parseM3U('https://h/a.m3u8'), { code: 'missing-header' });
assert.throws(() => parseM3U('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nlow/index.m3u8'), { code: 'hls-manifest' });
console.log('Tutti i test del parser sono passati.');
