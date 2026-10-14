'use strict';
// Poller IMAP opzionale: legge le email non lette della casella e le passa a ingest().
// Variabili: IMAP_HOST, IMAP_PORT (993), IMAP_USER, IMAP_PASS, IMAP_FOLDER (INBOX), IMAP_INTERVAL_SEC (60)
const { ingest } = require('./ingest');

function start() {
  const { IMAP_HOST, IMAP_USER, IMAP_PASS } = process.env;
  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) { console.log('IMAP disattivato (IMAP_HOST/USER/PASS non impostati)'); return; }
  let ImapFlow;
  try { ({ ImapFlow } = require('imapflow')); } catch { console.log('IMAP: esegui "npm install" per installare imapflow'); return; }

  async function poll() {
    const client = new ImapFlow({
      host: IMAP_HOST, port: +(process.env.IMAP_PORT || 993), secure: process.env.IMAP_SECURE !== 'false',
      auth: { user: IMAP_USER.trim(), pass: IMAP_PASS.replace(/\s+/g, '') }, logger: false,
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock(process.env.IMAP_FOLDER || 'INBOX');
      try {
        const uids = await client.search({ seen: false }, { uid: true });
        for (const uid of uids) {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          const r = ingest(msg.source.toString('utf8'));
          console.log(`IMAP uid ${uid}:`, r.added ? 'lead aggiunto' : r.reason);
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) { console.error('IMAP errore:', e.message, e.authenticationFailed ? '(password o utente non accettati)' : '', e.responseText || ''); }
  }
  poll();
  setInterval(poll, 1000 * +(process.env.IMAP_INTERVAL_SEC || 60));
}
module.exports = { start };
