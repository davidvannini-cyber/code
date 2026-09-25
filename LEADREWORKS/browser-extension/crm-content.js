// Content script iniettato sulle pagine di dettaglio lead del CRM Facile Salire
// (https://app.facilesalire.it/leads/*). Aggiunge un pulsante galleggiante che,
// con un clic, legge i dati del lead già presenti nella pagina (il CRM li carica
// tutti insieme in un blocco <script type="application/json" data-page="app">,
// non serve aprire i vari tab Attività/Offerte/Note) e li invia alla Lead Rework
// Console tramite chrome.storage.local (vedi console-content.js + background.js).

function stripHtml(html) {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return el.textContent.replace(/\s+\n/g, "\n").trim();
}

// Le etichette del "motivo del rifiuto" sul CRM sono un elenco enum (value -> label,
// es. "price" -> "Prezzo") esposto nella stessa pagina: lo leggiamo da lì invece di
// tenerne una copia qui, così restano allineate se il CRM cambia le etichette.
function resolveEnumLabel(options, value) {
  if (!value) return "";
  const found = (options || []).find((o) => o.value === value);
  return found ? found.label : "";
}

// Il CRM gestisce modelli di prodotto specifici (es. "Handicare H4000 (Superior)"),
// mentre la console lavora con 3 categorie generiche (Montascale/Pedana/Elevatore).
// Qui si tenta un'associazione per parole chiave; se non si trova nulla di sicuro,
// si lascia vuoto e resta il valore di default della console (Montascale) — è un
// abbinamento "a migliore sforzo", da verificare a mano se il prodotto è insolito.
// Non conosciamo il nome esatto del campo telefono/email nel blob dati del
// CRM (può cambiare da un'installazione all'altra, e non l'abbiamo mai
// verificato contro la pagina reale): invece di puntare a una singola chiave
// fissa, scandagliamo le chiavi dirette del lead cercando un nome plausibile
// e prendiamo il primo valore non vuoto — stesso spirito "a migliore sforzo"
// di mapProdottoCategoria qui sopra. Va verificato a mano la prima volta.
function estraiCampoSimile(lead, pattern) {
  if (!lead) return "";
  for (const chiave of Object.keys(lead)) {
    if (!pattern.test(chiave)) continue;
    const valore = lead[chiave];
    if (typeof valore === "string" && valore.trim()) return valore.trim();
    if (valore && typeof valore === "object") {
      if (typeof valore.formatted === "string" && valore.formatted.trim()) return valore.formatted.trim();
      if (typeof valore.value === "string" && valore.value.trim()) return valore.value.trim();
    }
  }
  return "";
}

function mapProdottoCategoria(nomeProdotto) {
  const s = (nomeProdotto || "").toLowerCase();
  if (/montascale|stairlift|access|handicare|arealifting|albatross|\bpve\b/.test(s)) return "Montascale";
  if (/pedan/.test(s)) return "Pedana";
  if (/elevator|ascensor/.test(s)) return "Elevatore";
  return "";
}

function readCrmPageData() {
  const scriptEl = document.querySelector('script[data-page="app"]');
  if (!scriptEl) {
    throw new Error("Blocco dati pagina non trovato (script data-page=\"app\" mancante).");
  }
  const payload = JSON.parse(scriptEl.textContent);
  const props = payload.props || {};
  const lead = props.lead;
  if (!lead) {
    throw new Error("Questa non sembra una pagina di dettaglio lead (dato \"lead\" mancante).");
  }

  // Il CRM (Inertia.js) carica questo blocco dati una volta sola al caricamento
  // completo della pagina. Se l'operatore passa da un lead all'altro cliccando
  // dentro il CRM senza un refresh vero (navigazione client-side), questo blocco
  // può restare quello del lead precedente anche se sullo schermo si vede quello
  // nuovo — l'indirizzo della pagina invece si aggiorna sempre. Confrontando i due
  // ID si individua il caso ed si evita di inviare dati del lead sbagliato.
  const urlMatch = location.pathname.match(/\/leads\/(\d+)/);
  if (urlMatch && String(lead.id) !== urlMatch[1]) {
    throw new Error(
      "I dati letti dalla pagina sono ancora quelli del lead precedente (probabilmente hai navigato qui senza ricaricare la pagina). Premi F5 su questa pagina e riprova."
    );
  }

  const activities = props.activities || [];
  const deals = props.deals || [];
  const dealLostReasons = (props.enumOptions && props.enumOptions.dealLostReasons) || [];

  const nome = [lead.name, lead.surname].filter(Boolean).join(" ").trim();
  const zona = lead.city_display || "";
  const note = stripHtml(lead.notes);
  const telefono1 = estraiCampoSimile(lead, /phone|tel(?!$)|mobile|cell/i);
  const email = estraiCampoSimile(lead, /mail/i);

  // Storico contatti: tutte le attività così come le espone il CRM (già in ordine
  // dal più recente), ciascuna con tipo, data di scadenza e testo delle note.
  const storico = activities
    .map((a) => {
      const tipo = (a.type && a.type.label) || "";
      const data = a.duedate_formatted || "";
      const testo = stripHtml(a.notes);
      if (!testo) return "";
      return "[" + tipo + (data ? " - " + data : "") + "] " + testo;
    })
    .filter(Boolean)
    .join("\n\n");

  let prezzo_esistente = "";
  let motivazione_rifiuto = "";
  let prodottoNome = "";
  if (deals.length) {
    const deal = deals[0];
    if (deal.goal && deal.goal.formatted) prezzo_esistente = deal.goal.formatted;
    if (deal.lost_reason) motivazione_rifiuto = resolveEnumLabel(dealLostReasons, deal.lost_reason) || deal.lost_reason;
    const dp = (deal.deal_products || [])[0];
    if (dp && dp.product && dp.product.name) prodottoNome = dp.product.name;
  }

  // "Appuntamento" = l'attività di tipo Visita più recente (passata o futura che sia):
  // è così che l'operatore la riconosce oggi nel CRM.
  const visite = activities.filter((a) => a.type && a.type.value === "visit");
  let data_appuntamento = "";
  let orario_appuntamento = "";
  if (visite.length) {
    const piuRecente = visite.slice().sort((a, b) => new Date(b.duedate) - new Date(a.duedate))[0];
    if (piuRecente && piuRecente.duedate_formatted) {
      const parti = piuRecente.duedate_formatted.split(" ");
      data_appuntamento = parti[0] || "";
      orario_appuntamento = parti[1] || "";
    }
  }
  const indirizzo = [lead.address, lead.city_display].filter(Boolean).join(", ");

  return {
    nome,
    zona,
    telefono1,
    email,
    note,
    storico,
    prezzo_esistente,
    motivazione_rifiuto,
    data_appuntamento,
    orario_appuntamento,
    indirizzo,
    prodotto: mapProdottoCategoria(prodottoNome)
  };
}

function injectButton() {
  if (document.getElementById("lrw-float-btn")) return;
  const btn = document.createElement("button");
  btn.id = "lrw-float-btn";
  btn.type = "button";
  btn.textContent = "📤 Invia a Lead Rework Console";
  btn.style.cssText = [
    "position:fixed", "bottom:20px", "right:20px", "z-index:999999",
    "background:#2454e0", "color:#fff", "border:none", "border-radius:8px",
    "padding:12px 18px", "font-size:13px", "font-weight:600",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    "box-shadow:0 4px 14px rgba(0,0,0,.25)", "cursor:pointer"
  ].join(";");
  btn.addEventListener("click", onCaptureClick);
  document.body.appendChild(btn);
}

function onCaptureClick() {
  const btn = document.getElementById("lrw-float-btn");
  const originalText = btn ? btn.textContent : "";
  try {
    const data = readCrmPageData();
    chrome.storage.local.set({ pendingLead: data, pendingLeadTs: Date.now() }, () => {
      chrome.runtime.sendMessage({ type: "leadCaptured" });
      if (btn) {
        btn.textContent = "✓ Inviato";
        setTimeout(() => { btn.textContent = originalText; }, 2500);
      }
    });
  } catch (e) {
    alert(
      "Impossibile leggere i dati di questa pagina: " + e.message +
      "\n\nSe sei arrivato qui cliccando da un altro lead senza ricaricare la pagina, prova a premere F5 e riprova."
    );
  }
}

injectButton();
