'use strict';
const crypto = require('crypto');
const { parseEmail } = require('./mime');
const { extractLeads } = require('./extract');
const store = require('./store');

const OWN = (process.env.OWN_ADDRESSES || '').split(',').map(s => s.trim()).filter(Boolean);

// Mittenti automatici da scartare (si aggiungono con IGNORE_SENDERS="parola1,parola2")
const IGNORE = ['mailer-daemon', 'postmaster', 'accounts.google.com', '@google.com']
  .concat((process.env.IGNORE_SENDERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

// Se impostato, accetta solo email inviate da questi indirizzi (es. ALLOWED_SENDERS=info@yesmobility.it)
const ALLOWED = (process.env.ALLOWED_SENDERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// Accetta una email grezza (RFC822) oppure { raw } / { subject, from, text }.
function ingest(input) {
  const mail = typeof input === 'string' ? parseEmail(input)
    : input.raw ? parseEmail(input.raw)
    : { from: input.from || '', replyTo: '', subject: input.subject || '', date: input.date || '', messageId: input.messageId || '', text: input.text || input.body || '' };
  const sender = (mail.from || '').toLowerCase();
  if (sender && IGNORE.some(w => sender.includes(w))) return { added: false, reason: 'mittente automatico ignorato' };
  if (ALLOWED.length && mail.from && !ALLOWED.some(a => sender.includes(a))) return { added: false, reason: 'mittente non autorizzato' };
  if (!mail.text) return { added: false, reason: 'email vuota' };
  try { // diagnostica: testo dell'ultima email letta (tab visibili come →)
    const fs = require('fs'), path = require('path');
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'data', 'last-email.txt'), 'FROM: ' + mail.from + '\nSUBJECT: ' + mail.subject + '\n\n' + mail.text.replace(/\t/g, '→'));
  } catch {}
  const leads = store.load();
  const key = mail.messageId || crypto.createHash('sha1').update(mail.from + mail.subject + mail.text).digest('hex');
  const found = extractLeads(mail, OWN).filter(f => f.email || f.phone || f.name);
  if (!found.length) return { added: false, reason: 'nessun dato di contatto trovato' };
  const multi = found.length > 1;
  const added = [];
  for (const f of found) {
    const k = multi ? key + '#' + (f.email || f.phone).toLowerCase() : key;
    if (leads.some(l => l.key === k)) continue;
    const { _text, _skip, _own, ...fields } = f;
    const lead = {
      id: crypto.randomUUID(), key: k,
      receivedAt: new Date().toISOString(),
      emailDate: mail.date, subject: mail.subject, from: mail.from,
      ...fields,
      status: 'nuovo',
    };
    added.push(lead);
  }
  leads.unshift(...added);          // stesso ordine dell'email: la prima riga resta in cima
  if (!added.length) return { added: false, reason: 'duplicato' };
  store.save(leads);
  return { added: true, lead: added[0], leads: added, count: added.length };
}
module.exports = { ingest };
