# RELAUNCH: come si pubblica una modifica

## Fatti da non dimenticare
- L'app è una webapp (un solo file, `index.html`) pubblicata con **GitHub Pages** da un repository **diverso** da questo:
  - Indirizzo: https://davidvannini-cyber.github.io/RE-LAUNCH-MMNDS/
  - Repository che la pubblica: `davidvannini-cyber/RE-LAUNCH-MMNDS`, branch `main`, file `index.html` nella radice.
- Unire una PR in `davidvannini-cyber/code` **non cambia l'app**. Cambia l'app solo ciò che arriva su `main` di `RE-LAUNCH-MMNDS`.
- La **fonte di verità** è `index.html` di `RE-LAUNCH-MMNDS` (il backup automatico dal MacBook Air può aggiornarlo). La copia in `RELAUNCH/index.html` di questo repository è solo una copia di lavoro: prima di modificarla va riallineata a quella pubblicata.
- Nello stesso repository c'è anche `relaunch-mmnds-backup.json` (backup dei dati): non va toccato.

## Procedura (la fa Claude, in quest'ordine, senza lasciare nulla a metà)
Regola d'oro: **a fine lavoro tutto è allineato**. Le due PR (app e `code`) si uniscono entrambe, e l'ultimo messaggio a David dice che non resta nulla da unire.

1. Aggiungere il repository alla sessione: `add_repo` con `davidvannini-cyber/RE-LAUNCH-MMNDS`, accesso `push`, poi clonarlo (shallow) in `/home/user/re-launch-mmnds` e registrarlo con `register_repo_root`.
2. Partire dall'`index.html` **attuale di main** di `RE-LAUNCH-MMNDS` (non dalla copia di questo repository). Fare la modifica lì.
3. Controllare la sintassi degli script:
   `node -e "const s=require('fs').readFileSync('index.html','utf8');[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(x=>new Function(x[1]))"`
4. Creare un branch (`claude/...`), commit, `git push -u origin <branch>`.
5. Aprire la PR verso `main` di `RE-LAUNCH-MMNDS` e **unirla** (squash).
6. Verificare in Actions che «pages build and deployment» finisca con successo.
7. Riallineare la copia: portare l'`index.html` pubblicato in `RELAUNCH/index.html` di questo repository.
8. Aggiungere la riga a `REGISTRO-SALVATAGGI.md` (data, commit di partenza, file modificati, `git checkout <commit>`).
9. Commit e push sul branch di lavoro di `code`, poi **unire anche quella PR** su `main` di `code`. Se la PR non esiste ancora, aprirla.
10. Verificare che non restino PR aperte né branch non unite per questo lavoro.
11. Scrivere a David: «Fatto, tutto allineato» (app pubblicata, copia e procedure su main).

## Cosa deve fare David
- Aspettare 1-2 minuti dopo l'unione.
- Aprire l'indirizzo con **ricarica forzata** (Cmd/Ctrl+Shift+R), altrimenti il browser mostra la versione vecchia.

## Regole concordate
- Niente push diretto su `main`: sempre branch + PR, e la PR si unisce subito (autorizzato da David il 2026-10-12: «fai tutto tu»).
- Mai dire «ancora da unire»: o è unito, o si dice chiaramente cosa blocca.
- Mai force push.
- Mai sovrascrivere l'`index.html` pubblicato con la copia di questo repository senza prima confrontarli: la versione pubblicata può essere più recente.

## Assistente AI (cronologia)
- 2026-10-12: «Nessuna risposta ricevuta» nell'assistente AI. Corretta la lettura dello stream e il messaggio d'errore ora mostra il motivo di stop (PR `RE-LAUNCH-MMNDS#1`). Se torna, la riga tecnica tra parentesi indica la causa.
