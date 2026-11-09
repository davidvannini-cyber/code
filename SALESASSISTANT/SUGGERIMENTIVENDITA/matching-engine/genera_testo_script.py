"""
Genera bozze di testo_suggerimento (e alternative) per uno script, usando il
profilo azienda (prodotti, strategia commerciale, regole fisse) come
contesto per Claude.

Importante: questo modulo genera solo una PROPOSTA. L'operatore la rivede
sempre (e può modificarla liberamente) prima che venga salvata nella
libreria — vedi la funzione aggiungi_script() nell'app.

Uso:
    ANTHROPIC_API_KEY=... FASE=obiezioni CATEGORIA=obiezione_prezzo \
        FILE_FRASI=/path/a/frasi.txt \
        python genera_testo_script.py suggerimento

    ANTHROPIC_API_KEY=... FASE=... CATEGORIA=... FILE_FRASI=... \
        SUGGERIMENTO_PRINCIPALE="testo già scelto" \
        python genera_testo_script.py alternativa

Il profilo azienda è letto da schema/profilo-azienda.json (creato dall'app
con "Configura profilo azienda"). Se non esiste, genera comunque una
proposta generica, segnalandolo a chi legge il codice ma non bloccando
l'operatore.
"""

import json
import os
import sys

from anthropic import Anthropic

RADICE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PATH_PROFILO = os.path.join(RADICE, "schema", "profilo-azienda.json")

# Modello di qualità più curata: qui non c'è vincolo di latenza live come nel
# classificatore usato durante la chiamata, quindi si privilegia la scrittura.
MODELLO_GENERAZIONE = "claude-sonnet-5"


def carica_profilo():
    if not os.path.exists(PATH_PROFILO):
        return {}
    with open(PATH_PROFILO, encoding="utf-8") as f:
        return json.load(f)


def costruisci_system_prompt(profilo: dict) -> str:
    nome = profilo.get("nome_azienda", "").strip()
    descrizione = profilo.get("descrizione_prodotti", "").strip()
    strategia = profilo.get("strategia_commerciale", "").strip()
    regole = profilo.get("regole_fisse", "").strip()

    righe = [
        "Sei un copywriter esperto di script di vendita telefonica.",
        "Scrivi UN suggerimento breve (1-3 frasi), concreto e naturale da "
        "leggere a monitor durante una telefonata di vendita, in italiano.",
        "Rispondi SOLO con il testo del suggerimento: niente titoli, "
        "niente virgolette, niente spiegazioni, niente elenchi puntati.",
    ]
    if nome:
        righe.append(f"Azienda: {nome}.")
    if descrizione:
        righe.append(f"Prodotti/servizi e contesto azienda: {descrizione}")
    if strategia:
        righe.append(f"Strategia commerciale da seguire: {strategia}")
    if regole:
        righe.append(f"Regole fisse da rispettare sempre: {regole}")
    if not (nome or descrizione or strategia or regole):
        righe.append(
            "Non è stato fornito un profilo azienda: scrivi un suggerimento "
            "di buon senso commerciale, generico ma concreto."
        )
    return "\n".join(righe)


def leggi_frasi_esempio() -> list[str]:
    path = os.environ.get("FILE_FRASI")
    if not path or not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [riga.strip() for riga in f if riga.strip()]


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("suggerimento", "alternativa"):
        print("Uso: genera_testo_script.py suggerimento|alternativa", file=sys.stderr)
        sys.exit(1)

    modalita = sys.argv[1]
    profilo = carica_profilo()
    system = costruisci_system_prompt(profilo)

    fase = os.environ.get("FASE", "")
    categoria = os.environ.get("CATEGORIA", "")
    frasi = leggi_frasi_esempio()
    blocco_frasi = "\n".join(f"- {f}" for f in frasi) or "(nessuna frase di esempio fornita)"

    messaggio = (
        f"Fase della chiamata: {fase}\n"
        f"Situazione (categoria): {categoria}\n"
        f"Frasi che il cliente potrebbe dire in questa situazione:\n{blocco_frasi}\n\n"
    )

    if modalita == "suggerimento":
        messaggio += "Scrivi il suggerimento di risposta per l'operatore."
    else:
        principale = os.environ.get("SUGGERIMENTO_PRINCIPALE", "").strip()
        messaggio += (
            f'Il suggerimento principale già proposto è: "{principale}"\n'
            "Scrivi un'alternativa valida ma con un approccio diverso (es. più "
            "diretta, oppure che punta su un argomento diverso), da mostrare "
            "come seconda opzione."
        )

    client = Anthropic()
    risposta = client.messages.create(
        model=MODELLO_GENERAZIONE,
        max_tokens=200,
        system=system,
        messages=[{"role": "user", "content": messaggio}],
    )
    testo = risposta.content[0].text.strip()
    testo = testo.strip('"').strip()  # il modello a volte aggiunge virgolette comunque
    print(testo)


if __name__ == "__main__":
    main()
