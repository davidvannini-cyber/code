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
  function daLead(chiave, d){
    const [via, civ] = splitVia(d.indirizzo);
    const tel = String(d.telefono1||"").trim(), tel2 = String(d.telefono2||"").trim();
    const mobile = [tel, tel2].find(t => /^(\+?39)?\s*3\d{2}/.test(t.replace(/\s/g,""))) || "";
    const fisso = [tel, tel2].find(t => t && t !== mobile) || "";
    const base = {
      data: oggi(), luogo: d.zona || "", spettabile: d.nome || "", nome: d.nome || "",
      via, civico: civ, localita: d.zona || "", telefono: fisso, cellulare: mobile, email: d.email || "",
      prodotto: d.prodotto || "", note: d.note || ""
    };
    const p1 = { data: base.data, luogo: base.luogo, spettabile: base.nome, nome: base.nome, via, civico: civ, localita: base.localita,
      tel: fisso, cell: mobile, email: base.email, i_via: via, i_civico: civ, i_localita: base.localita, note: base.note };
    return chiave === "quotazione" ? base : (function(){ const o = {}; Object.keys(p1).forEach(k => o["p1_" + k] = p1[k]); o.p2_data_firma = ""; return o; })();
  }

  // ---- Stato e interfaccia
  let ctx = null;   // {id, tipo, valori}
  const E = s => window.escapeHtml ? window.escapeHtml(s) : String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function css(){
    if (document.getElementById("mod-css")) return;
    const s = document.createElement("style"); s.id = "mod-css";
    s.textContent = `
    #mod-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}
    #mod-box{background:#fff;color:#1a1f2e;border-radius:14px;width:min(900px,100%);box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden}
    #mod-box .mh{background:#17364f;color:#fff;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    #mod-box .mh h3{margin:0;font-size:16px;flex:1}
    #mod-box .mh button,#mod-box .mf button{border:0;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;font-size:13px}
    #mod-box .tab{background:#2d5a7b;color:#fff}#mod-box .tab.on{background:#fff;color:#17364f}
    #mod-box .mb{padding:12px 16px;max-height:70vh;overflow:auto}
    #mod-box fieldset{border:1px solid #cbd5e1;border-radius:10px;margin:0 0 12px;padding:8px 10px}
    #mod-box legend{font-weight:800;color:#17364f;font-size:13px;padding:0 6px}
    #mod-box .g{display:grid;grid-template-columns:repeat(12,1fr);gap:6px 8px}
    #mod-box label{font-size:11px;color:#475569;display:flex;flex-direction:column;gap:2px}
    #mod-box label.c{flex-direction:row;align-items:center;gap:6px;font-size:13px;color:#1a1f2e}
    #mod-box input[type=text],#mod-box textarea{font:inherit;font-size:13px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:6px;width:100%;box-sizing:border-box}
    #mod-box .mf{padding:10px 16px;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    #mod-box .pri{background:#0f766e;color:#fff}#mod-box .sec{background:#e2e8f0;color:#1a1f2e}
    #mod-box .sc{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #mod-box .sc button{border:2px solid #17364f;background:#f1f5f9;border-radius:12px;padding:22px 14px;cursor:pointer;display:flex;flex-direction:column;gap:6px;text-align:center;color:#17364f;font:inherit}
    #mod-box .sc button:hover{background:#17364f;color:#fff}#mod-box .sc b{font-size:17px}#mod-box .sc span{font-size:12px;opacity:.8}
    @media(max-width:560px){#mod-box .sc{grid-template-columns:1fr}}
    #mod-msg{font-size:12px;color:#475569;flex:1}`;
    document.head.appendChild(s);
  }

  function leggiForm(){
    const box = document.getElementById("mod-box"); if (!box) return;
    box.querySelectorAll("[data-k]").forEach(el => { ctx.valori[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; });
  }
  function salvaNelLead(){
    const r = state.leadsHistory[ctx.id]; if (!r) return;
    r.moduli = r.moduli || {}; r.moduli[ctx.tipo] = ctx.valori;
    if (window.scheduleHistorySave) scheduleHistorySave();
  }
  function disegnaScelta(){
    const r = state.leadsHistory[ctx.id], nome = ((r && r.dati_lead_input) || {}).nome || "";
    document.getElementById("mod-box").innerHTML = `
      <div class="mh"><h3>Moduli YesMobility${nome ? " · " + E(nome) : ""}</h3><button class="sec" data-a="chiudi">Chiudi</button></div>
      <div class="mb"><p style="margin:4px 0 14px;font-size:14px">Quale modulo vuoi compilare? I dati del lead vengono inseriti da soli.</p>
        <div class="sc">
          <button data-t="quotazione"><b>Quotazione Indicativa YM</b><span>2 pagine · prezzo indicativo, senza impegno</span></button>
          <button data-t="preventivo"><b>Preventivo YM</b><span>3 pagine · dati cliente, scheda tecnica, optional</span></button>
        </div></div>`;
  }
  function disegna(){
    const m = MODULI[ctx.tipo];
    const sez = m.sezioni.map(([t, campi]) => `<fieldset><legend>${E(t)}</legend><div class="g">` + campi.map(([k, lab, tipo, w, grp]) => {
      const v = ctx.valori[k];
      const st = `grid-column:span ${w}`;
      if (tipo === "c") return `<label class="c" style="${st}"><input type="checkbox" data-k="${k}" ${grp ? `data-g="${grp}"` : ""} ${v ? "checked" : ""}> ${E(lab)}</label>`;
      if (tipo === "a") return `<label style="${st}">${E(lab)}<textarea rows="3" data-k="${k}">${E(v || "")}</textarea></label>`;
      return `<label style="${st}">${E(lab)}<input type="text" data-k="${k}" value="${E(v || "")}"></label>`;
    }).join("") + `</div></fieldset>`).join("");
    document.getElementById("mod-box").innerHTML = `
      <div class="mh"><button class="sec" data-a="scelta">← Scelta modulo</button><h3>${m.titolo === "Preventivo" ? "Preventivo YM" : "Quotazione Indicativa YM"}</h3>
        <button class="sec" data-a="chiudi">Chiudi</button></div>
      <div class="mb">${sez}</div>
      <div class="mf"><span id="mod-msg">I dati del lead sono già inseriti; completa il resto e scarica.</span>
        <button class="sec" data-a="rileggi" title="Rimette i dati del lead nei campi (cancella quello che hai scritto in questo modulo)">Ricarica dal lead</button>
        <button class="pri" data-a="scarica">Scarica PDF</button></div>`;
  }
  function apriTipo(tipo){
    ctx.tipo = tipo;
    const r = state.leadsHistory[ctx.id];
    ctx.valori = Object.assign({}, daLead(tipo, (r && r.dati_lead_input) || {}), (r && r.moduli && r.moduli[tipo]) || {});
    disegna();
  }
  function msg(t, err){ const e = document.getElementById("mod-msg"); if (e){ e.textContent = t; e.style.color = err ? "#b91c1c" : "#475569"; } }
  function chiudi(){ if (ctx){ leggiForm(); salvaNelLead(); } ctx = null; const o = document.getElementById("mod-ov"); if (o) o.remove(); }

  async function scarica(){
    leggiForm(); salvaNelLead();
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
        else f.setText(String(v || ""));
      });
      const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
      form.updateFieldAppearances(font);
      const out = await pdf.save();
      const nome = String((state.leadsHistory[ctx.id].dati_lead_input || {}).nome || "cliente").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "application/pdf" }));
      a.download = MODULI[ctx.tipo].file + "_" + (nome || "cliente") + ".pdf"; document.body.appendChild(a); a.click(); a.remove();
      msg("PDF scaricato." + (mancanti.length ? " Campi non trovati nel modulo: " + mancanti.join(", ") : ""), mancanti.length > 0);
    } catch (e) { msg("Errore: " + e.message, true); }
  }

  window.apriModuli = function(id){
    if (typeof state === "undefined" || !state.leadsHistory[id]) return;
    css(); chiudi();
    const ov = document.createElement("div"); ov.id = "mod-ov"; ov.innerHTML = '<div id="mod-box"></div>';
    document.body.appendChild(ov);
    ctx = { id, tipo: null, valori: {} };
    ov.addEventListener("mousedown", e => { if (e.target === ov) chiudi(); });
    ov.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.t) apriTipo(b.dataset.t);
      else if (b.dataset.a === "chiudi") chiudi();
      else if (b.dataset.a === "scelta") { leggiForm(); salvaNelLead(); ctx.tipo = null; disegnaScelta(); }
      else if (b.dataset.a === "scarica") scarica();
      else if (b.dataset.a === "rileggi") { const r = state.leadsHistory[ctx.id]; if (r && r.moduli) delete r.moduli[ctx.tipo]; const t = ctx.tipo; ctx.tipo = null; apriTipo(t); }
    });
    ov.addEventListener("change", e => {   // gruppi esclusivi: una sola casella per gruppo
      const el = e.target; if (el.dataset && el.dataset.g && el.checked) ov.querySelectorAll('[data-g="' + el.dataset.g + '"]').forEach(o => { if (o !== el) o.checked = false; });
    });
    disegnaScelta();
  };
  window.__moduliSchema = MODULI;   // usato dalle prove
})();
