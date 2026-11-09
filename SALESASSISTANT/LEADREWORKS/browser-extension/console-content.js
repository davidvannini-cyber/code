// Content script iniettato nella pagina della Lead Rework Console (il file
// lead-rework-console.html aperto in locale). Gira in un "isolated world" separato
// dallo script della pagina, quindi non può chiamare window.crmImport() direttamente:
// passa i dati con window.postMessage, che la console ascolta già (vedi il listener
// aggiunto in lead-rework-console.html, sezione "import diretto dal CRM").

function deliverPendingLead() {
  chrome.storage.local.get("pendingLead", (res) => {
    if (res && res.pendingLead) {
      window.postMessage({ source: "lrw-crm-extension", type: "crmLeadData", payload: res.pendingLead }, "*");
      chrome.storage.local.remove("pendingLead");
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "applyPendingLead") deliverPendingLead();
});

// Copre il caso in cui i dati fossero già in attesa in storage quando questa pagina
// si è aperta (es. la console non era ancora aperta al momento del clic sul CRM).
deliverPendingLead();

// Direzione opposta: dalla pagina della console verso Suggerimenti Vendita.
// La pagina (lead-rework-console.html) non può scrivere direttamente in
// chrome.storage (gira nel mondo JS della pagina, non ha accesso alle API
// dell'estensione): manda un postMessage a questo content script, che scrive
// per suo conto e avvisa il background di aprire/riportare in primo piano la
// pagina della chiamata, se già aperta.
window.addEventListener("message", (ev) => {
  if (ev.source !== window) return;
  if (ev.data && ev.data.source === "lrw-console" && ev.data.type === "sendToSuggerimentiVendita") {
    const payload = ev.data.payload;
    chrome.storage.local.set({ pendingLeadSuggerimentiVendita: payload }, () => {
      chrome.runtime.sendMessage({ type: "leadSentToSuggerimentiVendita" });
    });
    notificaLeadInAttesaConRitentativi(payload && payload.lead ? payload.lead.nome : "");
  }
});

// Avvisa il mini-server interno al menu di Suggerimenti Vendita (porta 8767,
// vedi avvia_server_lead_in_attesa in menu_finestra.py) che c'è un lead in
// attesa, per accendere il bagliore su "Chiamata Gestione Lead". L'app si sta
// aprendo proprio ora (vedi apriSuggerimentiVendita in
// lead-rework-console.html) e può metterci qualche secondo: da qui (una
// pagina normale, sempre viva) possiamo permetterci qualche ritentativo con
// setTimeout — cosa che invece NON è affidabile nel service worker
// dell'estensione (background.js), che Chrome può sospendere tra un evento e
// l'altro senza rispettare i timer pendenti. Se dopo tutti i tentativi l'app
// non risponde comunque, il lead resta comunque in attesa in
// chrome.storage.local, semplicemente senza bagliore.
function notificaLeadInAttesaConRitentativi(nome, tentativiRimasti){
  if (tentativiRimasti === undefined) tentativiRimasti = 8;
  fetch("http://localhost:8767/lead-in-attesa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: nome || "" })
  }).catch(() => {
    if (tentativiRimasti > 1){
      setTimeout(() => notificaLeadInAttesaConRitentativi(nome, tentativiRimasti - 1), 1500);
    }
  });
}
