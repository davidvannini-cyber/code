// Riceve l'avviso "ho catturato un lead" dal content script sul CRM (crm-content.js).
// I dati veri viaggiano già via chrome.storage.local (scritti direttamente da crm-content.js):
// qui ci occupiamo di trovare la scheda della console, se è già aperta, e di portarla
// in primo piano + avvisarla di leggere i dati in attesa; se non è aperta in nessuna
// scheda, ne apriamo una nuova noi stessi (vedi CONSOLE_FALLBACK_URL sotto) — in
// entrambi i casi i dati arrivano da soli, senza altri clic da parte dell'utente.

// Percorso fisso del file locale sul Mac dell'utente: se la cartella del progetto
// viene spostata, questo indirizzo va aggiornato di conseguenza.
const CONSOLE_FALLBACK_URL = "file:///Users/davidvannini_1/Documents/progetti/LEADREWORKS/src/lead-rework-console.html";

// Percentuale di larghezza (dello schermo di lavoro primario) e offset da
// sinistra per questa finestra: stesso schema usato da apri-console.command
// (Lead Rework Console, 40%), menu_finestra.py (Suggerimenti Vendita, 19%,
// subito a destra di questa) e Contents/MacOS/avvia (pannello chiamata, 40%,
// più a destra ancora) — tre finestre affiancate in proporzioni fisse
// (scelte dall'utente), invece di finestre sparse di dimensioni diverse.
const LARGHEZZA_FRAZIONE_LEAD_REWORK = 0.40;
const OFFSET_FRAZIONE_LEAD_REWORK = 0;

// "workArea" esclude già barra menu e Dock. Se l'API non è disponibile per
// qualche motivo, un rettangolo fisso di fallback (i valori usati prima di
// questa funzionalità).
function calcolaRettangoloFinestra(offsetFrazione, larghezzaFrazione, callback) {
  if (chrome.system && chrome.system.display && chrome.system.display.getInfo) {
    chrome.system.display.getInfo((schermi) => {
      const primario = (schermi && schermi.find(s => s.isPrimary)) || (schermi && schermi[0]);
      if (!primario) { callback({ left: 40, top: 40, width: 900, height: 1300 }); return; }
      const area = primario.workArea;
      callback({
        left: area.left + Math.round(area.width * offsetFrazione),
        top: area.top,
        width: Math.round(area.width * larghezzaFrazione),
        height: area.height
      });
    });
  } else {
    callback({ left: 40, top: 40, width: 900, height: 1300 });
  }
}

// type:"popup" apre una finestra senza tab/barra indirizzi (la cosa più vicina a
// "app esterna" che un'estensione può fare: non può lanciare Chrome in vera
// modalità --app, quella è disponibile solo da riga di comando, vedi apri-console.command).
function openNewConsoleWindow() {
  console.log("[LRW] apro una nuova finestra:", CONSOLE_FALLBACK_URL);
  calcolaRettangoloFinestra(OFFSET_FRAZIONE_LEAD_REWORK, LARGHEZZA_FRAZIONE_LEAD_REWORK, (rect) => {
    chrome.windows.create({ url: CONSOLE_FALLBACK_URL, type: "popup", left: rect.left, top: rect.top, width: rect.width, height: rect.height, focused: true }, (win) => {
      if (chrome.runtime.lastError) console.error("[LRW] errore in windows.create:", chrome.runtime.lastError.message);
      else console.log("[LRW] finestra creata, id:", win && win.id);
    });
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;

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
        calcolaRettangoloFinestra(OFFSET_FRAZIONE_LEAD_REWORK, LARGHEZZA_FRAZIONE_LEAD_REWORK, (rect) => {
          chrome.windows.update(tab.windowId, { focused: true, left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        });
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
