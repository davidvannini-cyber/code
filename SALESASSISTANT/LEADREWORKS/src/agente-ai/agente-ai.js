/* Agente vocale di richiamo lead — lato Console (SPECIFICA: SALESASSISTANT/AGENTE-VOCALE/SPECIFICA.md).
   - Pulsante «AI» nella finestra «Vedi» di un lead: window.agenteAiChiama(idLead).
   - Parla con l'orchestratore che gira sul Mac (http://localhost:8770), non con Internet.
   - Mostra una striscia con lo stato della chiamata, i tasti «Ci sono / Non posso» per il passaggio e «Termina».
   - A fine chiamata scrive l'esito nel lead: r.chiamate_ai (elenco) e una riga in «Note YM:».
   Dipende da console: state.leadsHistory, scheduleHistorySave, escapeHtml, LOCAL_PREFIX, getPhoneTopic, hmGrow. */
(function(){
  const URL_ORCH = "http://localhost:8770";
  const CHIAVE_TOKEN = () => LOCAL_PREFIX + "agente_token";
  const TIPI = { a_nuovo: "Nuovo, non ha risposto", b_visitato: "Visitato, senza firma", c_social: "Da Facebook/Google" };
  const STATI = {
    QUEUED: "In coda…", DIALING: "Sto chiamando…", RINGING: "Squilla…", ANSWERED: "Ha risposto", AI_TALKING: "L'assistente sta parlando",
    HANDOFF_REQUESTED: "Richiesta di passaggio", HANDOFF_WAITING: "Il cliente aspetta: rispondi!", HUMAN_TALKING: "Stai parlando tu col cliente",
    NO_ANSWER: "Nessuna risposta", VOICEMAIL: "Segreteria", COMPLETED_APPOINTMENT: "Appuntamento fissato", COMPLETED_HANDOFF: "Chiamata passata a te",
    COMPLETED_CALLBACK: "Richiamo fissato", COMPLETED_NOT_INTERESTED: "Non interessato", COMPLETED_NO_DECISION: "Nessuna decisione", FAILED_TECH: "Problema tecnico"
  };
  let sessione = null;   // {id, leadId, timer, finito}

  function token(chiedi){
    let t = ""; try { t = localStorage.getItem(CHIAVE_TOKEN()) || ""; } catch(e){}
    if (!t && chiedi){
      t = (prompt("Codice dell'agente vocale (lo scrive il programma sul Mac quando parte, riga «Codice per la Console»):") || "").trim();
      if (t) { try { localStorage.setItem(CHIAVE_TOKEN(), t); } catch(e){} }
    }
    return t;
  }
  async function orch(metodo, percorso, corpo){
    const t = token(false);
    const r = await fetch(URL_ORCH + percorso, { method: metodo, headers: { "Content-Type": "application/json", "X-YM-Token": t }, body: corpo ? JSON.stringify(corpo) : undefined });
    let j = {}; try { j = await r.json(); } catch(e){}
    if (r.status === 401){ try { localStorage.removeItem(CHIAVE_TOKEN()); } catch(e){} throw new Error("Codice non valido: riprova"); }
    if (!r.ok) throw new Error(j.errore || ("errore " + r.status));
    return j;
  }
  function tipoLead(d){
    if (d.lead_collector_id) return "c_social";
    if (String(d.data_appuntamento || "").trim()) return "b_visitato";
    return "a_nuovo";
  }
  function prezzoNumero(s){
    const n = parseInt(String(s || "").replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? null : n;
  }
  function costruisciJob(r, tipo){
    const d = r.dati_lead_input || {};
    const sg = r.script_generati || {};
    const tel = Object.entries(sg).find(([k, v]) => !/^email|^whatsapp/i.test(k) && typeof v === "string");
    return {
      attempt_id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
      lead_id: r.id, lead_type: tipo, phone: String(d.telefono1 || "").trim(), product: d.prodotto || "", zone: d.zona || "",
      existing_price_eur: prezzoNumero(d.prezzo_esistente), timeline: d.tempistica || "",
      analysis_and_strategy: d.analisi_strategia || "", notes: d.note || "", call_script: tel ? tel[1] : "",
      contact_name: d.nome || "", attempt_number: (r.chiamate_ai || []).length + 1, max_call_minutes: 8, handoff_threshold: 70,
      today: new Date().toISOString().slice(0, 10), now_local: new Date().toISOString(), ntfy_topic: getPhoneTopic()
    };
  }
  function conferma(r, tipoIniziale){
    return new Promise(resolve => {
      document.querySelectorAll(".agai-conf").forEach(e => e.remove());
      const d = r.dati_lead_input || {};
      const box = document.createElement("div");
      box.className = "agai-conf";
      box.style.cssText = "position:fixed;right:16px;top:44px;width:430px;max-width:calc(100vw - 32px);background:#fff;border:1px solid rgba(0,0,0,.15);border-left:4px solid #2563eb;border-radius:2px;box-shadow:0 8px 28px rgba(0,0,0,.25);padding:12px 14px;z-index:10000;font-family:inherit;";
      box.innerHTML = '<div style="font-size:14px;"><b>' + escapeHtml(d.nome || "(senza nome)") + "</b> · " + escapeHtml(d.telefono1 || "") + "</div>"
        + '<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:6px 0 4px;">Tipo di lead</div>'
        + '<select class="agai-tipo" style="width:100%;padding:6px;margin-bottom:8px;">' + Object.entries(TIPI).map(([k, v]) => '<option value="' + k + '"' + (k === tipoIniziale ? " selected" : "") + ">" + v + "</option>").join("") + "</select>"
        + '<div style="font-size:12px;color:#374151;margin-bottom:8px;">Il telefono chiama con Lyber, l\'assistente virtuale parla col cliente. Se il lead è caldo ti chiede di prendere la chiamata.</div>'
        + '<div style="display:flex;gap:6px;"><button data-a="si" style="flex:1.3;border:0;border-radius:2px;background:#2563eb;color:#fff;font:700 12px inherit;font-family:inherit;padding:10px 14px;cursor:pointer;">Chiama con AI</button>'
        + '<button data-a="" style="border:0;background:transparent;color:#6b7280;font:700 12px inherit;font-family:inherit;padding:10px 14px;cursor:pointer;">Annulla</button></div>';
      box.addEventListener("click", ev => {
        const b = ev.target.closest("button"); if (!b) return;
        const tipo = box.querySelector(".agai-tipo").value; box.remove(); resolve(b.dataset.a ? tipo : null);
      });
      document.body.appendChild(box);
    });
  }

  // ---- striscia di stato ----
  function striscia(){
    let el = document.getElementById("agai-strip");
    if (!el){
      el = document.createElement("div"); el.id = "agai-strip";
      el.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:12px;z-index:10001;width:520px;max-width:calc(100vw - 24px);background:#0b1220;color:#fff;border-radius:8px;padding:10px 12px;box-shadow:0 8px 28px rgba(0,0,0,.4);font:13px/1.35 system-ui,sans-serif;";
      document.body.appendChild(el);
    }
    return el;
  }
  function disegna(s){
    const el = striscia();
    const stato = STATI[s.stato] || s.stato;
    const passa = s.stato === "HANDOFF_WAITING";
    const attivo = s.attivo;
    const btn = (az, testo, col) => '<button data-az="' + az + '" style="border:0;border-radius:5px;padding:8px 12px;font:700 12px inherit;font-family:inherit;cursor:pointer;background:' + col + ';color:#fff;">' + testo + "</button>";
    el.style.background = passa ? "#92400e" : "#0b1220";
    el.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;"><b>Agente AI · ' + escapeHtml(s.nome || "") + '</b><span style="opacity:.7">' + (s.secondi || 0) + " s</span></div>"
      + '<div style="font-size:16px;font-weight:700;margin:4px 0;">' + escapeHtml(stato) + "</div>"
      + (passa ? '<div style="margin-bottom:6px;">' + escapeHtml((s.passaggio && (s.passaggio.summary || s.passaggio.reason)) || "") + "</div>" : "")
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + (passa ? btn("ci-sono", "Ci sono", "#0f9d8a") + btn("non-posso", "Non posso", "#b91c1c") : "")
      + (attivo && (s.stato === "DIALING" || s.stato === "RINGING") ? btn("risposto", "Ha risposto (a mano)", "#475569") + btn("segreteria", "Segreteria", "#475569") : "")
      + (attivo ? btn("termina", s.stato === "HUMAN_TALKING" ? "Chiudi chiamata" : "Termina", "#b91c1c") : btn("chiudi", "Chiudi", "#475569"))
      + "</div>";
  }
  document.addEventListener("click", async ev => {
    const b = ev.target.closest && ev.target.closest("#agai-strip button"); if (!b) return;
    const az = b.dataset.az;
    if (az === "chiudi"){ const e = document.getElementById("agai-strip"); if (e) e.remove(); return; }
    try { await orch("POST", "/" + az, { attempt_id: sessione && sessione.id }); } catch(e){ alert("Agente AI: " + e.message); }
  });

  // ---- esito nel lead ----
  function dataBreve(iso){
    const d = new Date(iso || Date.now());
    return d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function scriviEsito(leadId, e){
    const r = state.leadsHistory[leadId]; if (!r) return;
    r.chiamate_ai = r.chiamate_ai || [];
    if (r.chiamate_ai.some(x => x.attempt_id === e.attempt_id)) return;      // mai due volte lo stesso esito
    r.chiamate_ai.push(e);
    const riga = "[Agente AI " + dataBreve(e.fine) + "] " + (STATI[e.call_state] || e.call_state)
      + (e.appointment && e.appointment.set ? " — " + (e.appointment.type || "appuntamento") + " " + (e.appointment.datetime_local || "") : "")
      + (e.callback ? " — richiamo " + (e.callback.datetime_local || "") : "")
      + (e.score ? " — punteggio " + e.score : "") + (e.score_reasons && e.score_reasons.length ? " (" + e.score_reasons.join(", ") + ")" : "");
    r.note_ym = (r.note_ym ? String(r.note_ym).replace(/\s+$/, "") + "\n" : "") + riga;
    scheduleHistorySave();
    if (state.historyOpen === leadId){
      const ta = document.querySelector('textarea[oninput^="saveHistoryNoteYM(\'' + leadId + '\'"]');
      if (ta){ ta.value = r.note_ym; if (typeof hmGrow === "function") hmGrow(ta); }
    }
  }
  async function giro(){
    if (!sessione || sessione.finito) return;
    try {
      const s = await orch("GET", "/stato");
      if (s.attempt_id !== sessione.id) return;
      disegna(s);
      if (!s.attivo && s.esito){
        sessione.finito = true; clearInterval(sessione.timer);
        scriviEsito(sessione.leadId, s.esito);
      }
    } catch(e){
      sessione.errori = (sessione.errori || 0) + 1;
      if (sessione.errori === 5) disegna({ nome: "", stato: "Non sento più l'agente AI sul Mac", attivo: false });
    }
  }

  window.agenteAiChiama = async function(id){
    const r = state.leadsHistory[id]; if (!r) return;
    const d = r.dati_lead_input || {};
    if (!String(d.telefono1 || "").trim()){ alert("Questo lead non ha un numero di telefono."); return; }
    if (!getPhoneTopic()){ alert("Prima imposta il codice del telefono: tab Profilo Azienda → Invio al telefono."); return; }
    if (sessione && !sessione.finito){ alert("C'è già una chiamata dell'agente AI in corso."); return; }
    if (!token(true)) return;
    try { await orch("GET", "/ping"); } catch(e){
      alert("Non trovo l'agente AI sul Mac (" + URL_ORCH + "). Aprilo con «Agente Vocale.command» e riprova."); return;
    }
    const tipo = await conferma(r, tipoLead(d)); if (!tipo) return;
    const job = costruisciJob(r, tipo);
    try {
      const out = await orch("POST", "/chiamata", job);
      sessione = { id: out.attempt_id, leadId: r.id, finito: false, timer: null };
      disegna({ nome: d.nome, stato: "QUEUED", attivo: true, secondi: 0 });
      sessione.timer = setInterval(giro, 1200);
    } catch(e){ alert("Agente AI: " + e.message); }
  };
})();
