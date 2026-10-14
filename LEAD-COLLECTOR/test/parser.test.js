'use strict';
const assert = require('assert');
const os = require('os'), path = require('path');
process.env.LEADS_FILE = path.join(os.tmpdir(), 'leads-test-' + process.pid + '.json');
const { ingest } = require('../ingest');
const store = require('../store');

const eml = [
  'From: =?UTF-8?Q?Sito_Web?= <noreply@sito.it>',
  'Reply-To: Mario Rossi <mario@example.com>',
  'Subject: Nuova richiesta preventivo',
  'Message-ID: <abc@sito.it>',
  'Content-Type: text/plain; charset=utf-8',
  'Content-Transfer-Encoding: quoted-printable',
  '',
  'Nome: Mario Rossi',
  'Telefono: +39 347 123 4567',
  'Azienda: Rossi Srl',
  'Citt=C3=A0: Milano',
  'Messaggio: Vorrei un preventivo per 3 auto',
].join('\r\n');

let r = ingest(eml);
assert(r.added, 'primo inserimento');
assert.strictEqual(r.lead.name, 'Mario Rossi');
assert.strictEqual(r.lead.email, 'mario@example.com');
assert.strictEqual(r.lead.phone, '+39 347 123 4567');
assert.strictEqual(r.lead.city, 'Milano');
assert.strictEqual(r.lead.company, 'Rossi Srl');
assert.strictEqual(ingest(eml).reason, 'duplicato');

r = ingest({ subject: 'x', from: 'a@b.it', text: 'Ciao, sono Anna, scrivimi a anna@test.it o chiama 333 1234567' });
assert(r.added && r.lead.email === 'anna@test.it' && r.lead.phone === '333 1234567', JSON.stringify(r));

assert.strictEqual(ingest({ text: 'niente di utile qui' }).added, false);
assert.strictEqual(store.load().length, 2);
console.log('OK');
// testo semplice senza intestazioni
{
  const { ingest: ing } = require('../ingest');
  const r = ing('Udine\n+393391757166\ngrazianomoreale@gmail.com\nGraziano Moreale');
  assert(r.added, JSON.stringify(r));
  assert.strictEqual(r.lead.name, 'Graziano Moreale');
  assert.strictEqual(r.lead.city, 'Udine');
  assert.strictEqual(r.lead.phone, '+393391757166');
  assert.strictEqual(r.lead.email, 'grazianomoreale@gmail.com');
  const r2 = ing('Nome: Mario Rossi\nEmail: m@e.it\nTelefono: 347 1234567');
  assert(r2.added && r2.lead.name === 'Mario Rossi', JSON.stringify(r2));
  require('fs').unlinkSync(process.env.LEADS_FILE);
  console.log('OK2');
}
{
  const r = require('../ingest').ingest('From: Google <x@accounts.google.com>\nSubject: Avviso di sicurezza\n\nControlla l\'attività 1791972837009');
  assert(!r.added && /ignorato/.test(r.reason), JSON.stringify(r));
  console.log('OK3');
}
{
  process.env.OWN_ADDRESSES = 'info@yesmobility.it';
  delete require.cache[require.resolve('../ingest')];
  const r = require('../ingest').ingest('From: YesMobility <info@yesmobility.it>\nSubject: Fwd: richiesta\n\nCliente interessato, chiama 347 7654321');
  assert(r.added && r.lead.email === '' && r.lead.name === '' && r.lead.phone === '347 7654321', JSON.stringify(r));
  console.log('OK4');
}
{
  process.env.OWN_ADDRESSES = 'info@yesmobility.it,leads.ym@gmail.com';
  delete require.cache[require.resolve('../ingest')];
  delete require.cache[require.resolve('../extract')];
  const html = '<p>yesmobility info@yesmobility.it Tel: +39 050 791 7337</p><p>Inizio messaggio inoltrato:</p>'
    + '<p><b>Da:</b> Kiko Corsentino &lt;kiko@facilesalire.it&gt;<br><b>Oggetto:</b> Lead Facebook<br><b>A:</b> info@yesmobility.it</p>'
    + '<table><tr><td>Udine</td><td>+393391757166</td><td>grazianomoreale@gmail.com</td><td>Graziano Moreale</td></tr></table>';
  const eml = 'From: Yesmobility <info@yesmobility.it>\nSubject: I: Lead Facebook 2\nMessage-ID: <z1>\nContent-Type: text/html; charset=utf-8\n\n' + html;
  const r = require('../ingest').ingest(eml);
  assert(r.added, JSON.stringify(r));
  assert.strictEqual(r.lead.email, 'grazianomoreale@gmail.com');
  assert.strictEqual(r.lead.phone, '+393391757166');
  assert.strictEqual(r.lead.name, 'Graziano Moreale');
  assert.strictEqual(r.lead.city, 'Udine');
  console.log('OK5');
}
{
  delete require.cache[require.resolve('../ingest')];
  delete require.cache[require.resolve('../extract')];
  const t = 'Yesmobility\ninfo@yesmobility.it\n\nInizio messaggio inoltrato:\n\n​> *Da:* Kiko Corsentino <kiko@facilesalire.it>\n Oggetto: Lead Facebook\n> Data: 14 ottobre 2026\n> A: "info@yesmobility.it" <info@yesmobility.it>\n\nUdine\t+393391757166\tgrazianomoreale@gmail.com\tGraziano Moreale\n';
  const r = require('../ingest').ingest({ subject: 'Fwd: Lead 2', from: 'Yesmobility <info@yesmobility.it>', text: t, messageId: '<z2>' });
  assert(r.added && r.lead.email === 'grazianomoreale@gmail.com' && r.lead.name === 'Graziano Moreale' && r.lead.city === 'Udine', JSON.stringify(r));
  assert(!/kiko/i.test(r.lead.message), r.lead.message);
  console.log('OK6');
}
{
  process.env.OWN_ADDRESSES = 'info@yesmobility.it,leads.ym@gmail.com';
  delete require.cache[require.resolve('../ingest')];
  delete require.cache[require.resolve('../extract')];
  const t = [
    'Yesmobility', 'info@yesmobility.it', '', 'Inizio messaggio inoltrato:', '',
    'Da: David Vannini <david.vannini@me.com>', 'Oggetto: I: Lead Piattaforme', 'A: info@yesmobility.it', '',
    'David Vannini', 'david.vannini@me.com', '+393483312650', '',
    'Inizio messaggio inoltrato:', '',
    'Da: Kiko Corsentino <kiko@facilesalire.it>', 'Data: 12 ottobre 2026 alle ore 09:44:54 CEST', 'A: david.vannini@me.com', 'Oggetto: Lead Piattaforme', '',
    'Ohi,', '', 'Allora da oggi ti giro dei lead. Quando inserisci a CRM:', '- Campagna; YesMobility', '- Fonte: Online', '',
    'Rovereto\t0464438685\tflavio.dalbosco@mail.com\tFlavio Dalbosco',
    'Casarano\t3294146388\tlucia.ste2003@libero.it\tLucia Stefano',
    'Sanremo\t3358313184\tsalvatore.cutelle@gmail.com\tSalvatore Cutelle',
    'Palermo\t3282817586\tmariagraziasaeli@gmail.com\tGrazia Saeli',
  ].join('\n');
  const r = require('../ingest').ingest({ subject: 'Fwd: I: Lead Piattaforme', from: 'Yesmobility <info@yesmobility.it>', text: t, messageId: '<multi1>' });
  assert(r.added && r.count === 4, JSON.stringify(r));
  const L = r.leads;
  assert.deepStrictEqual(L.map(l => [l.name, l.email, l.phone, l.city]), [
    ['Flavio Dalbosco', 'flavio.dalbosco@mail.com', '0464438685', 'Rovereto'],
    ['Lucia Stefano', 'lucia.ste2003@libero.it', '3294146388', 'Casarano'],
    ['Salvatore Cutelle', 'salvatore.cutelle@gmail.com', '3358313184', 'Sanremo'],
    ['Grazia Saeli', 'mariagraziasaeli@gmail.com', '3282817586', 'Palermo'],
  ]);
  assert.strictEqual(require('../ingest').ingest({ subject: 'x', from: 'Yesmobility <info@yesmobility.it>', text: t, messageId: '<multi1>' }).reason, 'duplicato');
  // e la stessa email in HTML (celle <td>)
  const html = '<p>Inizio messaggio inoltrato:</p><p><b>Da:</b> K &lt;k@f.it&gt;</p><table>'
    + '<tr><td>Rovereto</td><td>0464438685</td><td>f@mail.com</td><td>Flavio Dalbosco</td></tr>'
    + '<tr><td>Casarano</td><td>3294146388</td><td>l@libero.it</td><td>Lucia Stefano</td></tr></table>';
  const r2 = require('../ingest').ingest('From: Yesmobility <info@yesmobility.it>\nSubject: Fwd\nMessage-ID: <multi2>\nContent-Type: text/html; charset=utf-8\n\n' + html);
  assert(r2.added && r2.count === 2, JSON.stringify(r2));
  console.log('OK7');
}
