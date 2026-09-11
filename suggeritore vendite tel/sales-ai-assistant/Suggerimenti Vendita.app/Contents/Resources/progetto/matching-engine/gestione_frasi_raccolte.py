"""
Gestione delle frasi raccolte durante le chiamate, per arricchire la libreria
script nel tempo (Decisione: "la libreria si arricchisce facendo le
chiamate").

Ogni frase FINALE del cliente, durante una chiamata reale, viene salvata da
server/server_suggerimenti.py in logs/frasi_raccolte.jsonl insieme all'esito
del matching (quale script è stato scelto, se nessuno). Questo modulo
permette di rivedere quelle frasi ed usarle per:
- aggiungere un nuovo esempio a uno script già esistente (lo rende più bravo
  a riconoscere quella situazione anche se detta in modo diverso)
- creare un nuovo script quando la situazione non era ancora coperta

Usato dall'app come processo a riga di comando con sotto-comandi, per tenere
la UI (dialoghi) separata dalla logica dati:

    python gestione_frasi_raccolte.py conta_pendenti
    python gestione_frasi_raccolte.py pendenti
    python gestione_frasi_raccolte.py testo_completo <id_frase>
    python gestione_frasi_raccolte.py ignora <id_frase>
    python gestione_frasi_raccolte.py elenco_script_brevi
    python gestione_frasi_raccolte.py aggiungi_a_script <id_frase> <id_script>
    python gestione_frasi_raccolte.py segna_creato_script <id_frase> <id_script>
"""

import json
import os
import sys

RADICE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PATH_LOG = os.path.join(RADICE, "logs", "frasi_raccolte.jsonl")
PATH_LIBRERIA = os.path.join(RADICE, "schema", "esempio-libreria-script.json")


# ---------- I/O log frasi ----------

def _carica_log():
    if not os.path.exists(PATH_LOG):
        return []
    voci = []
    with open(PATH_LOG, "r", encoding="utf-8") as f:
        for riga in f:
            riga = riga.strip()
            if riga:
                voci.append(json.loads(riga))
    return voci


def _salva_log(voci):
    os.makedirs(os.path.dirname(PATH_LOG), exist_ok=True)
    with open(PATH_LOG, "w", encoding="utf-8") as f:
        for voce in voci:
            f.write(json.dumps(voce, ensure_ascii=False) + "\n")


def _trova_e_aggiorna(id_frase, aggiornamento: dict):
    voci = _carica_log()
    trovata = False
    for voce in voci:
        if voce["id"] == id_frase:
            voce.update(aggiornamento)
            trovata = True
            break
    if trovata:
        _salva_log(voci)
    return trovata


# ---------- I/O libreria script ----------

def _carica_libreria():
    with open(PATH_LIBRERIA, "r", encoding="utf-8") as f:
        return json.load(f)


def _salva_libreria(libreria):
    with open(PATH_LIBRERIA, "w", encoding="utf-8") as f:
        json.dump(libreria, f, ensure_ascii=False, indent=2)


# ---------- sotto-comandi ----------

def comando_conta_pendenti():
    voci = _carica_log()
    pendenti = [v for v in voci if not v.get("revisionata", False)]
    print(len(pendenti))


def comando_pendenti():
    """Righe TSV: id, fase, script_scelto (o 'nessuno'), testo (troncato, senza a-capo/tab)."""
    voci = _carica_log()
    pendenti = [v for v in voci if not v.get("revisionata", False)]
    pendenti.sort(key=lambda v: v.get("timestamp", ""))
    for v in pendenti:
        testo = v["testo"].replace("\t", " ").replace("\n", " ").strip()
        if len(testo) > 300:
            testo = testo[:297] + "..."
        script_scelto = v.get("script_scelto") or "nessuno"
        print(f"{v['id']}\t{v.get('fase_rilevata', 'n/d')}\t{script_scelto}\t{testo}")


def comando_testo_completo(id_frase):
    voci = _carica_log()
    for v in voci:
        if v["id"] == id_frase:
            print(v["testo"])
            return
    print("")


def comando_ignora(id_frase):
    _trova_e_aggiorna(id_frase, {"revisionata": True, "esito": "ignorata"})
    print("ok")


def comando_elenco_script_brevi():
    libreria = _carica_libreria()
    for s in libreria:
        testo = s["testo_suggerimento"][:60].replace("\n", " ")
        print(f"{s['id']} | [{s['fase_chiamata']}] {testo}")


def comando_aggiungi_a_script(id_frase, id_script):
    voci = _carica_log()
    frase = next((v for v in voci if v["id"] == id_frase), None)
    if frase is None:
        print("errore:frase_non_trovata")
        return

    libreria = _carica_libreria()
    script = next((s for s in libreria if s["id"] == id_script), None)
    if script is None:
        print("errore:script_non_trovato")
        return

    testo_normalizzato = frase["testo"].strip().lower()
    duplicato = any(e.strip().lower() == testo_normalizzato for e in script.get("trigger_esempi", []))

    if duplicato:
        _trova_e_aggiorna(id_frase, {"revisionata": True, "esito": f"duplicato_in:{id_script}"})
        print("duplicato")
        return

    script.setdefault("trigger_esempi", []).append(frase["testo"].strip())
    _salva_libreria(libreria)
    _trova_e_aggiorna(id_frase, {"revisionata": True, "esito": f"aggiunta_a:{id_script}"})
    print("aggiunta")


def comando_segna_creato_script(id_frase, id_script):
    _trova_e_aggiorna(id_frase, {"revisionata": True, "esito": f"nuovo_script:{id_script}"})
    print("ok")


def main():
    if len(sys.argv) < 2:
        print("Uso: gestione_frasi_raccolte.py <comando> [argomenti]", file=sys.stderr)
        sys.exit(1)

    comando = sys.argv[1]
    argomenti = sys.argv[2:]

    mappa = {
        "conta_pendenti": (comando_conta_pendenti, 0),
        "pendenti": (comando_pendenti, 0),
        "testo_completo": (comando_testo_completo, 1),
        "ignora": (comando_ignora, 1),
        "elenco_script_brevi": (comando_elenco_script_brevi, 0),
        "aggiungi_a_script": (comando_aggiungi_a_script, 2),
        "segna_creato_script": (comando_segna_creato_script, 2),
    }

    if comando not in mappa:
        print(f"Comando sconosciuto: {comando}", file=sys.stderr)
        sys.exit(1)

    funzione, n_argomenti = mappa[comando]
    if len(argomenti) != n_argomenti:
        print(f"Il comando '{comando}' richiede {n_argomenti} argomento/i.", file=sys.stderr)
        sys.exit(1)

    funzione(*argomenti)


if __name__ == "__main__":
    main()
