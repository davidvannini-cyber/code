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
  // Messaggio inoltrato: si ignora la firma/intro di chi inoltra e si legge solo l'originale
  let text = mail.text;
  const fm = text.match(/^.*(inizio messaggio inoltrato|messaggio inoltrato|forwarded message|original message|messaggio originale|begin forwarded message).*$/im);
  if (fm) text = text.slice(fm.index + fm[0].length);
  const HEADER = /^\s*(da|from|a|to|cc|ccn|bcc|oggetto|subject|data|date|inviato|sent|rispondi a|reply-to)\s*:/i;
  const skip = new Set();
  const lines = text.split(/\r?\n/)
    .filter(l => { if (HEADER.test(l)) { (l.match(new RegExp(EMAIL_RE.source, 'gi')) || []).forEach(e => skip.add(e.toLowerCase())); return false; } return true; })
    .flatMap(l => l.split(/\t+| {3,}/))              // celle di una tabella
    .map(l => l.replace(/^[\s>*•\-]+/, '').trim()).filter(Boolean);
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

  let sender = parseNameAddr(mail.replyTo || mail.from);
  if (own.includes(sender.email.toLowerCase())) sender = { name: '', email: '' }; // chi inoltra non è il lead
  let email = (found.email && (found.email.match(EMAIL_RE) || [''])[0]) || '';
  if (!email) {
    const all = text.match(new RegExp(EMAIL_RE.source, 'gi')) || [];
    email = all.find(e => !own.includes(e.toLowerCase()) && !skip.has(e.toLowerCase())) || '';
  }
  if (!email && !fm) email = sender.email;

  let phone = normPhone(found.phone);
  if (!phone) {
    for (const l of lines) { const m = l.match(PHONE_RE); if (m && normPhone(m[0])) { phone = clean(m[0]); break; } }
  }

  // Righe senza etichetta (es. "Udine / +39... / mail / Nome Cognome")
  const loose = lines.filter(l => !/[:@]/.test(l) && !PHONE_RE.test(l) && /^[A-Za-zÀ-ÿ'’. -]{2,40}$/.test(l));
  const looksName = l => /^\S+\s+\S+(\s+\S+)?$/.test(l);
  if (!found.name && !found.surname) { const n = loose.find(looksName); if (n) found.name = n; }
  if (!found.city) { const c = loose.find(l => l !== found.name && !looksName(l)); if (c) found.city = c; }

  let name = clean([found.name, found.surname && !(found.name || '').includes(found.surname) ? found.surname : ''].join(' '));
  if (!name) name = sender.name;

  return {
    name, email, phone,
    company: found.company || '', city: found.city || '',
    message: found.message || (Object.keys(found).length < 3 && text.length < 600 ? lines.join(' · ') : ''),
    extra,
  };
}

module.exports = { extractLead };
