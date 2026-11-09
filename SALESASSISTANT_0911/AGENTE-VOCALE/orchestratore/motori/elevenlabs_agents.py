"""Motore ElevenLabs Agents (SPECIFICA.md D7). NON provato qui: serve account, agent_id e l'audio vero (fase 0, T5).

Cosa serve nell'account ElevenLabs (una sola volta, vedi COME-USARE.md):
  - un agente (agent_id) con lingua italiana e una voce italiana;
  - in «Security» attivi gli override di prompt e primo messaggio;
  - 5 «client tools» con questi nomi esatti: score_lead, request_handoff, book_appointment, create_callback, end_call
    (tipo «client», attesa della risposta attiva).
La chiave API sta nella variabile d'ambiente indicata in config (mai nei file).
"""
import os
import threading


class MotoreElevenLabs:
    def __init__(self, cfg):
        self.cfg = cfg
        self.conv = None

    def avvia(self, job, prompt, primo_messaggio, router, strumenti, on_testo, on_fine):
        from elevenlabs.client import ElevenLabs
        from elevenlabs.conversational_ai.conversation import (
            AudioInterface, Conversation, ClientTools, ConversationInitiationData)

        agent_id = self.cfg.get("agent_id") or os.environ.get("ELEVENLABS_AGENT_ID", "")
        api_key = os.environ.get(self.cfg.get("api_key_env", "ELEVENLABS_API_KEY"), "")
        if not agent_id or not api_key:
            raise RuntimeError("ElevenLabs: mancano agent_id (config) o la chiave nella variabile d'ambiente")

        class InterfacciaTelefono(AudioInterface):
            """Collega l'AI al router: voce del cliente dentro, voce dell'AI fuori."""
            def start(self, input_callback):
                router.ai_sink = input_callback

            def stop(self):
                router.ai_sink = None

            def output(self, audio):
                router.parla_al_telefono(audio)

            def interrupt(self):
                router.interrompi()

        tools = ClientTools()
        for nome, fn in strumenti.items():
            tools.register(nome, (lambda f: (lambda params: f(**{k: v for k, v in params.items() if k != "tool_call_id"})))(fn))

        override = {"agent": {"prompt": {"prompt": prompt}, "first_message": primo_messaggio, "language": "it"}}
        dati = ConversationInitiationData(
            conversation_config_override=override,
            dynamic_variables={"nome": job.get("contact_name", ""), "oggi": job.get("today", "")})

        self.conv = Conversation(
            ElevenLabs(api_key=api_key), agent_id, requires_auth=True,
            audio_interface=InterfacciaTelefono(), client_tools=tools, config=dati,
            callback_agent_response=lambda t: on_testo("agente", t),
            callback_user_transcript=lambda t: on_testo("cliente", t))
        self.conv.start_session()
        conv = self.conv
        threading.Thread(target=lambda: (conv.wait_for_session_end(), on_fine()), daemon=True).start()

    def ferma(self):
        if self.conv:
            try:
                self.conv.end_session()
            except Exception:
                pass
            self.conv = None
