// Content script iniettato nella pagina della chiamata di "Suggerimenti
// Vendita" (http://localhost:8766/ — è una pagina Chrome vera, aperta dal
// pulsante "Chiamata YesMobility"/"Rinforzo Facile Salire" del menu). Mostra
// il canovaccio esportato dalla Lead Rework Console riusando lo stesso
// riquadro verde già presente nella pagina (#riquadro-canovaccio,
// #canovaccio-testo) — lo stesso che la modalità "Rinforzo Facile Salire"
// usa già per il proprio canovaccio fisso, invariato.
//
// Nessun file sul disco, nessun server Python coinvolto: i dati viaggiano
// solo tramite chrome.storage.local, stesso meccanismo del flusso
// CRM -> Lead Rework Console (vedi crm-content.js/console-content.js).

function mostraCanovaccio(canovaccio) {
  if (!canovaccio || !canovaccio.testo) return;
  const contenitore = document.getElementById("canovaccio-testo");
  const riquadro = document.getElementById("riquadro-canovaccio");
  if (!contenitore || !riquadro) return; // pagina diversa da quella attesa, non facciamo nulla
  contenitore.textContent = "";
  canovaccio.testo.split(/\n\s*\n/).forEach((paragrafo) => {
    const p = document.createElement("p");
    p.textContent = paragrafo.trim();
    contenitore.appendChild(p);
  });
  riquadro.style.display = "block";
}

// Riquadro "Nome / Numero di telefono" in cima alla pagina: di default mostra
// il lead statico caricato dal server Python (--contesto), qui lo
// sovrascriviamo con i dati veri del lead CRM appena esportato dalla Lead
// Rework Console, stesso meccanismo diretto sul DOM usato per il canovaccio.
function mostraLeadInfo(lead) {
  if (!lead) return;
  const elNome = document.getElementById("lead-nome");
  const elTelefono = document.getElementById("lead-telefono");
  if (elNome && lead.nome) elNome.textContent = lead.nome;
  if (elTelefono && lead.telefono) elTelefono.textContent = lead.telefono;
}

// La pagina della chiamata ha 3 modalità, scelte dal menu principale
// dell'app (vedi Contents/MacOS/avvia -> avvia_chiamata_comune, parametro
// "avvio" nell'URL): "" (Chiamata YesMobility, solo gestione telefonata),
// "gestione_lead" (Chiamata Gestione Lead, guida + gestione telefonata),
// "rinforzo_facile_salire" (canovaccio fisso mandato dal server). Il
// canovaccio importato da Lead Rework Console va mostrato SOLO in modalità
// "gestione_lead": nelle altre due, il lead in attesa resta intatto in
// chrome.storage.local (non lo consumiamo), così è ancora lì la prossima
// volta che l'operatore apre davvero "Chiamata Gestione Lead".
function modalitaGestioneLead() {
  return new URLSearchParams(location.search).get("avvio") === "gestione_lead";
}

function consegnaCanovaccioInAttesa() {
  if (!modalitaGestioneLead()) return;
  chrome.storage.local.get("pendingLeadSuggerimentiVendita", (res) => {
    if (res && res.pendingLeadSuggerimentiVendita) {
      mostraCanovaccio(res.pendingLeadSuggerimentiVendita.canovaccio);
      mostraLeadInfo(res.pendingLeadSuggerimentiVendita.lead);
      chrome.storage.local.remove("pendingLeadSuggerimentiVendita");
      // Spegne il bagliore "lead in attesa" nel menu principale (mini-server
      // interno al menu su porta 8767, vedi avvia_server_lead_in_attesa in
      // menu_finestra.py — non è più server_suggerimenti.py/8766, quello
      // dipendeva dalla chiamata già avviata). Best-effort: se non risponde
      // per qualsiasi motivo, il bagliore semplicemente resta acceso,
      // nessun problema funzionale.
      fetch("http://localhost:8767/lead-in-attesa", { method: "DELETE" }).catch(() => {});
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "applyPendingLeadSuggerimentiVendita") consegnaCanovaccioInAttesa();
});

// Copre il caso in cui i dati fossero già in attesa quando questa pagina si è
// aperta (l'operatore ha esportato PRIMA di avviare la chiamata, il caso normale).
consegnaCanovaccioInAttesa();
