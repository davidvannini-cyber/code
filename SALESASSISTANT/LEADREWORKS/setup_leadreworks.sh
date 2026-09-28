#!/bin/bash
# ==========================================================
# Setup progetto LEADREWORKS — YesMobility Lead Rework Console
# ==========================================================
set -e

PROJECT_ROOT="/progetti/LEADREWORKS"

echo "Creo la struttura del progetto in $PROJECT_ROOT ..."

mkdir -p "$PROJECT_ROOT"/{docs,src,src/data,src/components,assets}

# Sposta/copia il file di specifica se presente nella cartella corrente
if [ -f "YesMobility-LeadRework-Specifica.md" ]; then
  cp "YesMobility-LeadRework-Specifica.md" "$PROJECT_ROOT/docs/"
  echo "Specifica copiata in $PROJECT_ROOT/docs/"
else
  echo "ATTENZIONE: file YesMobility-LeadRework-Specifica.md non trovato nella cartella corrente."
  echo "Copialo manualmente in $PROJECT_ROOT/docs/ prima di iniziare lo sviluppo."
fi

# README di progetto
cat > "$PROJECT_ROOT/README.md" << 'EOF'
# LEADREWORKS — YesMobility Lead Rework Console

Webapp ad uso singolo operatore per generare script operativi
(telefono / WhatsApp / email) personalizzati per il rework dei lead
YesMobility, in base allo stato del lead nel funnel.

## Documentazione
Vedi `docs/YesMobility-LeadRework-Specifica.md` per la specifica
funzionale e tecnica completa: profilo azienda, stati del lead,
libreria script, flusso utente, struttura dati, capacità runtime.

## Struttura cartelle
- `docs/`        — specifica funzionale e materiale di riferimento
- `src/`         — codice sorgente della webapp
- `src/data/`    — libreria dei 25 script YesMobility (statici) e profilo azienda
- `src/components/` — componenti UI (se sviluppato in modo modulare)
- `assets/`      — eventuali risorse statiche (loghi, icone)

## Note importanti per lo sviluppo
- L'output finale deve essere un file HTML autonomo (self-contained),
  pensato per essere pubblicato come Claude Artifact.
- Usa le capacità runtime `db` (storage profilo azienda + storico lead)
  e `sample` (generazione script, eventuale interpretazione screenshot).
  Vedi la sezione 7 della specifica per i dettagli.
- Utente singolo: non serve gestione multi-utente o permessi complessi.
EOF

echo "README.md creato."
echo ""
echo "Struttura progetto creata con successo in: $PROJECT_ROOT"
find "$PROJECT_ROOT" -maxdepth 2
