"""Motori voce. Un motore ha due metodi:
    avvia(job, prompt, primo_messaggio, router, strumenti, on_testo, on_fine)   non bloccante
    ferma()                                                                      chiude la sessione AI subito
`strumenti` = {nome: funzione(**argomenti) -> testo}  (score_lead, request_handoff, book_appointment, create_callback, end_call)
`on_testo(chi, testo)` registra la trascrizione; `on_fine()` avvisa che la sessione AI è finita da sola.
"""


def crea_motore(cfg):
    nome = cfg.get("motore", "simulato")
    if nome == "simulato":
        from .simulato import MotoreSimulato
        return MotoreSimulato(cfg.get("simulato", {}))
    if nome == "elevenlabs":
        from .elevenlabs_agents import MotoreElevenLabs
        return MotoreElevenLabs(cfg.get("elevenlabs", {}))
    raise ValueError(f"Motore sconosciuto: {nome}")
