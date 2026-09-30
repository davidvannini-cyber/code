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
