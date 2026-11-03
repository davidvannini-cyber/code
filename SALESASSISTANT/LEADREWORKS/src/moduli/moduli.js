/* Compilazione moduli YesMobility (Quotazione indicativa e Preventivo) dai dati del lead.
   - Si apre dal pulsante «Moduli» nella finestra «Vedi» di un lead (window.apriModuli(idLead)).
   - Precompila dai dati del lead, l'operatore completa/corregge, poi «Scarica PDF».
   - Quello che scrivi resta salvato nel lead (r.moduli) e si ritrova alla riapertura.
   - Il PDF si compila con pdf-lib (cdnjs) sui campi del modulo: il layout resta quello originale.
   Dipende da console: state.leadsHistory, scheduleHistorySave, escapeHtml, loadScriptOnce, window.MODULI_PDF. */
(function(){
  // ---- Schema: [chiave PDF, etichetta, tipo, larghezza 1-12, gruppo-esclusivo]
  // tipo: t=testo, a=area di testo, c=casella
  const CLIENTE_Q = [["data","Data","t",3],["luogo","Luogo","t",5],["numero","N. quotazione","t",4],
    ["spettabile","Spettabile (ragione sociale / persona)","t",12],["nome","Nome e cognome","t",12],
    ["via","Via / piazza","t",6],["civico","N. civico","t",3],["interno","Interno","t",3],
    ["cap","CAP","t",3],["provincia","Provincia","t",3],["localita","Località","t",6],
    ["cf","Codice fiscale","t",6],["piva","P.IVA (se azienda)","t",6],
    ["telefono","Telefono","t",4],["cellulare","Cellulare","t",4],["email","Email","t",4]];
  const P = (p, a) => a.map(x => [p + x[0], ...x.slice(1)]);
  const MODULI = {
    quotazione: {
      titolo: "Quotazione indicativa", file: "Quotazione_indicativa_YM",
      sezioni: [
        ["Anagrafica cliente", CLIENTE_Q],
        ["Tipo di impianto", [["prodotto","Prodotto","t",12]]],
        ["Caratteristiche tecniche", [["misure","Misure","t",12],["partenza","Partenza","t",12],["arrivo","Arrivo","t",12],["varie","Varie","a",12]]],
        ["Condizioni economiche", [["prezzo","Prezzo indicativo (€)","t",4],["incluso_trasporto","Trasporto","c",2],["incluso_installazione","Installazione","c",3],["incluso_collaudo","Collaudo","c",3],["garanzia","Anni di garanzia","t",4],["pagamento","Modalità di pagamento","t",8],["note","Note","a",12]]]
      ]
    },
    preventivo: {
      titolo: "Preventivo", file: "Preventivo_YM",
      sezioni: [
        ["Pagina 1 · Dati cliente", P("p1_", [["data","Data","t",3],["luogo","Luogo","t",5],["numero","N. preventivo","t",4],
          ["spettabile","Spettabile (rag. sociale / persona)","t",12],["nome","Nome e cognome","t",12],
          ["via","Via / piazza","t",6],["civico","N. civico","t",3],["civico2","Interno","t",3],
          ["cap","CAP","t",3],["provincia","Provincia","t",3],["localita","Località","t",6],
          ["cf","Codice fiscale","t",6],["piva","P.IVA (se azienda)","t",6],
          ["tel","Telefono","t",4],["cell","Cellulare","t",4],["email","Email","t",4]])],
        ["Pagina 1 · Luogo di installazione", P("p1_", [["i_via","Via / piazza","t",6],["i_civico","N. civico","t",3],["i_cap","CAP","t",3],["i_provincia","Provincia","t",4],["i_localita","Località","t",8],
          ["ztl_si","Zona ZTL: Sì","c",3,"ztl"],["ztl_no","Zona ZTL: No","c",3,"ztl"],["cond_costituito","Condominio costituito","c",3,"cond"],["cond_non_costituito","Condominio non costituito","c",3,"cond"]])],
        ["Pagina 1 · Condizioni economiche e note", P("p1_", [["prezzo","Prezzo finale (€)","t",4],["trasporto","Trasporto","c",2],["installazione","Installazione","c",3],["collaudo","Collaudo","c",3],["garanzia","Anni di garanzia","t",4],["pagamento","Modalità di pagamento","t",8],["note","Note","a",12]])],
        ["Pagina 2 · Scheda tecnica", [["p2_numero","N. descrizione tecnica / offerta","t",12],
          ["p2_montascale_poltroncina","Montascale a poltroncina","c",4,"imp"],["p2_montascale_pedana","Montascale a pedana","c",4,"imp"],
          ["p2_tipologia_rettilineo","Rettilineo","c",2,"tip"],["p2_tipologia_curvilineo","Curvilineo","c",2,"tip"],
          ["p2_denominazione","Denominazione","t",12],
          ["p2_interno","Interno","c",3,"ie"],["p2_esterno","Esterno","c",3,"ie"],["p2_lato_sx","Lato sinistro","c",3,"lato"],["p2_lato_dx","Lato destro","c",3,"lato"],
          ["p2_mono_guida","Mono guida","c",3,"guida"],["p2_doppia_guida","Doppia guida","c",3,"guida"],["p2_fiss_gradino","Fissaggio a gradino","c",3,"fiss"],["p2_fiss_parete","Fissaggio a parete","c",3,"fiss"],
          ["p2_joy_sx","Joystick sinistra","c",3,"joy"],["p2_joy_dx","Joystick destra","c",3,"joy"],
          ["p2_lunghezza","Lunghezza percorso (cm)","t",3],["p2_larghezza","Larghezza min. (cm)","t",3],["p2_curve90","Curve a 90°","t",3],["p2_curve180","Curve a 180°","t",3],
          ["p2_a_cm","A (cm)","t",3],["p2_b_cm","B (cm)","t",3],["p2_altezza","Altezza (cm)","t",3],["p2_peso_max","Peso max (kg)","t",3],["p2_portata","Portata (kg)","t",4]]],
        ["Pagina 2 · Solo montascale curvilineo", [
          ["p2_p_90","Partenza 90°","c",3,"par"],["p2_p_180","Partenza 180°","c",3,"par"],["p2_p_orizz","Partenza orizzontale","c",3,"par"],["p2_p_incl","Partenza inclinata std","c",3,"par"],["p2_p_droop","Partenza Droop Start","c",3,"par"],
          ["p2_a_90","Arrivo 90°","c",3,"arr"],["p2_a_180","Arrivo 180°","c",3,"arr"],["p2_a_orizz","Arrivo orizzontale","c",3,"arr"],["p2_a_incl","Arrivo inclinata std","c",3,"arr"],["p2_a_filo","Arrivo filo ult. gradino","c",3,"arr"],["p2_a_corta","Arrivo orizz. corta","c",3,"arr"],
          ["p2_colore_rotaia","Colore rotaia","t",6],["p2_colore_seduta","Colore seduta","t",6],
          ["p2_fermate_no","Fermate intermedie: No","c",4,"ferm"],["p2_fermate_si","Fermate intermedie: Sì","c",4,"ferm"],["p2_fermate_numero","Numero fermate","t",4],
          ["p2_data_firma","Data (firma)","t",4],["p2_firma_cliente","Firma cliente per approvazione","t",8]]],
        ["Pagina 3 · Optional montascale rettilineo", [
          ["p3_r_bin_rib_man","Binario ribaltabile manuale","c",6],["p3_r_bin_rib_mot","Binario ribaltabile motorizzato","c",6],["p3_r_bin_slide","Binario slide track","c",6],
          ["p3_r_seduta_pedana_mot","Seduta + pedana motorizzata","c",6],["p3_r_seduta_pearch","Seduta Pearch","c",6],["p3_r_seduta_estesa","Seduta estesa","c",6],
          ["p3_r_braccioli_larghi","Braccioli extra larghi","c",6],["p3_r_zero_intrusion","Zero Intrusion","c",6],["p3_r_portata160","Portata 160 kg","c",6],["p3_r_portata200","Portata 200 kg","c",6],
          ["p3_r_radio_n","Radiocomandi aggiuntivi","t",6]]],
        ["Pagina 3 · Optional montascale curvilineo", [
          ["p3_c_braccioli_larghi","Braccioli extra larghi (solo doppia guida)","c",6],["p3_c_bin_rib_mot","Binario ribaltabile motorizzato","c",6],["p3_c_seduta_pedana_mot","Seduta + pedana motorizzata","c",6],
          ["p3_c_body_harness","Body Harness","c",6],["p3_c_kit_ripetitore","Kit ripetitore","c",6],["p3_c_active_seat","Active Seat (solo monoguida)","c",6],["p3_c_seduta_pearch","Seduta Pearch (solo doppia guida)","c",6],
          ["p3_c_ral","RAL binario speciale","t",6],["p3_c_radio_n","Radiocomandi aggiuntivi","t",6]]],
        ["Pagina 3 · Poltrona speciale", [
          ["p3_poltrona_elegance","Elegance","c",4,"polt"],["p3_poltrona_classic","Classic","c",4,"polt"],["p3_poltrona_alliance","Alliance","c",4,"polt"],["p3_poltrona_style","Style","c",6,"polt"],["p3_poltrona_smart","Smart","c",6,"polt"]]],
        ["Pagina 3 · Optional montascale a pedana", [
          ["p3_p_motorizzata","Pedana motorizzata","c",6],["p3_p_maggiorata","Pedana maggiorata","c",6],["p3_p_bandella","Bandella laterale","c",6],["p3_p_strapuntino","Strapuntino per sedersi","c",6],
          ["p3_p_plexiglas","Tamponamento in plexiglas","c",6],["p3_p_filo_comando","Filo comando","c",6],["p3_p_ancoraggio","Ancoraggio speciale","c",6],["p3_p_colonnina","Colonnina ai piani","c",6],
          ["p3_p_battery","Battery backup","c",6],["p3_telo_copertura","Telo di copertura (solo outdoor)","c",6],
          ["p3_note","Note utili","a",12],["p3_data_firma","Data (firma)","t",4],["p3_firma_cliente","Firma cliente per approvazione","t",8]]]
      ]
    }
  };

  // ---- Dati del lead -> campi (solo quello che il lead contiene davvero; il resto lo scrive l'operatore)
  function oggi(){ const d = new Date(); return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0") + "/" + d.getFullYear(); }
  function splitVia(ind){            // "Via Roma 12" -> ["Via Roma","12"]
    const m = String(ind||"").trim().match(/^(.*?)[,\s]+(\d+\s*[A-Za-z]?)$/);
    return m ? [m[1].trim().replace(/,$/,""), m[2].trim()] : [String(ind||"").trim(), ""];
  }
  // "Rosalba Berdicchia" -> {cognome:"Berdicchia", nome:"Rosalba"}. Ordine dei lead: nome poi cognome.
  // Il cognome è l'ultima parola più le particelle che la precedono (De Luca, Di Stefano, Dal Pozzo…); il resto è il nome (anche doppio).
  // Ragioni sociali (srl, spa, snc, condominio…) restano intere nel primo campo, senza nome.
  const PARTICELLE = ["de","di","da","del","dei","degli","della","delle","dello","dal","dai","dalla","dalle","dallo","dall","d","la","lo","le","li","van","von","mc","mac","san","santa","ben","el","al"];
  const RAGIONE = /(\bs\.?\s?r\.?\s?l\b|\bs\.?\s?p\.?\s?a\b|\bs\.?\s?n\.?\s?c\b|\bs\.?\s?a\.?\s?s\b|\bsoc\.|\bsocieta|\bsocietà|\bditta\b|\bstudio\b|\bcondominio\b|\bcooperativa\b|\bassociazione\b|\bimpresa\b|&)/i;
  function spezzaNome(completo){
    const t = String(completo || "").trim().replace(/\s+/g, " ");
    if (!t) return { cognome: "", nome: "" };
    if (RAGIONE.test(t)) return { cognome: t, nome: "" };
    const w = t.split(" ");
    if (w.length === 1) return { cognome: t, nome: "" };
    let i = w.length - 1;                                   // inizio del cognome
    while (i > 1 && PARTICELLE.includes(w[i - 1].toLowerCase().replace(/['’]$/, ""))) i--;
    return { cognome: w.slice(i).join(" "), nome: w.slice(0, i).join(" ") };
  }
  function daLead(chiave, d){
    const [via, civ] = splitVia(d.indirizzo);
    const tel = String(d.telefono1||"").trim(), tel2 = String(d.telefono2||"").trim();
    const mobile = [tel, tel2].find(t => /^(\+?39)?\s*3\d{2}/.test(t.replace(/\s/g,""))) || "";
    const fisso = [tel, tel2].find(t => t && t !== mobile) || "";
    const base = {
      data: oggi(), luogo: d.zona || "", spettabile: spezzaNome(d.nome).cognome, nome: spezzaNome(d.nome).nome,
      via, civico: civ, localita: d.zona || "", telefono: fisso, cellulare: mobile, email: d.email || "",
      prodotto: d.prodotto || ""   // le note del lead sono interne: non si importano mai nei moduli (li vede il cliente)
    };
    const p1 = { data: base.data, luogo: base.luogo, spettabile: base.spettabile, nome: base.nome, via, civico: civ, localita: base.localita,
      tel: fisso, cell: mobile, email: base.email, i_via: via, i_civico: civ, i_localita: base.localita };
    return chiave === "quotazione" ? base : (function(){ const o = {}; Object.keys(p1).forEach(k => o["p1_" + k] = p1[k]); o.p2_data_firma = ""; return o; })();
  }

  // ---- Archivio nel lead: r.moduli[tipo] = [ {id, titolo, v, base, ts}, ... ]
  // id = numero del documento (4 cifre + 2 lettere, es. 4827KD), unico in tutta la console.
  // v = valori del modulo; base = dati del lead al momento del salvataggio (serve all'avviso «lead cambiato»); ts = ultimo salvataggio.
  // Formati vecchi ancora letti: oggetto singolo {v,base,ts} e solo valori.
  const NUMERO_KEYS = { quotazione: ["numero"], preventivo: ["p1_numero", "p2_numero"] };
  function tuttiGliId(){
    const out = new Set();
    Object.values((typeof state !== "undefined" && state.leadsHistory) || {}).forEach(r => Object.values(r.moduli || {}).forEach(m => {
      (Array.isArray(m) ? m : [m]).forEach(e => { if (e && e.id) out.add(e.id); });
    }));
    return out;
  }
  function nuovoNumero(){
    const usati = tuttiGliId(), L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    for (let n = 0; n < 1000; n++) {
      const c = String(1000 + Math.floor(Math.random() * 9000)) + L[Math.floor(Math.random() * L.length)] + L[Math.floor(Math.random() * L.length)];
      if (!usati.has(c)) return c;
    }
    return String(Date.now()).slice(-4) + "ZZ";
  }
  function conta(r, tipo){ const m = r && r.moduli && r.moduli[tipo]; return !m ? 0 : (Array.isArray(m) ? m.length : 1); }
  window.moduliConta = conta;   // usato dall'elenco Storico Lead (quadratini)
  function lista(r, tipo){        // normalizza (una volta) i formati vecchi in array
    let m = r && r.moduli && r.moduli[tipo]; if (!m) return [];
    if (!Array.isArray(m)) {
      const e = m.v ? m : { v: m, base: null, ts: null };
      e.id = e.id || nuovoNumero(); e.titolo = e.titolo || "";
      NUMERO_KEYS[tipo].forEach(k => { if (!e.v[k]) e.v[k] = e.id; });
      r.moduli[tipo] = m = [e];
      if (window.scheduleHistorySave) scheduleHistorySave();
    }
    return m;
  }

  // ---- Stato e interfaccia
  let ctx = null;   // {id (lead), tipo, eid (numero modulo), titolo, valori, base, ts, nuovo, cambiato}
  const E = s => window.escapeHtml ? window.escapeHtml(s) : String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const lead = () => state.leadsHistory[ctx.id];

  function css(){
    if (document.getElementById("mod-css")) return;
    const s = document.createElement("style"); s.id = "mod-css";
    s.textContent = `
    #mod-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}
    #mod-box{background:#fff;color:#1a1f2e;border-radius:14px;width:min(900px,100%);box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden}
    #mod-box .mh{background:#17364f;color:#fff;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    #mod-box .mh h3{margin:0;font-size:16px;flex:1}
    #mod-box button{border:0;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;font-size:13px}
    #mod-box .mb{padding:12px 16px;max-height:70vh;overflow:auto}
    #mod-box fieldset{border:1px solid #cbd5e1;border-radius:10px;margin:0 0 12px;padding:8px 10px}
    #mod-box legend{font-weight:800;color:#17364f;font-size:13px;padding:0 6px}
    #mod-box .g{display:grid;grid-template-columns:repeat(12,1fr);gap:6px 8px}
    #mod-box label{font-size:11px;color:#475569;display:flex;flex-direction:column;gap:2px}
    #mod-box label.c{flex-direction:row;align-items:center;gap:6px;font-size:13px;color:#1a1f2e}
    #mod-box input[type=text],#mod-box textarea{font:inherit;font-size:13px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:6px;width:100%;box-sizing:border-box}
    #mod-box .mf{padding:10px 16px;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    #mod-box .pri{background:#0f766e;color:#fff}#mod-box .sec{background:#e2e8f0;color:#1a1f2e}#mod-box .dan{background:#fee2e2;color:#991b1b}
    #mod-box .sc{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #mod-box .sc button{border:2px solid #17364f;background:#f1f5f9;border-radius:12px;padding:22px 14px;cursor:pointer;display:flex;flex-direction:column;gap:6px;text-align:center;color:#17364f;font:inherit}
    #mod-box .sc button:hover{background:#17364f;color:#fff}#mod-box .sc b{font-size:17px}#mod-box .sc span{font-size:12px;opacity:.8}
    #mod-box .sc em{font-style:normal;font-size:12px;font-weight:700;color:#0f766e;margin-top:2px}#mod-box .sc button:hover em{color:#d7f3f0}
    #mod-box .warn{background:#fef3c7;border:1.5px solid #b45309;border-radius:8px;padding:8px 10px;margin:0 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:#1a1f2e;font-size:13px}
    #mod-box .warn>div{flex:1;min-width:200px}#mod-box .warn ul{margin:2px 0 0;padding-left:18px}
    #mod-box .warn button{padding:6px 11px;font-size:12.5px}
    #mod-box input[type=text].mod,#mod-box textarea.mod{background:#fff7ed;border-color:#fdba74}
    #mod-box .lt{display:flex;flex-direction:column;gap:8px}
    #mod-box .lr{border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    #mod-box .lr .nu{font-weight:800;color:#17364f;font-size:15px;letter-spacing:.03em;min-width:84px;font-variant-numeric:tabular-nums}
    #mod-box .lr .ti{flex:1;min-width:140px}#mod-box .lr .ti small{display:block;color:#64748b;font-size:11.5px}
    #mod-box .tt{display:flex;gap:10px;align-items:flex-end;margin:0 0 12px}
    #mod-box .tt .nu{font-weight:800;font-size:18px;color:#17364f;letter-spacing:.04em;padding-bottom:3px}
    #mod-msg{font-size:12px;color:#475569;flex:1}
    @media(max-width:560px){#mod-box .sc{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function fmtTs(ts){ const d = new Date(ts); return d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"}) + " alle " + d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}); }
  function etichetta(k){ const sez = MODULI[ctx.tipo].sezioni; for (const [, campi] of sez) for (const c of campi) if (c[0] === k) return c[1]; return k; }
  function valoriDaLead(tipo, eid){ const v = daLead(tipo, (lead() && lead().dati_lead_input) || {}); NUMERO_KEYS[tipo].forEach(k => v[k] = eid); return v; }
  function calcolaDiff(){
    if (!ctx.base) return [];
    const L = valoriDaLead(ctx.tipo, ctx.eid), full = String(((lead() || {}).dati_lead_input || {}).nome || "").trim(), out = [];
    Object.keys(L).forEach(k => {
      if (k === "data" || k === "p1_data" || !(k in ctx.base)) return;
      if (/(^|_)(spettabile|nome)$/.test(k) && String(ctx.base[k] || "") === full) return;   // salvataggi vecchi: nome intero in entrambi i campi
      if (String(L[k] || "") !== String(ctx.base[k] || "")) out.push({ k, lab: etichetta(k), vecchio: ctx.base[k], nuovo: L[k], toccato: String(ctx.valori[k] || "") !== String(ctx.base[k] || "") });
    });
    return out;
  }
  function leggiForm(){
    const box = document.getElementById("mod-box"); if (!box) return;
    box.querySelectorAll("[data-k]").forEach(el => { ctx.valori[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; });
  }
  function msg(t, err){ const e = document.getElementById("mod-msg"); if (e){ e.textContent = t; e.style.color = err ? "#b91c1c" : "#475569"; } }
  function segnaSalvato(){ msg("✓ Salvato automaticamente alle " + new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})); }
  function salvaNelLead(){
    const r = lead(); if (!r) return;
    r.moduli = r.moduli || {};
    const arr = lista(r, ctx.tipo); if (!r.moduli[ctx.tipo]) r.moduli[ctx.tipo] = arr;
    ctx.ts = Date.now(); ctx.cambiato = true;
    const rec = { id: ctx.eid, titolo: ctx.titolo || "", v: Object.assign({}, ctx.valori), base: ctx.base, ts: ctx.ts };
    const i = arr.findIndex(e => e.id === ctx.eid);
    if (i >= 0) arr[i] = rec; else arr.push(rec);
    if (ctx.nuovo) { const bb = document.querySelector("#mod-box .mh button"); if (bb && bb.dataset.a === "scelta") { bb.dataset.a = "elenco"; bb.textContent = "← Elenco"; } }   // ora esiste almeno un modulo salvato
    ctx.nuovo = false;
    if (window.scheduleHistorySave) scheduleHistorySave();
  }
  const tipoNome = t => t === "preventivo" ? "Preventivo YM" : "Quotazione Indicativa YM";

  // ---- Schermate
  function statoTipo(r, tipo){ const n = conta(r, tipo); return n === 0 ? "Nuovo · parte dai dati del lead" : (n === 1 ? "1 salvato · Apri l'elenco" : n + " salvati · Apri l'elenco"); }
  function disegnaScelta(){
    ctx.tipo = null; const r = lead(), nome = ((r && r.dati_lead_input) || {}).nome || "";
    document.getElementById("mod-box").innerHTML = `
      <div class="mh"><h3>Moduli YesMobility${nome ? " · " + E(nome) : ""}</h3><button class="sec" data-a="chiudi">Chiudi</button></div>
      <div class="mb"><p style="margin:4px 0 14px;font-size:14px">Quale modulo vuoi compilare? I dati del lead vengono inseriti da soli.</p>
        <div class="sc">
          <button data-t="quotazione"><b>Quotazione Indicativa YM</b><span>2 pagine · prezzo indicativo, senza impegno</span><em>${statoTipo(r, "quotazione")}</em></button>
          <button data-t="preventivo"><b>Preventivo YM</b><span>3 pagine · dati cliente, scheda tecnica, optional</span><em>${statoTipo(r, "preventivo")}</em></button>
        </div></div>`;
  }
  function disegnaElenco(tipo){
    ctx.tipo = tipo; const arr = lista(lead(), tipo).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const righe = arr.map(e => {
      const pr = (e.v && (e.v.prezzo || e.v.p1_prezzo)) || "";
      return `<div class="lr"><span class="nu">${E(e.id)}</span><span class="ti">${E(e.titolo || "senza titolo")}<small>${e.ts ? "salvato il " + fmtTs(e.ts) : "salvato"}${pr ? " · € " + E(pr) : ""}</small></span>
        <button class="pri" data-a="apri" data-n="${E(e.id)}">Apri</button><button class="sec" data-a="duplica" data-n="${E(e.id)}">Duplica</button><button class="dan" data-a="elimina" data-n="${E(e.id)}">Elimina</button></div>`;
    }).join("");
    document.getElementById("mod-box").innerHTML = `
      <div class="mh"><button class="sec" data-a="scelta">← Scelta modulo</button><h3>${tipoNome(tipo)} · ${arr.length} ${arr.length === 1 ? "salvato" : "salvati"}</h3><button class="sec" data-a="chiudi">Chiudi</button></div>
      <div class="mb"><div class="lt">${righe}</div></div>
      <div class="mf"><span id="mod-msg"></span><button class="pri" data-a="nuovo">+ Nuovo ${tipo === "preventivo" ? "preventivo" : "quotazione"}</button></div>`;
  }
  function banner(){
    const d = calcolaDiff(); if (!d.length) return "";
    return `<div class="warn"><div><b>Dal salvataggio il lead è cambiato:</b><ul>` + d.map(x => `<li>${E(x.lab)}: ${E(x.vecchio || "—")} → <b>${E(x.nuovo || "—")}</b>${x.toccato ? " <i>(l'hai modificato tu nel modulo: resta com'è)</i>" : ""}</li>`).join("") +
      `</ul></div><button class="pri" data-a="aggiorna">Aggiorna questi campi</button><button class="sec" data-a="ignora">Ignora</button></div>`;
  }
  function disegna(){
    const m = MODULI[ctx.tipo];
    const sez = m.sezioni.map(([t, campi]) => `<fieldset><legend>${E(t)}</legend><div class="g">` + campi.map(([k, lab, tipo, w, grp]) => {
      const v = ctx.valori[k], st = `grid-column:span ${w}`;
      if (tipo === "c") return `<label class="c" style="${st}"><input type="checkbox" data-k="${k}" ${grp ? `data-g="${grp}"` : ""} ${v ? "checked" : ""}> ${E(lab)}</label>`;
      const mod = (ctx.base && String(v || "") !== String(ctx.base[k] || "")) ? " mod" : "";
      if (tipo === "a") return `<label style="${st}">${E(lab)}<textarea rows="3" data-k="${k}" class="${mod}">${E(v || "")}</textarea></label>`;
      return `<label style="${st}">${E(lab)}<input type="text" data-k="${k}" class="${mod}" value="${E(v || "")}"></label>`;
    }).join("") + `</div></fieldset>`).join("");
    const n = conta(lead(), ctx.tipo);
    document.getElementById("mod-box").innerHTML = `
      <div class="mh"><button class="sec" data-a="${n ? "elenco" : "scelta"}">${n ? "← Elenco" : "← Scelta modulo"}</button><h3>${tipoNome(ctx.tipo)}</h3><button class="sec" data-a="chiudi">Chiudi</button></div>
      <div class="mb"><div class="tt"><span class="nu" title="Numero del documento (si genera da solo)">N. ${E(ctx.eid)}</span>
        <label style="flex:1">Titolo (facoltativo, per riconoscerlo nell'elenco)<input type="text" data-titolo="1" value="${E(ctx.titolo || "")}" placeholder="es. Poltroncina curvilinea, Variante con pedana…"></label></div>
        ${banner()}${sez}</div>
      <div class="mf"><span id="mod-msg">${ctx.ts ? "✓ Salvato il " + fmtTs(ctx.ts) : "Si salva da solo a ogni modifica."}</span>
        <button class="sec" data-a="rileggi" title="Rimette i dati del lead nei campi (cancella quello che hai scritto in questo modulo)">Ricarica dal lead</button>
        <button class="sec" data-a="cartella" title="Sceglie la cartella dove salvare i PDF">Cartella PDF…</button>
        <button class="pri" data-a="scarica">Scarica PDF</button><span id="mod-dir" style="flex-basis:100%;font-size:11.5px;color:#64748b"></span></div>`;
    mostraCartella();
  }
  function apriNuovo(tipo){
    ctx.tipo = tipo; ctx.eid = nuovoNumero(); ctx.titolo = ""; ctx.valori = valoriDaLead(tipo, ctx.eid); ctx.base = Object.assign({}, ctx.valori); ctx.ts = null; ctx.nuovo = true;
    disegna();
  }
  function apriEsistente(tipo, eid){
    const e = lista(lead(), tipo).find(x => x.id === eid); if (!e) return disegnaElenco(tipo);
    const L = valoriDaLead(tipo, e.id);
    ctx.tipo = tipo; ctx.eid = e.id; ctx.titolo = e.titolo || ""; ctx.valori = Object.assign({}, L, e.v); ctx.base = e.base || null; ctx.ts = e.ts; ctx.nuovo = false;
    disegna();
  }
  function vaiTipo(tipo){
    const n = conta(lead(), tipo);
    if (n === 0) apriNuovo(tipo); else disegnaElenco(tipo);   // con almeno un modulo si apre sempre l'elenco
  }
  function duplica(tipo, eid){
    const arr = lista(lead(), tipo), e = arr.find(x => x.id === eid); if (!e) return;
    const nid = nuovoNumero(), v = Object.assign({}, e.v); NUMERO_KEYS[tipo].forEach(k => v[k] = nid);
    const base = e.base ? Object.assign({}, e.base) : null; if (base) NUMERO_KEYS[tipo].forEach(k => base[k] = nid);
    arr.push({ id: nid, titolo: (e.titolo ? e.titolo + " " : "") + "(copia)", v, base, ts: Date.now() });
    ctx.cambiato = true; if (window.scheduleHistorySave) scheduleHistorySave(); disegnaElenco(tipo);
  }
  function elimina(tipo, eid){
    const r = lead(), arr = lista(r, tipo), i = arr.findIndex(x => x.id === eid); if (i < 0) return;
    arr.splice(i, 1); if (!arr.length) delete r.moduli[tipo];
    ctx.cambiato = true; if (window.scheduleHistorySave) scheduleHistorySave();
    if (arr.length) disegnaElenco(tipo); else disegnaScelta();
  }
  function chiudi(){
    const cambiato = ctx && ctx.cambiato; ctx = null;
    const o = document.getElementById("mod-ov"); if (o) o.remove();
    if (cambiato && typeof render === "function") render();   // aggiorna i quadratini nell'elenco
  }

  // ---- Cartella dei PDF: la console ricorda SOLO quale cartella è (il puntatore, pochi byte). I PDF non restano mai nel programma.
  function idbApri(){ return new Promise((ok, ko) => { const r = indexedDB.open("lead-rework-moduli", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  async function kvGet(k){ const db = await idbApri(); return new Promise((ok, ko) => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); }); }
  async function kvSet(k, v){ const db = await idbApri(); return new Promise((ok, ko) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = () => ok(); t.onerror = () => ko(t.error); }); }
  async function kvDel(k){ const db = await idbApri(); return new Promise((ok, ko) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").delete(k); t.oncomplete = () => ok(); t.onerror = () => ko(t.error); }); }
  async function scegliCartella(){
    const h = await window.showDirectoryPicker({ id: "moduli-yesmobility", mode: "readwrite", startIn: "documents" });
    try { await kvSet("cartella", h); } catch (e) {}
    return h;
  }
  // Restituisce la cartella pronta all'uso, oppure null (API assente, scelta annullata, accesso negato).
  async function cartellaPronta(){
    if (!window.showDirectoryPicker) return null;
    try {
      let h = null; try { h = await kvGet("cartella"); } catch (e) {}
      if (h) {
        let p = await h.queryPermission({ mode: "readwrite" });
        if (p !== "granted") p = await h.requestPermission({ mode: "readwrite" });
        if (p === "granted") return h;
      }
      return await scegliCartella();
    } catch (e) { return null; }   // annullato o negato: si scarica nel modo normale
  }
  async function mostraCartella(){
    const el = document.getElementById("mod-dir"); if (!el) return;
    let h = null; try { h = window.showDirectoryPicker ? await kvGet("cartella") : null; } catch (e) {}
    el.textContent = !window.showDirectoryPicker ? "Cartella PDF: non disponibile in questo browser (il PDF va nei Download)" : (h ? "Cartella PDF: " + h.name : "Cartella PDF: non scelta (te la chiedo al primo PDF)");
  }

  async function scarica(){
    const cartella = await cartellaPronta();   // per prima cosa: la scelta della cartella richiede il clic appena fatto
    leggiForm(); salvaNelLead(); segnaSalvato();
    try {
      msg("Preparo il PDF…");
      await loadScriptOnce("PDFLib", "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js", "pdflib");
      if (!window.MODULI_PDF) await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "moduli/moduli-modelli.js"; s.onload = ok; s.onerror = () => ko(new Error("File moduli-modelli.js non trovato")); document.head.appendChild(s); });
      const bin = atob(window.MODULI_PDF[ctx.tipo]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const pdf = await PDFLib.PDFDocument.load(bytes), form = pdf.getForm();
      const mancanti = [];
      Object.keys(ctx.valori).forEach(k => {
        const v = ctx.valori[k]; let f;
        try { f = form.getField(k); } catch (e) { mancanti.push(k); return; }
        if (f instanceof PDFLib.PDFCheckBox) { v ? f.check() : f.uncheck(); }
        else {
          if (f.getMaxLength && f.getMaxLength() !== undefined) f.setMaxLength(undefined);   // il PDF limita molti campi a 100 caratteri: qui non serve
          f.setText(String(v || ""));
        }
      });
      const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
      form.updateFieldAppearances(font);
      const out = await pdf.save();
      const nome = String((lead().dati_lead_input || {}).nome || "cliente").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
      const nomeFile = MODULI[ctx.tipo].file + "_" + ctx.eid + "_" + (nome || "cliente") + ".pdf";
      let dove = "";
      if (cartella) {
        try { const fh = await cartella.getFileHandle(nomeFile, { create: true }); const w = await fh.createWritable(); await w.write(out); await w.close(); dove = cartella.name; }
        catch (e) { try { await kvDel("cartella"); } catch (x) {} }   // cartella sparita o senza permesso: la dimentico e scarico nel modo normale
      }
      if (!dove) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "application/pdf" })); a.download = nomeFile; document.body.appendChild(a); a.click(); a.remove(); }
      mostraCartella();
      msg("✓ Salvato. " + (dove ? "PDF salvato nella cartella «" + dove + "»: " + nomeFile : "PDF scaricato nei Download (cartella non scelta o non disponibile).") + (mancanti.length ? " Campi non trovati nel modulo: " + mancanti.join(", ") : ""), mancanti.length > 0);
    } catch (e) { msg("Errore: " + e.message, true); }
  }

  window.apriModuli = function(id, tipo){
    if (typeof state === "undefined" || !state.leadsHistory[id]) return;
    css(); chiudi();
    const ov = document.createElement("div"); ov.id = "mod-ov"; ov.innerHTML = '<div id="mod-box"></div>';
    document.body.appendChild(ov);
    ctx = { id, tipo: null, valori: {} };
    ov.addEventListener("mousedown", e => { if (e.target === ov) chiudi(); });
    ov.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const a = b.dataset.a, n = b.dataset.n;
      if (b.dataset.t) vaiTipo(b.dataset.t);
      else if (a === "chiudi") chiudi();
      else if (a === "scelta") disegnaScelta();
      else if (a === "elenco") disegnaElenco(ctx.tipo);
      else if (a === "nuovo") apriNuovo(ctx.tipo);
      else if (a === "apri") apriEsistente(ctx.tipo, n);
      else if (a === "duplica") duplica(ctx.tipo, n);
      else if (a === "elimina") { b.dataset.a = "elimina-ok"; b.textContent = "Sicuro? Elimina"; }
      else if (a === "elimina-ok") elimina(ctx.tipo, n);
      else if (a === "scarica") scarica();
      else if (a === "cartella") { if (window.showDirectoryPicker) scegliCartella().then(() => { mostraCartella(); msg("✓ Cartella scelta: i prossimi PDF andranno lì."); }).catch(() => {}); else msg("Questo browser non permette di scegliere la cartella: il PDF va nei Download.", true); }
      else if (a === "aggiorna" || a === "ignora") {
        leggiForm();
        calcolaDiff().forEach(x => { if (a === "aggiorna" && !x.toccato) ctx.valori[x.k] = x.nuovo || ""; ctx.base[x.k] = x.nuovo; });
        salvaNelLead(); disegna(); segnaSalvato();
      }
      else if (a === "rileggi") { ctx.valori = valoriDaLead(ctx.tipo, ctx.eid); ctx.base = Object.assign({}, ctx.valori); if (!ctx.nuovo) salvaNelLead(); ctx.cambiato = true; disegna(); }
    });
    ov.addEventListener("change", e => {   // gruppi esclusivi: una sola casella per gruppo
      const el = e.target; if (el.dataset && el.dataset.g && el.checked) ov.querySelectorAll('[data-g="' + el.dataset.g + '"]').forEach(o => { if (o !== el) o.checked = false; });
      if (el.dataset && el.dataset.k && el.type === "checkbox") { leggiForm(); salvaNelLead(); segnaSalvato(); }
    });
    ov.addEventListener("input", e => {    // salvataggio automatico a ogni modifica
      const el = e.target; if (!el.dataset) return;
      if (el.dataset.titolo) { ctx.titolo = el.value; leggiForm(); salvaNelLead(); segnaSalvato(); return; }
      if (!el.dataset.k || el.type === "checkbox") return;
      if (ctx.base) el.classList.toggle("mod", String(el.value || "") !== String(ctx.base[el.dataset.k] || ""));
      leggiForm(); salvaNelLead(); segnaSalvato();
    });
    if (tipo && MODULI[tipo]) vaiTipo(tipo); else disegnaScelta();
  };
  window.__moduliSchema = MODULI; window.__spezzaNome = spezzaNome;
})();
