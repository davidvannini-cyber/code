'use strict';
// Estrae i campi del lead dal testo di una email (anche inoltrata).

const LABELS = {
  name: ['nome e cognome', 'nome completo', 'nominativo', 'full name', 'name', 'nome', 'cliente', 'contatto'],
  surname: ['cognome', 'surname', 'last name'],
  email: ['e-mail', 'email', 'mail', 'posta elettronica'],
  phone: ['telefono', 'cellulare', 'numero di telefono', 'tel', 'cell', 'mobile', 'phone', 'whatsapp'],
  company: ['azienda', 'societ[àa]', 'ragione sociale', 'company', 'organization', 'ditta'],
  city: ['citt[àa]', 'comune', 'localit[àa]', 'city', 'zona', 'provincia'],
  message: ['messaggio', 'richiesta', 'note', 'commento', 'esigenza', 'message', 'comments', 'interesse', 'prodotto'],
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+|00)?\d[\d\s().\/-]{7,17}\d/;

function clean(v) { return (v || '').replace(/\s+/g, ' ').trim(); }

function normPhone(p) {
  const s = clean(p);
  const digits = s.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? s : '';
}

function parseNameAddr(s) {
  const m = (s || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  return m ? { name: clean(m[1]), email: m[2].trim() } : { name: '', email: (s.match(EMAIL_RE) || [''])[0] };
}

function extractLead(mail, ownAddresses = []) {
  const own = ownAddresses.map(a => a.toLowerCase());
  const lines = mail.text.split(/\r?\n/).map(l => l.replace(/^[\s>*•\-]+/, '').trim()).filter(Boolean);
  const found = {};
  const extra = {};
  for (const line of lines) {
    const m = line.match(/^([^:=\t]{2,40})\s*[:=\t]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase().replace(/\*/g, '');
    const val = clean(m[2]);
    let matched = false;
    for (const [field, names] of Object.entries(LABELS)) {
      if (names.some(n => new RegExp('^' + n + '$', 'i').test(key))) {
        if (!found[field]) found[field] = val;
        matched = true; break;
      }
    }
    // intestazioni di forward / campi non mappati
    if (!matched && !/^(da|from|a|to|cc|bcc|oggetto|subject|date|data|inviato|sent|reply-to)$/i.test(key) && val.length < 200) extra[m[1].trim()] = val;
  }

  const sender = parseNameAddr(mail.replyTo || mail.from);
  let email = (found.email && (found.email.match(EMAIL_RE) || [''])[0]) || '';
  if (!email) {
    const all = mail.text.match(new RegExp(EMAIL_RE.source, 'gi')) || [];
    email = all.find(e => !own.includes(e.toLowerCase())) || '';
  }
  if (!email) email = sender.email;

  let phone = normPhone(found.phone);
  if (!phone) {
    for (const l of lines) { const m = l.match(PHONE_RE); if (m && normPhone(m[0])) { phone = clean(m[0]); break; } }
  }

  let name = clean([found.name, found.surname && !(found.name || '').includes(found.surname) ? found.surname : ''].join(' '));
  if (!name) name = sender.name;

  return {
    name, email, phone,
    company: found.company || '', city: found.city || '',
    message: found.message || '',
    extra,
  };
}

module.exports = { extractLead };
