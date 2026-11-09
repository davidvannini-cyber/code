# Fase 0 — prove da fare prima di usare l'agente sui lead veri

Le fai tu, con telefono, cavo e cuffie. Per ogni prova segna ✅ o ❌ e dimmi cosa succede: io sistemo.
Strumento: `orchestratore/prova_audio.py` (vedi `COME-USARE.md` per installarlo).

| # | Prova | Come | Passa se |
|---|---|---|---|
| **T1** | Audio col cavo | Chiama un collega con Lyber dal telefono (cavo inserito). Terminale: `prova_audio.py livelli 20` mentre il collega parla; poi `prova_audio.py tono 10` | La voce del collega fa salire la barra «telefono» (1000–8000); il collega sente il tono; nessun fruscio forte |
| **T2** | Eco | 5 chiamate a colleghi con `motore: simulato` e audio attivo (l'assistente finto non parla: usa `tono`) oppure col motore vero | Nessun eco o rimbombo |
| **T3** | Passaggio audio | Chiamata a un collega, `prova_audio.py ponte 30`: parli nelle cuffie | Il collega ti sente, tu senti lui, la chiamata non cade, pausa < 2 s |
| **T4** | Stato chiamata | App Rubrica 1.6 installata, permesso «Stato del telefono» dato. Premi AI su un lead di prova (tuo numero). Guarda il cruscotto: «eventi» | Compaiono `telefono: linea_occupata` e `libera`. Se NON compaiono, Lyber non li espone: va bene, si usa il rilevatore audio + pulsante «Ha risposto» |
| **T4b** | Rilevatore risposta | Stesso test, rispondi tu col tuo numero | Lo stato passa a «Ha risposto» da solo entro 1–2 secondi dalla tua voce, **non** al tono di libero |
| **T5** | Qualità italiano | 20 chiamate a parenti/colleghi con ElevenLabs (e, se vorrai, un'altra piattaforma) | Giudizio alla cieca su naturalezza e ritardo |
| **T6** | Costo reale | Guarda il consumo ElevenLabs e la tariffa Lyber dopo ~90 minuti | Costo/minuto in linea con la specifica (§11) |

Prima del test T5 ricorda: l'assistente si dichiara **assistente virtuale**; chi riceve la prova deve saperlo.
