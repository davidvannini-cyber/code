// PROMEMORIA VIA GMAIL (Google Apps Script) — girando nel TUO account Google, invia le email programmate anche a computer spento.
// Come funziona: ogni 5 minuti legge le BOZZE di Gmail il cui oggetto inizia con  [PROM quando]  e le invia all'ora giusta.
//   [PROM ogni giorno 17:00] Titolo        -> ogni giorno alle 17:00 (ora italiana)
//   [PROM ogni lunedi 09:30] Titolo        -> ogni lunedi (anche: martedi mercoledi giovedi venerdi sabato domenica)
//   [PROM il 2026-11-05 17:00] Titolo      -> una volta sola, poi la bozza viene cancellata
// Il destinatario e il testo sono quelli della bozza. Il titolo (dopo la parentesi) diventa l'oggetto dell'email.
// Il codice legge solo le bozze e invia email: non salva niente fuori dal tuo account e non contiene indirizzi o password.

var TZ = 'Europe/Rome';
var FINESTRA_MIN = 360;   // se lo script e' stato fermo, invia comunque fino a 6 ore dopo l'ora prevista
var GIORNI = { lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6, domenica: 7 };

function senzaAccenti(t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

// "ogni giorno 17:00" | "ogni lunedi 09:30" | "il 2026-11-05 17:00"  ->  {tipo, hh, mm, dow, data} oppure null
function leggiQuando(testo) {
  var t = senzaAccenti(testo), m;
  if ((m = /^ogni giorno (\d{1,2}):(\d{2})$/.exec(t))) return { tipo: 'giorno', hh: +m[1], mm: +m[2] };
  if ((m = /^ogni ([a-z]+) (\d{1,2}):(\d{2})$/.exec(t)) && GIORNI[m[1]]) return { tipo: 'settimana', dow: GIORNI[m[1]], hh: +m[2], mm: +m[3] };
  if ((m = /^il (\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})$/.exec(t))) return { tipo: 'una', data: m[1], hh: +m[2], mm: +m[3] };
  return null;
}

// adesso = {ymd:'2026-10-26', min: minuti dalla mezzanotte, dow: 1..7 (1=lunedi)}; ultimo = chiave dell'ultimo invio
// Restituisce la chiave da salvare se e' ora di inviare, altrimenti null.
function eDaInviare(q, adesso, ultimo) {
  var scatto = q.hh * 60 + q.mm;
  if (q.tipo === 'una') {
    var chiaveUna = q.data;
    if (ultimo === chiaveUna) return null;
    if (adesso.ymd > q.data || (adesso.ymd === q.data && adesso.min >= scatto)) return chiaveUna;
    return null;
  }
  if (q.tipo === 'settimana' && adesso.dow !== q.dow) return null;
  var diff = adesso.min - scatto;
  if (diff < 0 || diff > FINESTRA_MIN) return null;
  return ultimo === adesso.ymd ? null : adesso.ymd;
}

function adessoItalia() {
  var d = new Date();
  var hm = Utilities.formatDate(d, TZ, 'HH:mm').split(':');
  return { ymd: Utilities.formatDate(d, TZ, 'yyyy-MM-dd'), min: +hm[0] * 60 + +hm[1], dow: +Utilities.formatDate(d, TZ, 'u') };
}

function controlla() {
  var props = PropertiesService.getScriptProperties();
  var adesso = adessoItalia();
  GmailApp.getDrafts().forEach(function (bozza) {
    var msg = bozza.getMessage();
    var r = /^\s*\[PROM\s+([^\]]+)\]\s*(.*)$/i.exec(msg.getSubject());
    if (!r) return;
    var q = leggiQuando(r[1]);
    var a = msg.getTo();
    if (!q || !a) return;
    var id = bozza.getId();
    var chiave = eDaInviare(q, adesso, props.getProperty(id));
    if (!chiave) return;
    GmailApp.sendEmail(a, r[2] || 'Promemoria', msg.getPlainBody(), { htmlBody: msg.getBody(), name: 'Promemoria' });
    props.setProperty(id, chiave);
    if (q.tipo === 'una') { bozza.deleteDraft(); props.deleteProperty(id); }
  });
}

// Da eseguire UNA volta: crea il controllo ogni 5 minuti (e toglie i vecchi).
function configura() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'controlla') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('controlla').timeBased().everyMinutes(5).create();
}

// Per vedere cosa ha capito lo script (apri "Registro esecuzione").
function prova() {
  var n = 0;
  GmailApp.getDrafts().forEach(function (b) {
    var r = /^\s*\[PROM\s+([^\]]+)\]\s*(.*)$/i.exec(b.getMessage().getSubject());
    if (r) { n++; Logger.log('Promemoria: "' + r[2] + '"  quando: ' + JSON.stringify(leggiQuando(r[1])) + '  a: ' + b.getMessage().getTo()); }
  });
  Logger.log('Bozze con promemoria trovate: ' + n);
}

if (typeof module !== 'undefined') module.exports = { leggiQuando: leggiQuando, eDaInviare: eDaInviare };
