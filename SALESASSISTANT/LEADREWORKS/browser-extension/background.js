// Riceve l'avviso "ho catturato un lead" dal content script sul CRM (crm-content.js).
// I dati veri viaggiano già via chrome.storage.local (scritti direttamente da crm-content.js):
// qui ci occupiamo di trovare la scheda della console, se è già aperta, e di portarla
// in primo piano + avvisarla di leggere i dati in attesa; se non è aperta in nessuna
// scheda, ne apriamo una nuova noi stessi (vedi CONSOLE_FALLBACK_URL sotto) — in
// entrambi i casi i dati arrivano da soli, senza altri clic da parte dell'utente.

// Percorso fisso del file locale sul Mac dell'utente: se la cartella del progetto
// viene spostata, questo indirizzo va aggiornato di conseguenza.
const CONSOLE_FALLBACK_URL = "file:///Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT/LEADREWORKS/src/lead-rework-console.html";

// Percentuale di larghezza (dello schermo di lavoro primario) e offset da
// sinistra per questa finestra: stesso schema usato da apri-console.command
// (Lead Rework Console, 30%), menu_finestra.py (Suggerimenti Vendita, 19%,
// subito a destra di questa) e Contents/MacOS/avvia (pannello chiamata, 40%,
// più a destra ancora) — tre finestre affiancate in proporzioni fisse
// (scelte dall'utente), invece di finestre sparse di dimensioni diverse.
// 30% invece di 40%: richiesta esplicita dell'utente il 2026-09-28 ("25% più stretta").
const LARGHEZZA_FRAZIONE_LEAD_REWORK = 0.35;
const OFFSET_FRAZIONE_LEAD_REWORK = 0;
const ALTEZZA_FRAZIONE_LEAD_REWORK = 0.60;

// "workArea" esclude già barra menu e Dock. Se l'API non è disponibile per
// qualche motivo, un rettangolo fisso di fallback (i valori usati prima di
// questa funzionalità).
function calcolaRettangoloFinestra(offsetFrazione, larghezzaFrazione, altezzaFrazione, callback) {
  if (chrome.system && chrome.system.display && chrome.system.display.getInfo) {
    chrome.system.display.getInfo((schermi) => {
      const primario = (schermi && schermi.find(s => s.isPrimary)) || (schermi && schermi[0]);
      if (!primario) { callback({ left: 40, top: 40, width: 900, height: 1300 }); return; }
      const area = primario.workArea;
      callback({
        left: area.left + Math.round(area.width * offsetFrazione),
        top: area.top,
        width: Math.round(area.width * larghezzaFrazione),
        height: Math.round(area.height * altezzaFrazione)
      });
    });
  } else {
    callback({ left: 40, top: 40, width: 900, height: 1300 });
  }
}

// type:"popup" apre una finestra senza tab/barra indirizzi (la cosa più vicina a
// "app esterna" che un'estensione può fare: non può lanciare Chrome in vera
// modalità --app, quella è disponibile solo da riga di comando, vedi apri-console.command).
function openNewConsoleWindow(url, done) {
  url = url || CONSOLE_FALLBACK_URL;
  console.log("[LRW] apro una nuova finestra:", url);
  if (chrome.system && chrome.system.display && chrome.system.display.getInfo) {
    chrome.system.display.getInfo((schermi) => {
      const primario = (schermi && schermi.find(s => s.isPrimary)) || (schermi && schermi[0]);
      if (!primario) { openWithDefaultSize(url, done); return; }
      const area = primario.workArea;
      const width = Math.round(area.width * LARGHEZZA_FRAZIONE_LEAD_REWORK);
      const height = Math.round(area.height * ALTEZZA_FRAZIONE_LEAD_REWORK);
      chrome.windows.create({ url: url, type: "popup", left: area.left, top: area.top, width: width, height: height, focused: true }, (win) => {
        if (chrome.runtime.lastError) console.error("[LRW] errore in windows.create:", chrome.runtime.lastError.message);
        else console.log("[LRW] finestra creata, id:", win && win.id);
        if (done) done(!chrome.runtime.lastError);
      });
    });
  } else {
    openWithDefaultSize(url, done);
  }
}

function openWithDefaultSize(url, done) {
  chrome.windows.create({ url: url || CONSOLE_FALLBACK_URL, type: "popup", width: 800, height: 700, focused: true }, (win) => {
    if (chrome.runtime.lastError) console.error("[LRW] errore in windows.create:", chrome.runtime.lastError.message);
    if (done) done(!chrome.runtime.lastError);
  });
}

// Apertura dall'icona "Lead Rework" sul Desktop (programma di avvio in "Lead Rework.app"): apre il file della console in una
// scheda normale con #apri-finestra; console-content.js se ne accorge e manda qui "openConsoleWindow". Facciamo ESATTAMENTE
// quello che fa il pulsante "Invia a Lead Rework Console" (finestra popup in alto a sinistra, 35% x 60%), ma senza dati e
// senza ricaricare una console già aperta (così non si perde quello che si sta scrivendo). La scheda di passaggio si chiude.
function openConsoleFromLauncher(senderTab) {
  const url = ((senderTab && senderTab.url) || CONSOLE_FALLBACK_URL).split("#")[0];
  const chiudiSchedaDiPassaggio = () => {
    if (senderTab && senderTab.id !== undefined) chrome.tabs.remove(senderTab.id, () => { void chrome.runtime.lastError; });
  };
  chrome.tabs.query({ url: "file:///*lead-rework-console.html" }, (tabs) => {
    const altre = (tabs || []).filter(t => !senderTab || t.id !== senderTab.id);
    if (!altre.length) { openNewConsoleWindow(url, chiudiSchedaDiPassaggio); return; }
    const tab = altre[0];
    calcolaRettangoloFinestra(OFFSET_FRAZIONE_LEAD_REWORK, LARGHEZZA_FRAZIONE_LEAD_REWORK, ALTEZZA_FRAZIONE_LEAD_REWORK, (r) => {
      chrome.windows.update(tab.windowId, { focused: true, left: r.left, top: r.top, width: r.width, height: r.height }, () => { void chrome.runtime.lastError; });
      chrome.tabs.update(tab.id, { active: true });
      chiudiSchedaDiPassaggio();
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg) return;

  if (msg.type === "openConsoleWindow") {
    openConsoleFromLauncher(sender && sender.tab);
    return;
  }

  if (msg.type === "leadCaptured") {
    console.log("[LRW] leadCaptured ricevuto, cerco una scheda console già aperta…");

    chrome.tabs.query({ url: "file:///*lead-rework-console.html" }, (tabs) => {
      if (chrome.runtime.lastError) console.error("[LRW] errore in tabs.query:", chrome.runtime.lastError.message);
      console.log("[LRW] schede console trovate:", tabs ? tabs.length : 0);
      if (tabs && tabs.length) {
        // Riusiamo la scheda esistente ma la ricarichiamo sempre: così prende sia
        // l'ultima versione del file (se nel frattempo è stato aggiornato) sia le
        // dimensioni/posizione qui sotto, invece di restare "congelata" con quello
        // che aveva quando è stata aperta la prima volta. I dati in attesa arrivano
        // da soli al ricaricamento (vedi deliverPendingLead in console-content.js),
        // non serve più mandare un messaggio a un content script che potrebbe non
        // essere più collegato.
        const tab = tabs[0];
        if (chrome.system && chrome.system.display && chrome.system.display.getInfo) {
          chrome.system.display.getInfo((schermi) => {
            const primario = (schermi && schermi.find(s => s.isPrimary)) || (schermi && schermi[0]);
            if (!primario) return;
            const area = primario.workArea;
            const width = Math.round(area.width * LARGHEZZA_FRAZIONE_LEAD_REWORK);
            const height = Math.round(area.height * ALTEZZA_FRAZIONE_LEAD_REWORK);
            chrome.windows.update(tab.windowId, { focused: true, left: area.left, top: area.top, width: width, height: height });
          });
        }
        chrome.tabs.update(tab.id, { active: true });
        chrome.tabs.reload(tab.id);
      } else {
        // Nessuna scheda della console aperta: la apriamo noi. I dati restano in
        // chrome.storage.local, li legge da sola al caricamento (vedi console-content.js).
        openNewConsoleWindow();
      }
    });
    return;
  }

  if (msg.type === "leadSentToSuggerimentiVendita") {
    console.log("[LRW] lead inviato a Suggerimenti Vendita, controllo se la pagina della chiamata è già aperta…");

    // L'avviso al mini-server del menu (porta 8767, bagliore "Chiamata
    // Gestione Lead") NON si manda da qui: un service worker Manifest V3
    // può essere sospeso da Chrome tra un evento e l'altro, quindi i
    // ritentativi con setTimeout necessari (l'app di Suggerimenti Vendita
    // si sta aprendo proprio ora e ci mette qualche secondo) non sono
    // affidabili in questo contesto. Se ne occupa invece
    // console-content.js, che gira dentro la pagina della console — una
    // pagina normale, sempre viva per il tempo di questi pochi tentativi.

    chrome.tabs.query({ url: "http://localhost:8766/*" }, (tabs) => {
      if (tabs && tabs.length) {
        // Niente reload qui: potrebbe esserci una chiamata già in corso (audio
        // attivo) e un refresh la interromperebbe. Chiediamo solo al content
        // script già presente di rileggere i dati in attesa (vedi
        // suggerimenti-vendita-content.js). Se la scheda era già aperta da
        // prima che l'estensione fosse (ri)caricata, il content script non è
        // presente e questa chiamata fallisce con "Could not establish
        // connection": lo ignoriamo, i dati restano comunque in attesa in
        // chrome.storage.local e verranno letti al prossimo caricamento
        // della pagina (vedi consegnaCanovaccioInAttesa in
        // suggerimenti-vendita-content.js).
        chrome.tabs.sendMessage(tabs[0].id, { type: "applyPendingLeadSuggerimentiVendita" }, () => {
          if (chrome.runtime.lastError) {
            console.warn("[LRW] pagina di Suggerimenti Vendita non raggiungibile (probabile scheda aperta prima del reload dell'estensione):", chrome.runtime.lastError.message);
          }
        });
      }
      // Se non è aperta nessuna pagina della chiamata, i dati restano in attesa
      // in chrome.storage.local: li legge da sola la prossima volta che
      // l'operatore avvia una chiamata dal menu di Suggerimenti Vendita.
    });
  }
});
