# BLACKBOX-PROVA

Prova tecnica per BG-VIDEOCAL: una mini app mette WhatsApp (già installato) dentro il contenitore **BlackBox 2.1.0**
(Apache-2.0, https://github.com/FBlackBox/BlackBox; i sorgenti stanno nella release `blackbox-sorgenti`, non sono copiati qui)
e lo avvia. Serve solo a sapere se il contenitore funziona su Android 16.

- Costruzione: GitHub Actions «BlackBox prova» → release `blackbox-prova-latest`, file `blackbox-prova.apk`.
- Nota: WhatsApp è spesso fatto di più file (split APK); BlackBox ne installa solo uno, quindi può fallire.
- Licenza di BlackBox: `LICENSE-BlackBox-Apache-2.0`.
