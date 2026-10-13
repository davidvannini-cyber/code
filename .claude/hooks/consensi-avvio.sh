#!/bin/bash
# Parte all'apertura di ogni nuova sessione (SessionStart, matcher "startup").
# Il testo stampato qui entra nel contesto di Claude all'avvio.
cat <<'EOF'
ISTRUZIONE OBBLIGATORIA DELL'UTENTE (David), PRIMA DI QUALSIASI ALTRA AZIONE:
La procedura di avvio ha 3 FASI, da fare nell'ordine, con AskUserQuestion, UNA DOMANDA ALLA VOLTA,
come PRIMA risposta della sessione (prima di leggere file, eseguire comandi o rispondere).

FASE 1 - NUOVO O ESISTENTE (sempre la prima domanda)
   Chiedi: "Nuovo Progetto" oppure "Progetto Esistente".
   - Nuovo Progetto: chiedi il nome e crea la cartella.
   - Progetto Esistente: vai alla FASE 2.

FASE 2 - SELEZIONE CARTELLE (elenchi calcolati all'avvio, qui sotto)
   A) PROGETTO (solo se esistente): scegli tra i progetti, dal più recente.
   B) CARTELLA DI LAVORO: "Esistente o nuova?" -> se esistente, scegli tra le sottocartelle
      (+ "Radice del progetto"); se nuova, chiedi il nome e creala.
   C) RECUPERO STATO: scegli tra i .md di stato (+ "Parto da zero, nessun recupero").
      Se scelto un file: leggilo per intero e riassumi in 3-5 righe a che punto siamo.

FASE 3 - SICUREZZA (UNA sola domanda, Sì/No)
   Chiedi: "Autorizzi il passaggio dal branch claude/... a main (push fast-forward, mai force push)?"
   - Sì: puoi pubblicare su main.
   - No: lavora e pubblica solo sul branch; per main chiedi conferma caso per caso.
   TUTTO IL RESTO È SEMPRE PERMESSO, senza chiedere:
   - pubblicare sul branch a fine lavoro, poi scrivere: "Fatto, fai sync"
   - creare Pull request se servono, poi scrivere: "Fai sync"
   - dopo ogni pubblicazione aggiungere una riga a REGISTRO-SALVATAGGI.md
     (data, commit di partenza, file modificati, come tornare indietro con git checkout <commit>)

PROMEMORIA OBBLIGATORIO: subito dopo la FASE 3 scrivi in chat, in una riga:
   "Ricorda: con /restore vedi gli ultimi 20 salvataggi e puoi tornare a una versione precedente."
   Ripetilo anche a fine lavoro, insieme a "Fatto, fai sync".

REGOLA PAGINAZIONE: AskUserQuestion ammette max 4 opzioni, quindi NON troncare gli elenchi.
Mostra TUTTI gli elementi a pagine di 3, con la 4ª opzione = "Altri (pagina successiva)" finché ne restano;
sull'ultima pagina la 4ª opzione = "Torna alla prima pagina".
Dopo le 3 fasi, lavora SOLO dentro la cartella scelta.
Se AskUserQuestion non è disponibile, scrivi le domande in chat e attendi la risposta.
EOF

# --- Elenchi progetto / cartella / stato (calcolati al momento dell'avvio) ---
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo
echo "ELENCHI ATTUALI DEL REPOSITORY (da usare nella FASE 2)."
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
