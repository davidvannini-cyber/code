import assert from 'node:assert/strict';
import { parseTime, parseXmltv, buildEpg } from './epg/build-epg.mjs';

const now = Date.UTC(2026, 9, 19, 18, 0, 0) / 1000;       // 19/10/2026 18:00 UTC
assert.equal(parseTime('20261019200000 +0200'), now);
assert.equal(parseTime('20261019180000'), now);
assert.equal(parseTime('20261019123000 -0530'), now);
assert.ok(Number.isNaN(parseTime('boh')));

const A = `<?xml version="1.0"?><tv>
<channel id="Rai1.it"><display-name>Rai 1</display-name></channel>
<channel id="Rai.1.HD..101.it"><display-name lang="it">Rai 1 HD</display-name></channel>
<channel id="Canale.5.it"><display-name>Canale 5</display-name></channel>
<channel id="Vuoto.it"><display-name>Vuoto</display-name></channel>
<programme start="20261019195000 +0200" stop="20261019203000 +0200" channel="Rai1.it"><title lang="it">TG1 &amp; Meteo</title></programme>
<programme start="20261019203000 +0200" stop="20261019213000 +0200" channel="Rai1.it"><title>Affari Tuoi</title></programme>
<programme start="20261019213000 +0200" stop="20261019233000 +0200" channel="Rai1.it"><title><![CDATA[Film "Evento"]]></title></programme>
<programme start="20261018100000 +0200" stop="20261018110000 +0200" channel="Rai1.it"><title>Ieri</title></programme>
<programme start="20261019203000 +0200" stop="20261019213000 +0200" channel="Rai.1.HD..101.it"><title>Solo HD (inizia dopo)</title></programme>
<programme start="20261020090000 +0200" stop="20261020100000 +0200" channel="Canale.5.it"><title>Domani lontano</title></programme>
<programme start="20261019200000 +0200" stop="20261019210000 +0200" channel="Sconosciuto"><title>Senza canale</title></programme>
</tv>`;
const B = `<tv><channel id="La7.it"><display-name>La7</display-name></channel>
<programme start="20261019195500 +0200" stop="20261019210000 +0200" channel="La7.it"><title>Otto e mezzo</title></programme></tv>`;

const a = parseXmltv(A);
assert.equal(a.size, 4);
assert.equal(a.get('Rai1.it').progs.length, 4);
assert.equal(a.get('Rai1.it').progs[0][2], 'TG1 & Meteo');
assert.equal(a.get('Rai1.it').progs[2][2], 'Film "Evento"');

const epg = buildEpg([a, parseXmltv(B)], now);
const rai1 = epg.channels.rai1;
assert.deepEqual(rai1.map(p => p[2]), ['TG1 & Meteo', 'Affari Tuoi', 'Film "Evento"']);     // in corso, poi i successivi; ieri escluso
assert.equal(rai1[0][0], now - 600);                                                       // 19:50 locale = 17:50 UTC
assert.equal(epg.channels.la7[0][2], 'Otto e mezzo');                                      // seconda fonte
assert.equal(epg.channels.canale5, undefined);                                             // solo programmi oltre l'orizzonte
assert.equal(epg.channels.vuoto, undefined);
assert.ok(JSON.stringify(epg).length < 2000);

// La fonte preferita perde se non ha il programma in corso ma l'altra si'.
const C = `<tv><channel id="Rai1.it"><display-name>Rai 1</display-name></channel>
<programme start="20261019210000 +0200" stop="20261019220000 +0200" channel="Rai1.it"><title>Solo dopo</title></programme></tv>`;
const e2 = buildEpg([parseXmltv(C), a], now);
assert.equal(e2.channels.rai1[0][2], 'TG1 & Meteo');
console.log('Tutti i test dell\'EPG sono passati.');
