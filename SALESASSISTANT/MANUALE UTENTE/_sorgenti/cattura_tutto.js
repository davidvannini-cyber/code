// Cattura TUTTE le schermate del manuale con DATI DI PROVA (nessun dato reale) e registra la posizione
// degli elementi da numerare (callouts.json). Uso: vedi genera_manuale.sh
//   - Lead Rework Console aperta da http://localhost:8768/ (server statico sulla cartella SALESASSISTANT)
//   - Menu e pannello chiamata di Suggerimenti Vendita, con un WebSocket finto su :8765
// Le chiamate AI vengono simulate con i testi veri della libreria script (nessuna rete).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const QUI = __dirname; const OUT = path.join(QUI, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8768/';
const CALL = {};   // nome schermata -> {w,h,items:[{k,x,y}]} (x,y = frazioni 0..1 dell'immagine)

const sv = JSON.parse(fs.readFileSync(path.join(QUI, '../../SUGGERIMENTIVENDITA/schema/esempio-libreria-script.json'), 'utf8'));
const prezzo = sv.find(x => x.id === 'obiezione_prezzo_troppo_alto');
const apertura = sv.find(x => x.id === 'apertura_nuovo_lead_portale');
const rinforzo = JSON.parse(fs.readFileSync(path.join(QUI, '../../SUGGERIMENTIVENDITA/schema/canovaccio-rinforzo-facile-salire.json'), 'utf8'));
const LEAD = { nome: 'Mario Rossi', zona: 'Bologna (BO)', telefono1: '+39 333 1234567', telefono2: '051 234567', email: 'mario.rossi@example.com',
  prezzo: '€ 4.800', motivo: 'Prezzo', note: 'Cerca un montascale per la scala interna di casa: 14 gradini, rampa dritta, nessuna curva.',
  storico: '[Telefonata - 12/09/2026 10:30] Non ha risposto. Richiamare nel pomeriggio.' };

// Screenshot di un elemento (o della pagina) + posizione dei target. targets = [[chiave, selettore o locator-string], ...]
async function snap(p, name, sel, targets, clipH) {
  const f = path.join(OUT, name + '.png');
  let box = null;
  if (sel) {
    const el = p.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    box = await el.boundingBox();
    await el.screenshot({ path: f });
  } else {
    const H = clipH || p.viewportSize().height;
    await p.screenshot({ path: f, clip: { x: 0, y: 0, width: p.viewportSize().width, height: H } });
    box = { x: 0, y: 0, width: p.viewportSize().width, height: H };
  }
  if (targets && targets.length) {
    const items = [];
    for (const [k, s] of targets) {
      const loc = p.locator(s).first();
      let b = null; try { b = await loc.boundingBox({ timeout: 1500 }); } catch (e) {}
      if (!b) { console.warn('target non trovato:', name, k, s); continue; }
      // il box dell'elemento padre può cambiare dopo lo scroll: lo rileggo
      items.push({ k, rx: b.x - box.x, ry: b.y - box.y, rw: b.width, rh: b.height });
    }
    CALL[name] = { w: box.width, h: box.height, items: items.map(i => ({ k: i.k, x: Math.min(.97, Math.max(.03, (i.rx + i.rw) / box.width)), y: Math.min(.97, Math.max(.03, i.ry / box.height)),
      xl: Math.min(.97, Math.max(.03, i.rx / box.width)), yc: Math.min(.97, Math.max(.03, (i.ry + i.rh / 2) / box.height)) })) };
  }
}

const rotteConsole = async (p) => {
  await p.route('https://api.anthropic.com/**', async route => {
    const out = await p.evaluate(() => JSON.stringify(localFallbackGenerate()));
    const body = route.request().postData() || '';
    let text = out;
    if (/stato_lead_suggerito/.test(body)) text = JSON.stringify({ stato_lead_suggerito: 1, obiezioni_suggerite: ['prezzo_alto'],
      analisi_strategia: 'Lead nuovo da portale, interesse concreto per un montascale a rampa dritta. Prima telefonata: presentazione standard e raccolta dei dati tecnici (altezza, larghezza, tipo di scala). Possibile obiezione sul prezzo: puntare sul valore e sulla gratuità della valutazione.' });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text }], stop_reason: 'end_turn' }) });
  });
  await p.route('https://ntfy.sh/**', route => route.fulfill({ status: 200, body: '{}' }));
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
           '--use-file-for-fake-audio-capture=' + path.join(QUI, 'assets/audio-prova.wav')] });

  // =============== LEAD REWORK CONSOLE ===============
  const ctx = await b.newContext({ viewport: { width: 620, height: 900 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await rotteConsole(p);
  await p.goto(BASE + 'LEADREWORKS/src/lead-rework-console.html'); await p.waitForTimeout(700);
  const prefix = await p.evaluate(() => LOCAL_PREFIX);
  await p.evaluate(([pre]) => { localStorage.setItem(pre + 'anthropic_api_key', 'sk-ant-test-0000'); localStorage.setItem(pre + 'phone_topic', 'ym-prova1234567890abcdef12'); }, [prefix]);
  await p.reload(); await p.waitForTimeout(700);

  await snap(p, 'console-01-intera-lead-vuota', null);
  await snap(p, 'console-02-barra-alto', '.topnav', [['lead', '.navbtn[title="Lead"]'], ['storico', '.navbtn[title="Storico Lead"]'], ['profilo', '.navbtn[title="Profilo Azienda"]'], ['stato', '.topnav-status']]);
  await snap(p, 'console-02b-intestazione-lead', '.card-header-row >> nth=0', [['telefono', 'button:has-text("Invia a telefono")'], ['crm', 'button:has-text("CRM")']]);
  await p.click('text=+ Apri'); await p.waitForTimeout(300);
  await snap(p, 'console-03-import-dati', '.card:has(#dropzone)', [['dropzone', '#dropzone'], ['incolla', 'button:has-text("Incolla dati dal CRM")']]);
  await p.click('text=− Chiudi');
  await p.fill('#ld_nome', LEAD.nome); await p.fill('#ld_zona', LEAD.zona);
  await p.fill('#ld_telefono1', LEAD.telefono1); await p.fill('#ld_telefono2', LEAD.telefono2);
  await p.fill('#ld_email', LEAD.email); await p.fill('#ld_prezzo', LEAD.prezzo); await p.fill('#ld_motivo', LEAD.motivo);
  await p.fill('#ld_note', LEAD.note); await p.fill('#ld_storico', LEAD.storico);
  await p.dispatchEvent('#ld_telefono1', 'change'); await p.dispatchEvent('#ld_email', 'change');
  await snap(p, 'console-04a-dati-lead-chiuso', '#dati-lead', [['nome', '#ld_nome'], ['prodotto', '#ld_prodotto'], ['zona', '#ld_zona'], ['tel1', '#ld_telefono1'], ['tel2', '#ld_telefono2'], ['email', '#ld_email'],
    ['prezzo', '#ld_prezzo'], ['motivo', '#ld_motivo'], ['tempistica', '#ld_tempistica'], ['note', '#ld_note'], ['storico', '#ld_storico'], ['appuntamento', '.collapsible-toggle']]);
  await p.click('.collapsible-toggle');
  await p.fill('#ld_data', 'giovedì 15/10'); await p.fill('#ld_orario', '10:00'); await p.fill('#ld_indirizzo', 'Via Roma 10, Bologna');
  await snap(p, 'console-04-dati-lead', '#dati-lead', [['data', '#ld_data'], ['orario', '#ld_orario'], ['indirizzo', '#ld_indirizzo']]);
  // campi ambrati (estrazione tentata e campi vuoti)
  await p.evaluate(() => { state.draft._extractionAttempted = true; state.draft.prezzo_esistente = ''; state.draft.tempistica = ''; state.draft.zona = ''; render(); });
  await snap(p, 'console-04b-campi-ambra', '#dati-lead');
  await p.evaluate(([l]) => { state.draft._extractionAttempted = false; state.draft.zona = l.zona; state.draft.prezzo_esistente = l.prezzo; render(); }, [LEAD]);
  await p.click('text=Suggerisci stato, obiezioni e strategia con AI'); await p.waitForTimeout(1500);
  await snap(p, 'console-05-stato-canali', '#stato-canali', [['ai', 'button:has-text("Suggerisci stato")'], ['stato', '#ld_stato'], ['canali', 'label.chip[data-canale="telefono"]'], ['obiezioni', 'label.chip:has-text("Prezzo troppo alto")']]);
  await snap(p, 'console-06-analisi', '#analisi', [['analisi', '#ld_analisi']]);
  await p.click('text=Genera script'); await p.waitForTimeout(1800);
  await snap(p, 'console-07-generazione', '#generazione', [['nuovo', 'button:has-text("Nuovo lead vuoto")'], ['genera', 'button:has-text("Genera script")'], ['badge', '.output-block .badge >> nth=0'], ['rigenera', 'button:has-text("Rigenera") >> nth=0'],
    ['copia', '.output-block >> nth=1 >> .copy-btn:not(.brand-btn) >> nth=0'], ['whatsapp', '.brand-btn >> nth=0'], ['email', '.brand-btn >> nth=1'], ['salva', 'button:has-text("Salva lead in storico")'], ['sv', 'button:has-text("Invia a Suggerimenti Vendita")']]);
  const blocchi = await p.$$('.output-block');
  for (let i = 0; i < blocchi.length; i++) await blocchi[i].screenshot({ path: path.join(OUT, 'console-08-blocco-' + i + '.png') });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.click('button:has-text("Invia a telefono")'); await p.waitForTimeout(400);
  await snap(p, 'console-09-invia-telefono-conferma', null, [['salvachiama', '.phone-confirm button[data-a="chiama"]'], ['solosalva', '.phone-confirm button[data-a="salva"]'], ['annulla', '.phone-confirm button[data-a=""]']], 230);
  await p.click('.phone-confirm button[data-a="salva"]'); await p.waitForTimeout(600);
  await snap(p, 'console-10-invia-telefono-esito', '.card-header-row >> nth=0');
  await p.click('text=Salva lead in storico'); await p.waitForTimeout(600);
  const altri = [['Giulia Verdi', 'Montascale', 'Firenze (FI)', '+39 347 7654321', 'giulia.verdi@example.com', 3], ['Paolo Neri', 'Pedana', 'Milano (MI)', '02 8765432', '', 6], ['Laura Gialli', 'Montascale', 'Roma (RM)', '+39 320 1112233', 'laura.gialli@example.com', 4]];
  for (const a of altri) {
    await p.evaluate(a => { state.tab = 'nuovo'; resetDraft(); state.draft.nome = a[0]; state.draft.prodotto = a[1]; state.draft.zona = a[2]; state.draft.telefono1 = a[3]; state.draft.email = a[4];
      state.draft.stato_lead = a[5]; state.draft.canali_attivi = defaultChannelsFor(a[5], state.draft); state.generatedOutput = localFallbackGenerate(); state.generatedMeta = { source: 'draft' }; }, a);
    await p.evaluate(() => saveLeadToHistory()); await p.waitForTimeout(300);
  }
  await p.evaluate(() => { const ids = Object.keys(state.leadsHistory); state.leadsHistory[ids[1]].attivita = { telefono: true, whatsapp: false, email: false };
    state.leadsHistory[ids[2]].lavorato = true; state.leadsHistory[ids[2]].attivita = { telefono: true, whatsapp: true, email: false }; state.leadsHistory[ids[0]].dati_lead_input.crm_lead_id = '12345'; render(); });
  await p.click('.navbtn[title="Storico Lead"]'); await p.waitForTimeout(500);
  await snap(p, 'console-11-storico-intera', null, [['tab', '.navbtn[title="Storico Lead"]'], ['cerca', '#hist_search'], ['pannello', '.hist-panel'], ['tabella', '.tbl-storico thead'], ['riga', '.tbl-storico tbody tr >> nth=0'], ['spunte', '.tbl-storico tbody tr >> nth=1 >> td.ck >> nth=0'], ['azioni', '.tbl-storico tbody tr >> nth=0 >> td.acts']]);
  await snap(p, 'console-12-storico-pannello', '.hist-panel', [['ordina', '.hist-panel select >> nth=0'], ['nascondi', '.hist-panel input[type=checkbox]'], ['esporta', 'button:has-text("Esporta storico")'], ['filtri', '.hp-filtri'],
    ['scarica', '.hp-link:has-text("Scarica")'], ['ripristina', '.hp-link:has-text("Ripristina")'], ['recupera', '.hp-link:has-text("Recupera")'], ['copiaauto', '.hp-backup span >> nth=-1']]);
  await snap(p, 'console-13-storico-tabella', '.tbl-storico', [['data', 'th:has-text("Data")'], ['cliente', 'th:has-text("Cliente")'], ['icotel', 'thead th.ck >> nth=0'], ['icowa', 'thead th.ck >> nth=1'], ['icomail', 'thead th.ck >> nth=2'], ['lav', 'thead th:has-text("Lav")'],
    ['ckrow', 'tbody tr >> nth=1 >> td.ck >> nth=0'], ['tel', 'tbody tr >> nth=0 >> button:has-text("Tel")'], ['crm', 'tbody tr >> nth=0 >> button:has-text("CRM")'], ['apri', 'tbody tr >> nth=0 >> button[title="Apri"]'], ['duplica', 'tbody tr >> nth=0 >> button[title="Duplica"]'], ['elimina', 'tbody tr >> nth=0 >> button[title="Elimina"]']]);
  await p.click('.hp-filtri'); await p.waitForTimeout(300);
  await snap(p, 'console-14-storico-filtri', '.hist-panel', [['stato', '.hp-grid select >> nth=0'], ['lavorati', '.hp-grid select >> nth=1'], ['dal', '.hp-grid input[type=date] >> nth=0'], ['al', '.hp-grid input[type=date] >> nth=1']]);
  await p.click('.hp-filtri');
  await p.fill('#hist_search', 'rossi'); await p.waitForTimeout(300);
  await snap(p, 'console-15-storico-ricerca', '.hs-row', [['cerca', '#hist_search'], ['conta', '.hs-cnt']]);
  await p.fill('#hist_search', '');
  await p.click('.tbl-storico tbody tr >> nth=3 >> button[title="Apri"]'); await p.waitForTimeout(500);
  await snap(p, 'console-16-storico-apri-intera', null);
  await snap(p, 'console-17-storico-apri-testata', '.hm-head', [['crm', '.hm-ib[title*="CRM"]'], ['telefono', '.hm-ib[title="Invia a telefono"]'], ['sv', '.hm-ib[title="Invia a Suggerimenti Vendita"]'], ['stampa', '.hm-ib[title="Stampa"]'], ['chiudi', '.hm-ib[title="Chiudi"]']]);
  await p.click('.hm-ib[title="Chiudi"]');
  await p.click('.navbtn[title="Profilo Azienda"]'); await p.waitForTimeout(500);
  await snap(p, 'console-18-profilo-intera', null);
  const cards = await p.$$('.page .main > .card');
  for (let i = 0; i < cards.length; i++) await cards[i].screenshot({ path: path.join(OUT, 'console-19-profilo-card-' + i + '.png') });
  await snap(p, 'console-19b-profilo-telefono', '.page .main > .card >> nth=1', [['codice', '#phone_topic'], ['genera', 'button:has-text("Genera codice")']]);
  await snap(p, 'console-19c-profilo-ai', '.page .main > .card >> nth=2', [['apikey', '#ai_apikey'], ['modello', '#ai_model'], ['workspace', '#ai_workspace'], ['salva', 'button:has-text("Salva") >> nth=1'], ['testa', 'button:has-text("Testa connessione")'], ['rimuovi', 'button:has-text("Rimuovi chiave")'], ['esporta', 'button:has-text("Esporta impostazioni AI")'], ['importa', 'button:has-text("Importa impostazioni AI")']]);
  await snap(p, 'console-22-ambiente', '.main > .card:last-child', [['db', '.rail-env div >> nth=0'], ['sample', '.rail-env div >> nth=1'], ['apikey', '.rail-env div >> nth=2'], ['immagini', '.rail-env div >> nth=3']]);
  // file caricati
  await p.click('.navbtn[title="Lead"]'); await p.waitForTimeout(300);
  await p.click('text=+ Apri'); await p.waitForTimeout(200);
  fs.writeFileSync('/tmp/lead-prova.csv', 'nome,zona,telefono1,email,prodotto\nMario Rossi,Bologna,+39 333 1234567,mario.rossi@example.com,Montascale\nGiulia Verdi,Firenze,+39 347 7654321,giulia.verdi@example.com,Pedana\n');
  await p.setInputFiles('#file_input_hidden', ['/tmp/lead-prova.csv', path.join(OUT, 'console-05-stato-canali.png')]); await p.waitForTimeout(1500);
  await snap(p, 'console-23-file-caricati', '.card:has(#dropzone)', [['file', '.uploaded-file-card >> nth=0'], ['rimuovi', '.uploaded-file-remove >> nth=0'], ['riga', 'select:has(option:has-text("seleziona una riga"))'], ['estrai', 'button:has-text("Estrai dati dai file")']]);
  await ctx.close();

  // ---- Console dopo l'importazione dal CRM (pagina intera, con i numeri)
  {
    const ctx3 = await b.newContext({ viewport: { width: 620, height: 1750 }, deviceScaleFactor: 2 });
    const p3 = await ctx3.newPage(); p3.on('dialog', d => d.accept());
    await rotteConsole(p3);
    await p3.goto(BASE + 'LEADREWORKS/src/lead-rework-console.html'); await p3.waitForTimeout(600);
    const pre3 = await p3.evaluate(() => LOCAL_PREFIX);
    await p3.evaluate(([pre]) => { localStorage.setItem(pre + 'anthropic_api_key', 'sk-ant-test-0000'); }, [pre3]);
    await p3.reload(); await p3.waitForTimeout(600);
    await p3.evaluate(() => window.crmImport({ nome: 'Mario Rossi', zona: 'Bologna (BO)', telefono1: '+39 333 1234567', email: 'mario.rossi@example.com',
      note: 'Cerca un montascale per la scala interna di casa: 14 gradini, rampa dritta, nessuna curva.',
      storico: '[Telefonata - 12/09/2026 10:30] Non ha risposto. Richiamare nel pomeriggio.', prezzo_esistente: '€ 4.800', motivazione_rifiuto: 'Prezzo',
      data_appuntamento: '15/10/2026', orario_appuntamento: '10:00', indirizzo: 'Via Roma 10, Bologna', prodotto: 'Montascale', crm_lead_id: '12345' }));
    await p3.waitForTimeout(1800);
    await snap(p3, 'console-00-dopo-import', null, [['nome', '#ld_nome'], ['tel', '#ld_telefono1'], ['note', '#ld_note'], ['storico', '#ld_storico'],
      ['stato', '#ld_stato'], ['canali', 'label.chip[data-canale="telefono"]'], ['analisi', '#ld_analisi'], ['genera', 'button:has-text("Genera script")']], 1290);
    await ctx3.close();
  }

  // =============== MENU ===============
  let c2 = await b.newContext({ viewport: { width: 300, height: 1000 }, deviceScaleFactor: 2 });
  let m = await c2.newPage();
  await m.goto(BASE + 'SUGGERIMENTIVENDITA/menu/index.html'); await m.waitForTimeout(500);
  await m.evaluate(() => impostaStato(true, 'ambiente pronto'));
  await snap(m, 'menu-01-intero', '.contenuto', [['yes', '.azione-primaria'], ['gl', '#btn-gestione-lead'], ['rin', '.azione-secondaria'], ['frasi', 'button:has-text("Rivedi frasi raccolte")'], ['aggiungi', 'button:has-text("Aggiungi script")'],
    ['libreria', 'button:has-text("Vedi libreria")'], ['profilo', 'button:has-text("Profilo azienda")'], ['ambiente', 'button:has-text("Ambiente")'], ['apikey', 'button:has-text("API key")'], ['taudio', 'button:has-text("Test: solo audio")'], ['tmatch', 'button:has-text("Test: solo matching")'], ['stato', '.stato'], ['esci', '.pulsante-esci']]);
  await m.evaluate(() => impostaLeadInAttesa(true)); await m.waitForTimeout(800);
  await snap(m, 'menu-02-lead-in-attesa', '.card-azioni-principale');
  await m.evaluate(() => { impostaLeadInAttesa(false); impostaStato(false, 'API key non configurate'); });
  await snap(m, 'menu-03-stato-attenzione', '.piede');
  await c2.close();

  // =============== PANNELLO CHIAMATA ===============
  const nuovo = async (query) => {
    const c = await b.newContext({ viewport: { width: 460, height: 900 }, deviceScaleFactor: 2, permissions: ['microphone'] });
    const pg = await c.newPage();
    await pg.addInitScript(() => { try { localStorage.setItem('ym_phone_topic', 'ym-prova1234567890abcdef12'); } catch (e) {} });
    await pg.route('https://ntfy.sh/**', r => r.fulfill({ status: 200, body: '{}' }));
    await pg.goto(BASE + 'SUGGERIMENTIVENDITA/overlay/index.html' + query); await pg.waitForTimeout(2500);
    // aspetta che l'eventuale avviso di clipping iniziale (transitorio all'avvio del microfono) sia sparito
    for (let i = 0; i < 20; i++) { const vis = await pg.evaluate(() => document.getElementById('avviso-clipping').style.display === 'block'); if (!vis) break; await pg.waitForTimeout(500); }
    return [c, pg];
  };
  const invia = (pg, msg) => pg.evaluate(m => wsCorrente.onmessage({ data: JSON.stringify(m) }), msg);
  const lead = { nome: 'Mario Rossi', telefono: '+39 333 1234567' };
  const PAN = [['selettore', '#selettore-microfono'], ['connesso', '#status-text-navbar'], ['mic', '#pulsante-microfono'], ['pausa', '#pulsante-pausa'], ['termina', '#pulsante-termina'],
    ['barre', '#riquadro-livello'], ['lead', '#lead-info'], ['tel', '#pulsante-telefono'], ['sugg', '#fase-badge'], ['frasi', '.riquadro-trascrizioni']];
  let [c, pg] = await nuovo('');
  await invia(pg, { tipo: 'init', lead });
  await snap(pg, 'pannello-01-attesa', null, PAN);
  await invia(pg, { tipo: 'trascrizione', testo: 'Pronto, chi parla?' });
  await invia(pg, { tipo: 'suggerimento', fase_chiamata: 'apertura', testo_suggerimento: apertura.testo_suggerimento, trigger_categoria: 'saluto_apertura' });
  await invia(pg, { tipo: 'trascrizione', testo: 'Il prezzo mi sembra eccessivo' });
  await invia(pg, { tipo: 'suggerimento', fase_chiamata: 'obiezioni', testo_suggerimento: prezzo.testo_suggerimento, testo_alternativo: prezzo.testo_alternativo, trigger_categoria: 'obiezione_prezzo' });
  await pg.waitForTimeout(600);
  await snap(pg, 'pannello-02-in-corso', null, PAN);
  await snap(pg, 'pannello-04-selettore', '.navbar-overlay', [['selettore', '#selettore-microfono'], ['connesso', '#status-text-navbar']]);
  await snap(pg, 'pannello-05-pulsanti', '.controls-section', [['mic', '#pulsante-microfono'], ['pausa', '#pulsante-pausa'], ['termina', '#pulsante-termina']]);
  await snap(pg, 'pannello-03a-barre', '#riquadro-livello', [['pre', '.barra-livello-track >> nth=0'], ['post', '.barra-livello-track >> nth=1']]);
  await pg.evaluate(() => {
    ultimoClippingMs = Date.now() + 120000; document.getElementById('avviso-clipping').style.display = 'block';
    const a = document.getElementById('avviso-ingresso');
    a.textContent = 'Stai ascoltando il microfono integrato del Mac (“Internal Microphone (Built-in)”), non lo splitter del telefono. Scegli lo splitter nel selettore in alto.'; a.style.display = 'block';
  });
  await snap(pg, 'pannello-03-avvisi', '#riquadro-livello', [['clip', '#avviso-clipping'], ['ingresso', '#avviso-ingresso']]);
  await pg.evaluate(() => { ultimoClippingMs = 0; document.getElementById('avviso-clipping').style.display = 'none'; document.getElementById('avviso-ingresso').style.display = 'none'; window.scrollTo(0, 0); });
  await pg.click('#pulsante-telefono'); await pg.waitForTimeout(400);
  await snap(pg, 'pannello-06-invia-telefono', null, [['salvachiama', '.conferma-telefono button >> nth=0'], ['solosalva', '.conferma-telefono button >> nth=1'], ['annulla', '.conferma-telefono button >> nth=2']]);
  await c.close();
  [c, pg] = await nuovo('?avvio=gestione_lead');
  await pg.evaluate(([l, t]) => {
    document.getElementById('lead-nome').textContent = l.nome; document.getElementById('lead-telefono').textContent = l.telefono;
    document.getElementById('lead-info').dataset.email = 'mario.rossi@example.com';
    const cont = document.getElementById('canovaccio-testo'); cont.textContent = '';
    t.split(/\n\s*\n/).forEach(par => { const q = document.createElement('p'); q.textContent = par.trim(); cont.appendChild(q); });
    document.getElementById('riquadro-canovaccio').style.display = 'block';
  }, [lead, apertura.testo_suggerimento.replace('[Nome]', 'David').replace('[montascale/pedana/elevatore]', 'montascale')]);
  await snap(pg, 'pannello-07-gestione-lead', null, [['guida', '#riquadro-canovaccio']]);
  await c.close();
  [c, pg] = await nuovo('?avvio=rinforzo_facile_salire');
  await invia(pg, { tipo: 'init', lead });
  await invia(pg, { tipo: 'canovaccio', testo: rinforzo.testo });
  await snap(pg, 'pannello-08-rinforzo', null, [['guida', '#riquadro-canovaccio']]);
  await c.close();

  fs.writeFileSync(path.join(QUI, 'callouts.json'), JSON.stringify(CALL, null, 1));
  console.log('ok', Object.keys(CALL).length, 'schermate con numeri');
  await b.close();
})().catch(e => { console.error('ERRORE', e); process.exit(1); });
