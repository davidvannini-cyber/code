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

const looksName = l => /^\S+\s+\S+(\s+\S+)?$/.test(l);

function parseNameAddr(s) {
  const m = (s || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  return m ? { name: clean(m[1]), email: m[2].trim() } : { name: '', email: (s.match(EMAIL_RE) || [''])[0] };
}

function extractLead(mail, ownAddresses = []) {
  const own = ownAddresses.map(a => a.toLowerCase());
  // Messaggio inoltrato: si ignora la firma/intro di chi inoltra e si legge solo l'originale
  let text = mail.text;
  const fms = [...text.matchAll(/^.*(inizio messaggio inoltrato|messaggio inoltrato|forwarded message|original message|messaggio originale|begin forwarded message).*$/gim)];
  const fm = fms[fms.length - 1];                      // in un doppio inoltro conta l'ultimo: è il messaggio originale
  if (fm) text = text.slice(fm.index + fm[0].length);
  const HEADER = /^\s*(da|from|a|to|cc|ccn|bcc|oggetto|subject|data|date|inviato|sent|rispondi a|reply-to)\s*:/i;
  const skip = new Set();
  const norm = l => l.replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/\u00a0/g, ' ').replace(/^[\s>*•|\-]+/, '').replace(/\*+/g, '').trim();
  const lines = text.split(/\r?\n/)
    .flatMap(l => l.split(/\t+| {3,}/))              // celle di una tabella
    .map(norm).filter(Boolean)
    .filter(l => { if (HEADER.test(l)) { (l.match(new RegExp(EMAIL_RE.source, 'gi')) || []).forEach(e => skip.add(e.toLowerCase())); return false; } return true; });
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
  if (!found.name && !found.surname) { const n = loose.find(looksName); if (n) found.name = n; }
  if (!found.city) { const c = loose.find(l => l !== found.name && !looksName(l)); if (c) found.city = c; }

  let name = clean([found.name, found.surname && !(found.name || '').includes(found.surname) ? found.surname : ''].join(' '));
  if (!name) name = sender.name;

  return {
    name, email, phone,
    company: found.company || '', city: found.city || '',
    message: found.message || (!found.name && text.length < 600 ? lines.join(' · ') : ''),
    extra,
    _text: text, _skip: skip, _own: own,
  };
}

// Tabella con una riga per lead (celle separate da tab o da 3+ spazi): ogni riga con una cella-email è un lead.
const FULL_EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
function extractRows(text, own, skip) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const cells = raw.split(/\t+| {3,}/).map(c => c.replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/\u00a0/g, ' ').trim()).filter(Boolean);
    if (cells.length < 3 || cells.length > 8) continue;
    const emailCell = cells.find(c => FULL_EMAIL.test(c));
    if (!emailCell) continue;
    const email = emailCell;
    if (own.includes(email.toLowerCase()) || skip.has(email.toLowerCase())) continue;
    const rest = cells.filter(c => c !== emailCell);
    const phoneCell = rest.find(c => !/[A-Za-zÀ-ÿ]/.test(c) && normPhone(c));
    const others = rest.filter(c => c !== phoneCell);
    const multi = others.filter(looksName);
    const name = multi.length ? multi[multi.length - 1] : others[others.length - 1] || '';
    out.push({ name, email, phone: phoneCell ? clean(phoneCell) : '', company: '', city: others.find(c => c !== name) || '', message: '', extra: {} });
  }
  return out;
}

// Tabella con una cella per riga (tipico del testo semplice): [città, telefono, email, nome] ripetuti.
// Ogni email isolata su una riga ne ancora un record; le righe prima/dopo l'email sono le altre celle.
function extractColumnar(text, own, skip) {
  const HEADER = /^\s*(da|from|a|to|cc|ccn|bcc|oggetto|subject|data|date|inviato|sent|rispondi a|reply-to)\s*:/i;
  const lines = text.split(/\r?\n/)
    .map(l => l.replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/\u00a0/g, ' ').replace(/^[\s>*•|\-]+/, '').replace(/\*+/g, '').trim())
    .filter(l => !HEADER.test(l));
  const idx = [];
  lines.forEach((l, i) => { if (FULL_EMAIL.test(l) && !own.includes(l.toLowerCase()) && !skip.has(l.toLowerCase())) idx.push(i); });
  if (idx.length < 2) return [];
  const gaps = idx.slice(1).map((v, k) => v - idx[k] - 1);
  const g = gaps[0];
  if (g < 2 || gaps.some(x => x !== g)) return [];          // i record devono essere tutti della stessa lunghezza
  let b = 0;                                                  // celle dopo l'email = righe piene dopo l'ultima email
  while (idx[idx.length - 1] + 1 + b < lines.length && lines[idx[idx.length - 1] + 1 + b] && b < g - 1) b++;
  const a = g - b;
  const out = [];
  for (const i of idx) {
    const cells = lines.slice(i - a, i + b + 1);
    if (cells.length !== a + b + 1 || cells.some(c => !c)) return [];
    const rest = cells.filter((c, k) => k !== a);
    const phoneCell = rest.find(c => !/[A-Za-zÀ-ÿ]/.test(c) && normPhone(c));
    if (!phoneCell) return [];
    const others = rest.filter(c => c !== phoneCell);
    const multi = others.filter(looksName);
    const name = multi.length ? multi[multi.length - 1] : others[others.length - 1] || '';
    out.push({ name, email: lines[i], phone: clean(phoneCell), company: '', city: others.find(c => c !== name) || '', message: '', extra: {} });
  }
  return out;
}

// Restituisce uno o più lead (più righe di tabella = più lead).
function extractLeads(mail, ownAddresses = []) {
  const one = extractLead(mail, ownAddresses);
  let rows = extractRows(one._text, one._own, one._skip);
  if (!rows.length) rows = extractColumnar(one._text, one._own, one._skip);
  const strip = ({ _text, _skip, _own, ...l }) => l;
  return rows.length ? rows : [strip(one)];
}

module.exports = { extractLead, extractLeads };
