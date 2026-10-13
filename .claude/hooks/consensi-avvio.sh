#!/bin/bash
# Parte all'apertura di ogni nuova sessione (SessionStart, matcher "startup").
# Il testo stampato qui entra nel contesto di Claude all'avvio.
cat <<'EOF'
ISTRUZIONE OBBLIGATORIA DELL'UTENTE (David), PRIMA DI QUALSIASI ALTRA AZIONE:
Come PRIMA risposta della sessione (prima di leggere file, eseguire comandi o rispondere) fai queste
4 scelte IN QUESTO ORDINE con AskUserQuestion, UNA ALLA VOLTA.

1 - NUOVO O ESISTENTE (sempre la prima domanda)
   Opzioni: "Nuovo Progetto" / "Progetto Esistente".
   - Nuovo Progetto: chiedi il nome e crea la cartella del progetto.
   - Progetto Esistente: scegli il progetto tra quelli elencati sotto (dal più recente).

2 - CARTELLA DI LAVORO
   Elenca le sottocartelle del progetto + "Radice del progetto" + "Crea nuova cartella"
   (se nuova: chiedi il nome e creala).

3 - SICUREZZA (UNA SOLA domanda, Sì/No)
   Chiedi: "Autorizzi il passaggio dal branch claude/... a main?" (push fast-forward, mai force push)
   - SÌ: da ora in poi, SENZA CHIEDERE NULLA, sempre permesso: pubblicare (branch e main) a fine lavoro,
     creare Pull request, aggiungere la riga a REGISTRO-SALVATAGGI.md (data, commit di partenza, file
     modificati, come tornare indietro con git checkout <commit>). A fine lavoro scrivi SOLO: "Fai Sync".
   - NO: non pubblicare su main. Fai invece queste 4 domande Sì/No (una alla volta) e agisci solo secondo i "Sì":
       a. Confermi che posso pubblicare direttamente su main (push fast-forward, mai force push), senza fermarmi sul branch claude/...?
       b. Confermi che posso, a fine lavoro, pubblicare senza aspettare che tu lo chieda, poi scrivere: "Fatto, fai sync"?
       c. Confermi che posso creare Pull request, se servono, comunicando: "Fai sync"?
       d. Confermi che dopo ogni pubblicazione devo aggiungere una riga a REGISTRO-SALVATAGGI.md: data, commit di partenza, file modificati, come tornare indietro (git checkout <commit>)?
     Per ogni "No" non fare quell'azione e chiedi conferma caso per caso.

4 - PROMEMORIA /restore
   Subito dopo la domanda di sicurezza scrivi in chat:
   "Ricorda: con /restore vedi gli ultimi 20 salvataggi e puoi tornare a una versione precedente."
   Ripetilo anche a fine lavoro.

REGOLA PAGINAZIONE: AskUserQuestion ammette max 4 opzioni, quindi NON troncare gli elenchi.
Mostra TUTTI gli elementi a pagine di 3, con la 4ª opzione = "Altri (pagina successiva)" finché ne restano;
sull'ultima pagina la 4ª opzione = "Torna alla prima pagina".
Dopo le scelte, lavora SOLO dentro la cartella scelta.
Se AskUserQuestion non è disponibile, scrivi le domande in chat e attendi la risposta.
EOF

# --- Elenchi progetto / cartella / stato (calcolati al momento dell'avvio) ---
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo
echo "ELENCHI ATTUALI DEL REPOSITORY (da usare nelle scelte 1 e 2)."
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
