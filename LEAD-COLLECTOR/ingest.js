'use strict';
const crypto = require('crypto');
const { parseEmail } = require('./mime');
const { extractLead } = require('./extract');
const store = require('./store');

const OWN = (process.env.OWN_ADDRESSES || '').split(',').map(s => s.trim()).filter(Boolean);

// Accetta una email grezza (RFC822) oppure { raw } / { subject, from, text }.
function ingest(input) {
  const mail = typeof input === 'string' ? parseEmail(input)
    : input.raw ? parseEmail(input.raw)
    : { from: input.from || '', replyTo: '', subject: input.subject || '', date: input.date || '', messageId: input.messageId || '', text: input.text || input.body || '' };
  if (!mail.text) return { added: false, reason: 'email vuota' };
  const leads = store.load();
  const key = mail.messageId || crypto.createHash('sha1').update(mail.from + mail.subject + mail.text).digest('hex');
  if (leads.some(l => l.key === key)) return { added: false, reason: 'duplicato' };
  const f = extractLead(mail, OWN);
  if (!f.email && !f.phone && !f.name) return { added: false, reason: 'nessun dato di contatto trovato' };
  const lead = {
    id: crypto.randomUUID(), key,
    receivedAt: new Date().toISOString(),
    emailDate: mail.date, subject: mail.subject, from: mail.from,
    ...f,
    status: 'nuovo',
  };
  leads.unshift(lead);
  store.save(leads);
  return { added: true, lead };
}
module.exports = { ingest };
