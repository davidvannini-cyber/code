#!/bin/bash
# Parte all'apertura di ogni nuova sessione (SessionStart, matcher "startup").
# Il testo stampato qui entra nel contesto di Claude all'avvio.
cat <<'EOF'
ISTRUZIONE OBBLIGATORIA DELL'UTENTE (David), PRIMA DI QUALSIASI ALTRA AZIONE:
Come PRIMA risposta di questa sessione, prima di leggere file, eseguire comandi o rispondere,
usa lo strumento AskUserQuestion con queste 4 domande, ciascuna con due sole opzioni: "Sì" e "No".

1. Confermi che posso pubblicare direttamente su main (push fast-forward, mai force push), senza fermarmi sul branch claude/...?
2. Confermi che posso, a fine lavoro, pubblicare senza aspettare che tu lo chieda, poi scrivere: "Fatto, fai sync"?
3. Confermi che posso creare Pull request, se servono, comunicando: "Fai sync"?
4. Confermi che dopo ogni pubblicazione devo aggiungere una riga a REGISTRO-SALVATAGGI.md: data, commit di partenza, file modificati, come tornare indietro (git checkout <commit>)?

Dopo le risposte agisci SOLO secondo i "Sì". Per ogni "No" non fare quell'azione e chiedi conferma caso per caso.
Se lo strumento AskUserQuestion non è disponibile, scrivi le 4 domande in chat e attendi la risposta prima di fare altro.
EOF

# --- Scelta progetto / cartella / stato (elenchi calcolati al momento dell'avvio) ---
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo
echo "DOPO le 4 domande di consenso, e sempre prima di iniziare a lavorare, fai altre 3 scelte"
echo "con AskUserQuestion, UNA ALLA VOLTA (ognuna dipende dalla precedente). Elenchi attuali del repository:"
echo
echo "PROGETTI (cartelle di primo livello), dal più recente:"
for d in $(git ls-tree -d --name-only HEAD 2>/dev/null | grep -v '^\.' | tr ' ' '?'); do
  d=${d//\?/ }
  t=$(git log -1 --format=%ct -- "$d" 2>/dev/null); echo "${t:-0}|$d"
done | sort -t'|' -k1,1nr | cut -d'|' -f2 | sed 's/^/  - /'
echo
echo "SOTTOCARTELLE e FILE DI STATO (.md) per ciascun progetto:"
git ls-tree -d --name-only HEAD 2>/dev/null | grep -v '^\.' | while IFS= read -r d; do
  echo "  [$d]"
  find "$d" -mindepth 1 -maxdepth 1 -type d -not -name '.*' -not -name node_modules -not -name dist | sed 's/^/    cartella: /'
  find "$d" -maxdepth 2 -type f -name '*.md' -not -path '*node_modules*' | sed 's/^/    stato:    /'
done
cat <<'EOF'

REGOLA PER OGNI SCELTA (A, B, C): AskUserQuestion ammette max 4 opzioni, quindi NON troncare gli elenchi.
Mostra TUTTI gli elementi a pagine di 3, con la 4ª opzione = "Altri (pagina successiva)" finché ne restano;
sull'ultima pagina la 4ª opzione = "Torna alla prima pagina". Prima dell'elenco chiedi sempre "Esistente o nuovo?".
SCELTA A) PROGETTO: "Esistente o nuovo?" -> se esistente, elenca TUTTI i progetti a pagine di 3 (dal più recente).
   Se nuovo: chiedi il nome e crea la cartella.
SCELTA B) CARTELLA DI LAVORO nel progetto scelto: "Esistente o nuova?" -> se esistente, TUTTE le sottocartelle
   a pagine di 3 (+ "Radice del progetto"). Se nuova: chiedi il nome e creala.
SCELTA C) RECUPERO STATO: elenca TUTTI i .md di stato del progetto/cartella a pagine di 3
   (+ "Parto da zero, nessun recupero"). Se scelto un file: leggilo per intero e riassumi in 3-5 righe a che punto siamo.
Dopo le 3 scelte, lavora SOLO dentro la cartella scelta. Se AskUserQuestion non è disponibile, scrivi le domande in chat.
EOF
