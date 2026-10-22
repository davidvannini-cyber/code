# BG-VIDEOCAL — sfondo per videocall (Android)

App Android: fotocamera + ritaglio della persona (ML Kit Selfie Segmentation) + sfondo a scelta
(**sfocato**, **immagine** o **video** in loop). Pulsanti: Sfoca · Immagine · Video · Gira.

- Pacchetto `online.vannini.bgvideocal`, minSdk 24, CameraX 1.3.4, Java 17.
- Build: GitHub Actions «BG Videocal APK» → release `bg-videocal-latest`, file `bg-videocal.apk`.
  Link: https://github.com/davidvannini-cyber/code/releases/download/bg-videocal-latest/bg-videocal.apk
- Firma: per ora la chiave di prova di Android (nessun segreto nel repo, che è pubblico).
  Conseguenza: per aggiornare può servire disinstallare la versione precedente.

## Limiti noti
- **Mai compilata né provata** (nel sandbox non c'è l'Android SDK): la prima build su GitHub può fallire e va corretta dai log.
- Android **non permette** a un'app di diventare «webcam virtuale» per Zoom/Meet/Teams. Ora l'app mostra l'effetto;
  per usarla dentro una videocall serve un passo successivo (sostituire la fotocamera di WhatsApp: da decidere, vedi la prova con BlackBox).
- Non registra ancora video.
