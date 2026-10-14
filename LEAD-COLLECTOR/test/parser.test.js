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
require('fs').unlinkSync(process.env.LEADS_FILE);
console.log('OK');
