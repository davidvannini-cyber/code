# YesMobility — Lead Rework Console
## Documento di specifica funzionale e tecnica v1.0

---

## 1. Obiettivo del sistema

Una webapp (artifact pubblicato Claude) ad uso di un singolo operatore che, dato un lead in un certo stato del funnel, genera automaticamente gli script operativi (telefono / WhatsApp / email) pronti all'uso, personalizzati sui dati del lead e coerenti con l'identità e le procedure di YesMobility.

**Utente**: singolo (no multi-utente, no permessi differenziati).

---

## 2. Profilo Azienda (dati fissi, inseriti una volta)

Questi dati vengono salvati in `db` e riutilizzati automaticamente ad ogni generazione, senza che l'utente debba reinserirli.

```json
{
  "nome_azienda": "YesMobility",
  "nome_operatore": "David",
  "ruolo_percepito_dal_cliente": "Servizio di selezione e messa in contatto con l'installatore locale certificato (MAI usare la parola 'broker' o 'intermediario' con il cliente)",
  "settore": "Montascale, pedane, elevatori",
  "produttori_partner": ["Access", "Handicare", "AreaLifting", "Albatross", "PVE"],
  "partner_installazione_default": "Facile Salire",
  "value_proposition": [
    "Preventivo telefonico in 2 minuti",
    "Confronto preventivo esistente con verifica di fattibilità e prezzo",
    "Prezzo migliore grazie ai volumi gestiti con i produttori"
  ],
  "tono_di_voce": "Consulenziale, cordiale, mai aggressivo. Linguaggio funzionale, mai la parola 'broker'.",
  "regole_critiche_compliance": [
    "Non rivelare mai di sapere che il cliente è già stato visitato da Facile Salire o che si possiede già il suo preventivo, per motivi di privacy: bisogna farlo emergere dal cliente, mai anticiparlo",
    "Non dichiarare mai 'non lo sappiamo' quando in realtà si sa: semplicemente non si anticipa l'informazione",
    "Il ruolo di YesMobility va sempre descritto in modo funzionale, mai come 'broker'"
  ],
  "placeholder_standard": ["[Nome]", "[Prodotto]", "[Prezzo]", "[Zona]", "[Data]", "[Orario]", "[Indirizzo]", "[tempistica]"],
  "prodotti_selezionabili": ["Montascale", "Pedana", "Elevatore"]
}
```

Questo blocco JSON è ciò che la pagina invierà come contesto fisso ad ogni chiamata `sample()`, insieme ai 25 script originali (vedi sezione 4) usati come riferimento stilistico e di contenuto.

---

## 3. Stati del Lead e Canali di Output

L'utente seleziona manualmente lo stato del lead (nessuna classificazione automatica richiesta). In base allo stato, il sistema propone i canali pertinenti — ma l'utente può comunque generare canali extra se lo desidera.

| # | Stato Lead | Canali di default | Script di riferimento | Note tono |
|---|---|---|---|---|
| 1 | Nuovo lead da portale (primo contatto) | Telefono | Script 01 | Presentazione standard, raccolta dati tecnici |
| 2 | Lead freddo / secondo preventivo (Match4Markets) | Telefono | Script 02 | Capire a che punto è, senza pressione |
| 3 | Cliente già visitato da Facile Salire (offerta esistente) | Telefono + Email (se interessato) | Script 03, 21 | MAI anticipare di saperlo; far confermare al cliente |
| 4 | Trattativa persa — recupero | Telefono + Email | Script 04, 24 | Nuova proposta migliorativa, leva prezzo |
| 5 | Contatto non valido — ultimo richiamo | Telefono | Script 06 | Un solo tentativo, leva prezzo basso, poi chiusura definitiva |
| 6 | Cliente interessato — organizzare sopralluogo | Telefono + WhatsApp (conferma) + WhatsApp (reminder) | Script 05, 19, 20 | Sopralluogo fatto da Facile Salire, non da YesMobility |
| 7 | Cliente irraggiungibile | Telefono (segreteria) + WhatsApp (promemoria soft) | Script 11, 17 | Dopo 1-2 tentativi senza risposta |
| 8 | Cliente accetta — chiusura vendita | Telefono + Email conferma | Script 07, 25 | Spiegare passaggio a Facile Salire per contratto |
| 9 | Post-sopralluogo non chiuso — recupero | Telefono | Script 14 | Solo se Facile Salire non ha chiuso da sola |
| 10 | Budget limitato — proposta alternativa | Telefono | Script 15 | Due opzioni di prezzo |

**Obiezioni trasversali** (da richiamare quando pertinenti, indipendentemente dallo stato): prezzo troppo alto (10), tempi lunghi (13), scetticismo sul modello (09), vuole pensarci (08), familiare/caregiver (12) — questi vanno passati come riferimento aggiuntivo nel prompt, selezionabili come "toggle" opzionali dall'utente.

---

## 4. Libreria Script di Riferimento

I 25 script originali (allegato `SCRIPT_YesMobility.pdf`) vanno inclusi **integralmente** nel contesto inviato a `sample()` come esempi di stile/contenuto/struttura. Il modello non deve inventare script da zero, ma **adattare quelli esistenti** ai dati specifici del lead corrente, mantenendo tono e struttura.

Consiglio tecnico: salvare i 25 script come testo strutturato (JSON o Markdown) in un file statico dentro il codice della webapp (non serve `db`, sono contenuto fisso), così da non dover ricaricarli da PDF ogni volta.

---

## 5. Flusso Utente (User Journey)

1. **Setup iniziale** (una tantum): l'utente compila il form del Profilo Azienda → salvato in `db`
2. **Nuova sessione lead**:
   - Inserimento dati lead: form testuale (nome cliente, **prodotto — menu a tendina: Montascale/Pedana/Elevatore**, zona, note, storico) + eventuale upload screenshot (interpretato via `sample` con immagini, se disponibile) + eventuale upload Excel (letto client-side). Il nome dell'operatore è fisso (preso dal profilo azienda) e non va reinserito ad ogni lead.
   - Selezione manuale dello **stato del lead** dal menu a tendina (sezione 3)
   - Il sistema propone automaticamente i canali di default per quello stato; l'utente può aggiungere/rimuovere canali
   - Toggle opzionali per obiezioni trasversali pertinenti
3. **Generazione**: un'unica chiamata `sample()` che riceve: profilo azienda + script di riferimento + dati lead + stato selezionato + canali richiesti + obiezioni toggle → restituisce script generati per ciascun canale richiesto (JSON strutturato: `{telefono: "...", whatsapp: "...", email: {oggetto: "...", corpo: "..."}}`)
4. **Editing**: l'utente può modificare liberamente il testo generato in campi editabili prima di considerarlo definitivo
5. **Salvataggio storico**: al termine, il lead lavorato (dati + stato + script finali, eventualmente modificati) viene salvato in `db` con timestamp
6. **Consultazione storico**: pannello separato con elenco lead lavorati, filtrabile per stato/data, riapribile in sola lettura o per essere duplicato come base di un nuovo lead

---

## 6. Struttura Dati (`db`)

```
company/profile          → documento unico col profilo azienda (sezione 2)
leads/{leadId}            → {
                               data_creazione, stato_lead, canali_generati,
                               dati_lead_input: {nome, prodotto, zona, note, storico, prezzo_esistente, motivazione_rifiuto},
                               script_generati: {telefono, whatsapp, email},
                               script_modificati_manualmente: bool,
                               obiezioni_toggle: [...]
                             }
```

---

## 7. Capacità Runtime Necessarie (Claude Artifact)

- **`db`**: storage profilo azienda + storico lead (persistente, singolo utente quindi non serve gestione `room`/multi-editor)
- **`sample`**: generazione script (testo) ed eventualmente interpretazione screenshot (`sample` con `images`, da verificare disponibilità con `sample.limits().images` a runtime)
- **`assets`**: solo se si vuole conservare gli screenshot caricati come riferimento nello storico (opzionale, non essenziale per MVP)
- Non servono: `room`, `mcp`, `permissions` esplicite, `downloads` (a meno che si voglia esportare lo storico)

---

## 8. Logica del Prompt per `sample()`

**Contesto fisso (sempre incluso)**:
- Profilo azienda (sezione 2)
- Libreria dei 25 script (sezione 4)
- Regole di compliance critiche (privacy su Facile Salire, mai dire "broker")

**Contesto variabile (per singola generazione)**:
- Stato del lead selezionato
- Dati specifici del lead (nome, prodotto, zona, storico, prezzo, motivazione)
- Canali richiesti
- Eventuali obiezioni da gestire (toggle)

**Output atteso**: JSON strutturato con uno script completo e pronto (placeholder già sostituiti dove possibile con i dati reali del lead) per ciascun canale richiesto.

---

## 9. Aspetti aperti / da decidere in fase di sviluppo

- Verificare a runtime se `sample.limits().images` è disponibile per l'interpretazione screenshot; in assenza, prevedere fallback con inserimento manuale del testo
- Valutare se serve un pulsante "rigenera" per ottenere una variante alternativa dello script senza perdere l'input del lead

---

*Documento preparato come base per lo sviluppo in Claude Code della webapp "Lead Rework Console" di YesMobility.*
