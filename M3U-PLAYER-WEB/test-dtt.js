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
  'Rai 1 [Not 24/7]', 'Rai 1',        // stesso numero: ordine originale
  'Rai 2', 'Rai 3 HD', 'Canale 5', 'Italia 1', 'La7',
  'Rai4', 'Cielo (576p)', 'RTL 102.5',
  'Antenna Locale', 'Tele Lombardia',   // senza numero: per nome
]);
assert.strictEqual(DTT.lcnOf({ name: 'x', tvgId: 'Rai2.it@SD' }), 2, 'numero dall id');
console.log('Tutti i test del DTT sono passati.');
