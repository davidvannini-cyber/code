SERVIZIO DATI DEI LEAD — Lead Rework Console
=============================================
Aggiornato: 22 ottobre 2026 (versione "dati-v2")

COSA È
------
Questa cartella (DATI-LEAD) contiene i tuoi lead. Non stanno più dentro Chrome:
la Lead Rework Console li legge da qui quando si apre e li riscrive qui a ogni
modifica. Aprendo la Console in qualsiasi profilo di Chrome si vedono quindi
sempre gli stessi lead.

A scrivere in questa cartella è un piccolo programma ("servizio") che parte da
solo quando accendi il Mac. Ascolta solo su questo computer (127.0.0.1, porta 8769):
non è raggiungibile da altri computer.

COSA C'È DENTRO
---------------
  leads.json
      L'archivio vero. Non modificarlo a mano e non spostarlo.

  copie/leads-AAAA-MM-GG.json
      Una copia per ogni giorno (l'ultima versione di quel giorno).
      Si tengono gli ultimi 30 giorni.

  copie/ore/leads-AAAA-MM-GG_HH.json
      Una copia per ogni ora (l'ultima versione di quell'ora, HH = ora 00-23).
      Si tengono le ultime 48 ore. Serve per annullare un errore recente,
      per esempio un lead cancellato per sbaglio.

  copie/leads-ANOMALO-AAAA-MM-GG_HHMMSS.json
      Compare solo se il numero dei lead è calato di colpo (sotto la metà di
      quelli che c'erano, con almeno 5 lead). In quel caso leads.json NON viene
      sostituito: la versione sospetta viene messa da parte qui.

  copia-esterna.txt   (facoltativo, non c'è di solito)
      Se lo crei, nella prima riga scrivi una cartella (per esempio su un disco
      esterno o in una cartella sincronizzata): il servizio ci copia anche lì
      "leads-ultimo.json" e una copia al giorno (30 giorni), al massimo una volta
      al minuto. Senza questo file, e con iCloud Drive spento, la copia esterna
      non c'è e non dà nessun avviso.

  README.txt
      Questo file (viene rimesso a posto a ogni installazione).

QUANDO SI SALVA
---------------
Ogni modifica ai lead nella Console (spunte, nuovo lead, note, eliminazione...) viene
inviata al servizio dopo circa 1 secondo. Il servizio scrive prima su un file
temporaneo e poi lo sostituisce, così un blocco a metà non rovina l'archivio.

PROTEZIONI
----------
* Un archivio VUOTO non sovrascrive mai nulla.
* Un calo improvviso dei lead non sostituisce l'archivio (vedi "ANOMALO").
* Numero di versione: se due finestre della Console sono aperte insieme e una
  salva, l'altra non può sovrascrivere i dati e ti avvisa di ricaricare.
* Se il servizio è spento quando apri la Console: schermata rossa. Puoi aprirla solo
  in "sola lettura": in quel caso non viene salvato nulla.

COME CONTROLLARE CHE FUNZIONI
-----------------------------
In alto a destra nella Console compare, in verde:
  "✓ Dati nella cartella ~/DATI-LEAD: salvati gg/mm, hh:mm (N lead)"
Se è rosso, la Console dice il motivo. Dal Terminale puoi anche vedere lo stato con:
  curl http://127.0.0.1:8769/stato

COME RIPRISTINARE LEAD DA UNA COPIA
-----------------------------------
1. Apri la Console -> scheda "Storico Lead".
2. Nella riga "Backup" clicca "Ripristina".
3. Scegli un file di questa cartella, per esempio
   copie/ore/leads-2026-10-22_11.json  (oppure uno di copie/ del giorno che ti serve).
4. L'operazione AGGIUNGE i lead mancanti e non cancella nulla. Se un lead esiste già,
   la Console ti chiede se vuoi sostituirlo con la versione della copia.
I file di questa cartella hanno lo stesso formato del pulsante "Scarica" della Console.

LIMITI (da sapere)
------------------
* Queste copie stanno sullo stesso Mac: proteggono da Chrome, dai profili e dagli
  errori, NON da un guasto del disco o dalla perdita del computer. Ogni tanto copia
  l'intera cartella DATI-LEAD su una chiavetta, un altro computer o un servizio cloud.
* Chiave AI e impostazioni della Console restano dentro Chrome, non qui.
* Se spegni il servizio la Console non può salvare nei lead (apre solo in lettura).

INSTALLAZIONE, AGGIORNAMENTO, RIMOZIONE
---------------------------------------
Nella cartella del progetto: SALESASSISTANT/LEADREWORKS/backup-servizio
  "Installa Backup Lead.command"    doppio clic: installa o aggiorna (non cancella dati)
  "Disinstalla Backup Lead.command" doppio clic: toglie il servizio (i dati restano qui)
Il programma installato sta in: ~/Library/Application Support/LeadReworkBackup/
Eventuali errori: ~/Library/Application Support/LeadReworkBackup/errori.log
Parte da solo ad ogni accensione del Mac (agente "it.yesmobility.leadbackup").
