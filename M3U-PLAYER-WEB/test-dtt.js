// Esegui con:  node test-dtt.js
const assert = require('assert');
const { parseM3U } = require('./public/m3u.js');
const DTT = require('./public/dtt-it.js');

const { channels } = parseM3U(`#EXTM3U
#EXTINF:-1 tvg-id="Cielo.it@SD" group-title="Entertainment",Cielo (576p)
https://h/cielo.m3u8
#EXTINF:-1 tvg-id="BBCOne.uk@SD" group-title="General",BBC One
https://h/bbc.m3u8
#EXTINF:-1 tvg-id="Rai3.it@SD" group-title="General",Rai 3 HD
https://h/rai3.m3u8
#EXTINF:-1 tvg-id="TeleLombardia.it" group-title="General",Tele Lombardia
https://h/tl.m3u8
#EXTINF:-1 tvg-id="Rai1.it@SD" group-title="General",Rai 1 [Not 24/7]
https://h/rai1.m3u8
#EXTINF:-1 tvg-id="" group-title="Italy",Antenna Locale
https://h/al.m3u8
#EXTINF:-1 group-title="News",Canale 5
https://h/c5.m3u8
#EXTINF:-1 tvg-id="Rai1.it@HD" group-title="General",Rai 1
https://h/rai1b.m3u8
#EXTINF:-1 group-title="General",Rai 2
https://h/rai2.m3u8
#EXTINF:-1 group-title="General",La7
https://h/la7.m3u8
#EXTINF:-1 group-title="Music",RTL 102.5 Traffic
https://h/rtl.m3u8
#EXTINF:-1 tvg-id="Rai4.it@SD" group-title="General",Rai4
https://h/rai4.m3u8
#EXTINF:-1 group-title="Music",RTL 102.5
https://h/rtl2.m3u8
#EXTINF:-1 group-title="General",Italia 1
https://h/i1.m3u8`);

assert.strictEqual(DTT.key('Rai 3 HD'), 'rai3');
assert.strictEqual(DTT.key('Rai 1 [Not 24/7] (576p)'), 'rai1');
assert.strictEqual(DTT.key('RTL 102.5'), 'rtl1025');
assert.strictEqual(DTT.key('Super!'), 'super');
assert.strictEqual(DTT.key('Perù TV 4K HD'), 'peruTV'.toLowerCase());

const it = channels.filter(DTT.isItalian);
assert.ok(!it.some(c => c.name === 'BBC One'), 'BBC One non e italiano');
assert.ok(!it.some(c => c.name === 'RTL 102.5 Traffic'), 'senza id ne gruppo ne numero non si puo sapere: escluso');
assert.deepStrictEqual(it.map(c => c.name).includes('Tele Lombardia'), true, 'id con .it');
assert.deepStrictEqual(it.map(c => c.name).includes('Antenna Locale'), true, 'gruppo Italy');
assert.deepStrictEqual(it.map(c => c.name).includes('Canale 5'), true, 'canale noto senza id');

const order = DTT.sortDtt(it).map(c => c.name);
assert.deepStrictEqual(order, [
  'Rai 1', 'Rai 1 [Not 24/7]',        // stesso numero: prima quella senza [Not 24/7]
  'Rai 2', 'Rai 3 HD', 'Canale 5', 'Italia 1', 'La7',
  'Rai4', 'Cielo (576p)', 'RTL 102.5',
  'Antenna Locale', 'Tele Lombardia',   // senza numero: per nome
]);
assert.strictEqual(DTT.lcnOf({ name: 'x', tvgId: 'Rai2.it@SD' }), 2, 'numero dall id');

{
  // Stesso nome in paesi diversi: conta il paese, non il nome.
  const { channels: tv8 } = parseM3U(`#EXTM3U
#EXTINF:-1 tvg-id="TV8.it@SD" group-title="General",TV8
https://h/1.m3u8
#EXTINF:-1 tvg-id="TV8.tr@SD" group-title="General",TV8 (Turkiye) (1080p)
https://h/2.m3u8
#EXTINF:-1 tvg-id="TV8.lt" group-title="Undefined",TV8 (Lithuania) (576p)
https://h/3.m3u8
#EXTINF:-1 group-title="Undefined",TV8 (Slovakia) (576p)
https://h/4.m3u8
#EXTINF:-1 group-title="Documentary;News",TV8 (Moldova) [Not 24/7]
https://h/5.m3u8
#EXTINF:-1 group-title="General",TV8 [Geo-blocked]
https://h/6.m3u8
#EXTINF:-1 group-title="General",TV8 (Italy) (1080p)
https://h/7.m3u8
#EXTINF:-1 tvg-id="20Mediaset.it@SD" group-title="Entertainment",20 [Geo-blocked]
https://h/8.m3u8`);
  assert.deepStrictEqual(tv8.filter(DTT.isItalian).map(c => c.url.slice(-8)), ['h/1.m3u8', 'h/6.m3u8', 'h/7.m3u8', 'h/8.m3u8']);
  assert.strictEqual(DTT.lcnOf(tv8[7]), 20, '20 con [Geo-blocked]');
}

{
  // Versioni doppie: la [Geo-blocked] si nasconde solo se ne esiste una senza.
  const { channels: dup } = parseM3U(`#EXTM3U
#EXTINF:-1 tvg-id="Canale5.it@SD",Canale 5 [Geo-blocked]
https://h/c5-geo.m3u8
#EXTINF:-1 tvg-id="Canale5.it@HD",Canale 5 (576p)
https://h/c5.m3u8
#EXTINF:-1 tvg-id="Italia1.it@SD",Italia 1 [Geo-blocked]
https://h/i1-geo.m3u8
#EXTINF:-1 tvg-id="Rete4.it@SD",Rete 4 [Geo-blocked]
https://h/r4-geo.m3u8
#EXTINF:-1 tvg-id="Rete4.it@HD",Rete 4 HD (1080p)
https://h/r4-hd.m3u8
#EXTINF:-1 tvg-id="Rete4.it@SD",Rete 4 (576p)
https://h/r4-sd.m3u8
#EXTINF:-1 tvg-id="TeleX.it",Tele X [Geo-blocked]
https://h/x-geo.m3u8
#EXTINF:-1 tvg-id="TeleX.it",Tele X
https://h/x.m3u8
#EXTINF:-1 tvg-id="TeleY.it",Tele Y [Geo-blocked]
https://h/y-geo.m3u8`);
  const shown = DTT.sortDtt(DTT.preferWorking(dup.filter(DTT.isItalian))).map(c => c.name);
  assert.deepStrictEqual(shown, [
    'Rete 4 HD (1080p)', 'Rete 4 (576p)',            // la [Geo-blocked] sparisce, la risoluzione piu' alta viene prima
    'Canale 5 (576p)',
    'Italia 1 [Geo-blocked]',                          // unica versione: resta
    'Tele X', 'Tele Y [Geo-blocked]',                  // senza numero: per nome; Tele Y resta perche' e' l'unica
  ]);
}

{
  // Liste italiane gia' numerate: tvg-chno (iptvitaplus) e prefisso "[N]" (iptvita).
  const { channels: n } = parseM3U(`#EXTM3U
#EXTINF:-1 tvg-id="RaiSport+HD.it" tvg-chno="58" group-title="Rai",Rai Sport + HD
http://h/1
#EXTINF:-1,[57] Rai Scuola
http://h/2
#EXTINF:-1,[64] Supertennis
http://h/3
#EXTINF:-1 tvg-id="rds" tvg-chno="265",RDS Social TV
http://h/4
#EXTINF:-1 tvg-chno="abc",Senza numero valido
http://h/5`);
  assert.strictEqual(n[0].chno, 58);
  assert.strictEqual(n[4].chno, null);
  assert.strictEqual(DTT.lcnOf(n[0]), 58, 'tvg-chno');
  assert.strictEqual(DTT.lcnOf(n[1]), 57, 'prefisso [N] vince sulla tabella (Rai Scuola 146)');
  assert.strictEqual(DTT.cleanName(n[1]), 'Rai Scuola');
  assert.strictEqual(DTT.cleanName(n[2]), 'Supertennis');
  assert.ok(DTT.isItalian(n[1]) && DTT.isItalian(n[2]), 'lista numerata = italiana');
  assert.ok(DTT.isItalian(n[0]), 'id .it');
  assert.ok(!DTT.isItalian(n[3]), 'il solo numero di canale non rende italiano un canale');
  assert.deepStrictEqual(DTT.sortDtt(n.filter(DTT.isItalian)).map(c => DTT.cleanName(c)), ['Rai Scuola', 'Rai Sport + HD', 'Supertennis']);
  assert.deepStrictEqual(DTT.sortDtt(n).map(c => DTT.lcnOf(c)), [57, 58, 64, 265, undefined], 'ordinamento per numero, senza numero in fondo');
}
console.log('Tutti i test del DTT sono passati.');
