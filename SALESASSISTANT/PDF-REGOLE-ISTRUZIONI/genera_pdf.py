#!/usr/bin/env python3
"""
Rigenera i 4 PDF (REGOLE / ISTRUZIONI per LEADREWORKS e SALESASSISTANT)
leggendo i prompt direttamente dai sorgenti, così restano allineati al codice.

Uso:  python3 genera_pdf.py
Richiede: node, reportlab, font DejaVu (per i caratteri accentati e le emoji-free).
"""
import json
import os
import re
import subprocess
from datetime import date
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph,
                                SimpleDocTemplate, Spacer, Preformatted)

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.abspath(os.path.join(QUI, ".."))
HTML = os.path.join(RADICE, "LEADREWORKS", "src", "lead-rework-console.html")
MOTORE = os.path.join(RADICE, "SUGGERIMENTIVENDITA", "matching-engine", "motore_suggerimenti.py")
GENERA = os.path.join(RADICE, "SUGGERIMENTIVENDITA", "matching-engine", "genera_testo_script.py")
SCHEMA_CTX = os.path.join(RADICE, "SUGGERIMENTIVENDITA", "schema", "schema-contesto-sessione.json")

# ---------------------------------------------------------------- font
for nome, f in (("DV", "DejaVuSans.ttf"), ("DV-B", "DejaVuSans-Bold.ttf"), ("DVM", "DejaVuSansMono.ttf")):
    for base in ("/usr/share/fonts/truetype/dejavu/", "/usr/share/fonts/dejavu/"):
        if os.path.exists(base + f):
            pdfmetrics.registerFont(TTFont(nome, base + f))
            break

S = {
    "titolo": ParagraphStyle("t", fontName="DV-B", fontSize=20, leading=25, spaceAfter=4),
    "sotto": ParagraphStyle("s", fontName="DV", fontSize=9, leading=12, textColor=colors.HexColor("#555555"), spaceAfter=10),
    "h1": ParagraphStyle("h1", fontName="DV-B", fontSize=13, leading=17, spaceBefore=12, spaceAfter=5, textColor=colors.HexColor("#1a3a6b")),
    "h2": ParagraphStyle("h2", fontName="DV-B", fontSize=10.5, leading=14, spaceBefore=8, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="DV", fontSize=9, leading=12.5, alignment=TA_LEFT, spaceAfter=4),
    "nota": ParagraphStyle("n", fontName="DV", fontSize=8, leading=11, textColor=colors.HexColor("#666666"), spaceAfter=4),
    "regola": ParagraphStyle("r", fontName="DV", fontSize=9, leading=12.5, leftIndent=14, firstLineIndent=-14, spaceAfter=6),
    "code": ParagraphStyle("c", fontName="DVM", fontSize=7, leading=9.2, backColor=colors.HexColor("#f3f4f6"),
                           borderPadding=4, spaceAfter=6, leftIndent=2, rightIndent=2),
}


def pulisci(t):
    # il font non ha le emoji: le sostituisco con un segnaposto leggibile
    return re.sub(r"[\U0001F000-\U0001FFFF\u2600-\u27BF]", "[emoji]", t)


def P(t, st="p"):
    return Paragraph(escape(pulisci(t)).replace("\n", "<br/>"), S[st])


def codice(t, larg=108):
    righe = []
    for r in t.split("\n"):
        while len(r) > larg:
            taglio = r.rfind(" ", 0, larg)
            taglio = taglio if taglio > 40 else larg
            righe.append(r[:taglio])
            r = "    " + r[taglio:].lstrip()
        righe.append(r)
    return Preformatted(pulisci("\n".join(righe)), S["code"])


def regola(n, t):
    n = f"{n}." if str(n).isdigit() else n
    return Paragraph(f"<b>{n}</b> " + escape(pulisci(t)).replace("\n", "<br/>"), S["regola"])


def costruisci(path, titolo, sotto, elementi):
    def piede(c, d):
        c.saveState()
        c.setFont("DV", 7.5)
        c.setFillColor(colors.HexColor("#777777"))
        c.drawString(18 * mm, 10 * mm, titolo)
        c.drawRightString(A4[0] - 18 * mm, 10 * mm, f"pag. {d.page}")
        c.restoreState()

    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=18 * mm, title=titolo, author="YesMobility")
    doc.build([P(titolo, "titolo"), P(sotto, "sotto")] + elementi, onFirstPage=piede, onLaterPages=piede)


# ---------------------------------------------------------------- estrazione dai sorgenti
NODE = r"""
const fs = require('fs');
const html = fs.readFileSync(process.argv[1], 'utf8');
const a = html.indexOf('const COMPANY_PROFILE_DEFAULT');
const b = html.indexOf('/* =========================================================\n   RUNTIME ADAPTER');
const consts = html.slice(a, b);
function fn(name){
  const i = html.indexOf('function ' + name + '(');
  let j = html.indexOf('{', i), d = 0, k = j;
  for (; k < html.length; k++){ if (html[k]==='{') d++; else if (html[k]==='}'){ d--; if(!d) break; } }
  return html.slice(i, k+1);
}
const code = consts + '\n' + fn('buildSystemPrompt') + '\n' + fn('buildExtractionSystemPrompt') + '\n' + fn('buildUserPrompt').slice(0,0) +
 '\nconst state = {profile: COMPANY_PROFILE_DEFAULT};\n' +
 'return {profilo: COMPANY_PROFILE_DEFAULT, hard: HARD_COMPLIANCE_RULES, libreria: SCRIPT_LIBRARY, stati: LEAD_STATES, obiezioni: OBIEZIONI_TRASVERSALI, system: buildSystemPrompt(), extraction: buildExtractionSystemPrompt()};';
const out = new Function(code)();
// frammenti letterali dal codice di buildUserPrompt / buildExtractionUserPrompt (testo statico)
const up = fn('buildUserPrompt'), eup = fn('buildExtractionUserPrompt');
const grab = (src, marker) => { const i = src.indexOf(marker); if (i<0) return null; const q = src[i-1]; const m = src.slice(i-1).match(/^(["`])((?:\\.|(?!\1)[\s\S])*)\1/); return m ? m[2] : null; };
out.user_nota_appuntamento = grab(up, 'NOTA sui campi data_appuntamento');
out.user_firma = grab(up, 'FIRMA: nei testi WhatsApp');
const mm = up.match(/"ANALISI E STRATEGIA CONSIGLIATA PER QUESTO LEAD[^"]*"/);
out.user_strategia = mm ? JSON.parse(mm[0]) : null;
out.user_src = up; out.extr_user_src = eup;
console.log(JSON.stringify(out));
"""


def estrai_html():
    r = subprocess.run(["node", "-e", NODE, HTML], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def costante_py(path, nome):
    src = open(path, encoding="utf-8").read()
    m = re.search(rf"^{nome}\s*=\s*(.+)$", src, re.M)
    return m.group(1).split("#")[0].strip().strip('"') if m else "?"


def blocco_system_classificatore():
    src = open(MOTORE, encoding="utf-8").read()
    a = src.index("        system = (")
    b = src.index("        messaggio = (")
    return src[a:b].rstrip(), src[b:src.index("        risposta = self.client_llm")].rstrip()


def blocco_generatore():
    src = open(GENERA, encoding="utf-8").read()
    a = src.index("def costruisci_system_prompt")
    b = src.index("def leggi_frasi_esempio")
    c = src.index("    messaggio = (")
    d = src.index("    client = Anthropic()")
    return src[a:b].rstrip(), src[c:d].rstrip()


# ---------------------------------------------------------------- contenuti
oggi = date.today().strftime("%d/%m/%Y")
D = estrai_html()
MODELLO_LR = re.search(r'DEFAULT_ANTHROPIC_MODEL\s*=\s*"([^"]+)"', open(HTML, encoding="utf-8").read()).group(1)
MOD_CLASS = costante_py(MOTORE, "MODELLO_CLASSIFICATORE")
MOD_GEN = costante_py(GENERA, "MODELLO_GENERAZIONE")
SOGLIA = costante_py(MOTORE, "SOGLIA_MINIMA_SIMILARITA")
MARGINE = costante_py(MOTORE, "MARGINE_CONFIDENZA_DIRETTA")
SRC_LR = "SALESASSISTANT/LEADREWORKS/src/lead-rework-console.html"
SRC_SV = "SALESASSISTANT/SUGGERIMENTIVENDITA/matching-engine/"

OUT = QUI


# ===== 1. LEADREWORKS — REGOLE =====
def pdf_lr_regole():
    el = []
    el.append(P("Regole che la Lead Rework Console passa all'AI quando elabora un lead. Estratte letteralmente dal codice "
                f"(`{SRC_LR}`), stato al {oggi}. Hanno priorità su qualsiasi altra istruzione, compresi profilo azienda e script di riferimento.", "p"))

    el.append(P("1. Regole assolute (HARD_COMPLIANCE_RULES)", "h1"))
    el.append(P("Hardcoded nel codice: valgono sempre, a prescindere dal profilo azienda salvato nel browser. "
                "Vengono inserite nel system prompt di generazione script, subito dopo il ruolo, e richiamate nell'«ultimo controllo» finale.", "nota"))
    for i, r in enumerate(D["hard"], 1):
        el.append(regola(i, r))

    el.append(P("2. Regole critiche di compliance del profilo azienda", "h1"))
    el.append(P("Campo `regole_critiche_compliance` del profilo (valore di default; l'operatore può modificarlo dalla tab Profilo Azienda). "
                "Passate al modello come «REGOLE CRITICHE DI COMPLIANCE AGGIUNTIVE DEL PROFILO», in aggiunta alle regole assolute.", "nota"))
    for i, r in enumerate(D["profilo"]["regole_critiche_compliance"], 1):
        el.append(regola(i, r))
    el.append(P("Vincoli di stile dal profilo:", "h2"))
    el.append(regola("•", "Tono di voce: " + D["profilo"]["tono_di_voce"]))
    el.append(regola("•", "Ruolo percepito dal cliente: " + D["profilo"]["ruolo_percepito_dal_cliente"]))

    el.append(P("3. Regole aggiunte nel messaggio utente (per ogni lead)", "h1"))
    el.append(P("Compaiono nel prompt utente inviato a ogni generazione, non nel system prompt.", "nota"))
    el.append(regola(1, D["user_nota_appuntamento"] or "?"))
    if D["user_strategia"]:
        el.append(regola(2, D["user_strategia"].split(":\n")[0]))
    el.append(regola(3, D["user_firma"] or "?"))

    el.append(P("4. Regole sull'estrazione dati (prompt di analisi del lead)", "h1"))
    for i, r in enumerate([
        "Scegliere lo stato del lead (`stato_lead_suggerito`) solo se c'è un indizio concreto nei materiali; altrimenti omettere la chiave: non indovinare a caso.",
        "`obiezioni_suggerite`: solo le chiavi effettivamente emerse dal testo; array vuoto se nessuna, ma la chiave non va omessa.",
        "`analisi_strategia`: in italiano, massimo 100 parole, con (1) cosa emerge dallo studio del lead e (2) la strategia operativa consigliata (leve, tono, priorità); va sempre compilata se si è analizzato almeno un dato.",
        "Rispondere SOLO con un oggetto JSON valido, senza markdown né commenti.",
        "Includere solo le chiavi per cui esiste un'informazione reale nei materiali: non inventare dati assenti.",
    ], 1):
        el.append(regola(i, r))

    el.append(P("5. Regola di autocontrollo", "h1"))
    el.append(P("Il system prompt chiude con un «ULTIMO CONTROLLO PRIMA DI RISPONDERE»: l'AI deve rileggere riga per riga il testo e riscriverlo "
                "se viola anche una sola regola assoluta. Il testo letterale è nel PDF «LEADREWORKS ISTRUZIONI».", "p"))
    costruisci(os.path.join(OUT, "LEADREWORKS REGOLE.pdf"), "LEADREWORKS — REGOLE",
               f"Regole inviate all'AI nell'elaborazione di un lead · generato il {oggi} · modello: {MODELLO_LR}", el)


# ===== 2. LEADREWORKS — ISTRUZIONI =====
def pdf_lr_istruzioni():
    el = []
    el.append(P("Istruzioni (prompt completi) inviate all'AI dalla Lead Rework Console. Testo letterale, ottenuto eseguendo le funzioni "
                f"`buildSystemPrompt` e `buildExtractionSystemPrompt` di `{SRC_LR}` col profilo di default. Modello predefinito: {MODELLO_LR}.", "p"))

    el.append(P("Flusso", "h1"))
    el.append(P("1) Import dati (CRM/estensione, file, screenshot) → 2) prompt di ESTRAZIONE/ANALISI: propone stato lead, obiezioni, strategia → "
                "3) l'operatore conferma/corregge → 4) prompt di GENERAZIONE: scrive gli script per i canali previsti dallo stato scelto "
                "(telefono, WhatsApp, email).", "p"))

    el.append(P("A. Prompt di ESTRAZIONE / ANALISI", "h1"))
    el.append(P("Usato dal pulsante «Suggerisci stato, obiezioni e strategia con AI» e dall'estrazione dopo l'import di file/screenshot.", "nota"))
    el.append(P("System prompt", "h2"))
    el.append(codice(D["extraction"]))
    el.append(P("User prompt (modello; i valori variano per ogni lead)", "h2"))
    el.append(codice(
        "Dati già noti sul lead (es. da un foglio importato, possono essere incompleti o assenti):\n"
        "{ nome, prodotto, zona, note, storico, prezzo_esistente, motivazione_rifiuto }\n"
        'Note manuali aggiuntive sui file caricati: <testo libero oppure "(nessuna)">\n'
        "Analizza anche eventuali immagini allegate (screenshot di portale lead, chat, email) ed estrai/correggi i campi di "
        "conseguenza, oltre a stato_lead_suggerito e obiezioni_suggerite.\n"
        "(più le immagini allegate, passate come contenuto multimodale)"))

    el.append(PageBreak())
    el.append(P("B. Prompt di GENERAZIONE SCRIPT", "h1"))
    el.append(P("Usato dal pulsante «Genera script». Il system prompt è assemblato in quest'ordine: ruolo → regole assolute → profilo azienda → "
                "regole del profilo → libreria script di riferimento → istruzioni di output → ultimo controllo.", "nota"))
    el.append(P("System prompt (letterale, con profilo di default e libreria completa)", "h2"))
    el.append(codice(D["system"]))

    el.append(PageBreak())
    el.append(P("User prompt (modello; varia per ogni lead)", "h2"))
    up = [
        "STATO LEAD SELECTIONATO".replace("SELECTIONATO", "SELEZIONATO") + ": {id}. {label} ({note})",
        "",
        "DATI LEAD:",
        "{ nome, appellativo_cliente, prodotto, zona, note, storico, prezzo_esistente, motivazione_rifiuto,\n"
        "  data_appuntamento, orario_appuntamento, indirizzo, tempistica, nota_file_allegati }",
        "",
        D["user_nota_appuntamento"] or "",
        "",
        "(se presente) " + (D["user_strategia"] or "") + "{testo analisi_strategia}",
        "",
        "CANALI/SLOT RICHIESTI (genera esattamente una chiave per ciascuno, con questi nomi esatti):",
        '- chiave output: "{key}" | canale: {canale} | etichetta: {label} | script di riferimento: [...]',
        "",
        "OBIEZIONI TRASVERSALI DA CONSIDERARE SE PERTINENTI:",
        '- {label} | script di riferimento: [...]   (oppure: "Nessuna obiezione specifica da gestire in modo esplicito.")',
        "",
        D["user_firma"] or "",
        "",
        "Rispondi con un JSON con le chiavi: [...]",
    ]
    el.append(codice("\n".join(up)))

    el.append(PageBreak())
    el.append(P("C. Stati del lead (iniettati nel prompt di estrazione)", "h1"))
    righe = []
    for s in D["stati"]:
        canali = ", ".join(f"{sl['canale']}→script {sl['scripts']}" for sl in s["slots"])
        righe.append(f"{s['id']:>2}. {s['label']}\n    nota: {s['note']}\n    canali: {canali}")
    el.append(codice("\n".join(righe)))

    el.append(P("D. Obiezioni trasversali", "h1"))
    el.append(codice("\n".join(f"- {o['key']}: {o['label']} (script {o['scripts']})" for o in D["obiezioni"])))

    el.append(P("E. Profilo azienda di default (parte del system prompt)", "h1"))
    el.append(codice(json.dumps(D["profilo"], ensure_ascii=False, indent=2)))

    el.append(P("F. Libreria script di riferimento", "h1"))
    el.append(P(f"{len(D['libreria'])} script (numerati 1–27, il 22 non esiste). Sono già inclusi nel system prompt della sezione B; "
                "qui elencati in forma leggibile.", "nota"))
    for s in D["libreria"]:
        testo = s.get("testo") or ("OGGETTO: " + s.get("oggetto", "") + "\n\n" + s.get("corpo", ""))
        blocco = [P(f"{s['numero']}. {s['titolo']}", "h2"),
                  P(f"canale: {s['canale']} · categoria: {s['categoria']} · stati correlati: {s['stati_correlati']} · id: {s['id']}", "nota"),
                  P(testo, "p")]
        if s.get("note_interne"):
            blocco.append(P("Nota interna: " + s["note_interne"], "nota"))
        el.append(KeepTogether(blocco))
    costruisci(os.path.join(OUT, "LEADREWORKS ISTRUZIONI.pdf"), "LEADREWORKS — ISTRUZIONI",
               f"Prompt completi inviati all'AI nell'elaborazione di un lead · generato il {oggi} · modello: {MODELLO_LR}", el)


# ===== 3. SALESASSISTANT — REGOLE =====
def pdf_sv_regole():
    ctx = json.load(open(SCHEMA_CTX, encoding="utf-8"))
    ro = ctx["properties"]["regole_operatore"]["properties"]
    el = []
    el.append(P("Regole che Suggerimenti Vendita (SALESASSISTANT) applica o passa all'AI durante una chiamata. "
                f"Estratte dal codice in `{SRC_SV}` e dallo schema `schema-contesto-sessione.json`, stato al {oggi}.", "p"))

    el.append(P("1. Regole del classificatore live (scelta dello script)", "h1"))
    el.append(P(f"Modello: {MOD_CLASS}. L'AI interviene solo nei casi ambigui; max 20 token di risposta.", "nota"))
    for i, r in enumerate([
        "Scegliere lo script più adatto a ciò che ha appena detto il cliente, confrontando il senso della frase con le «frasi tipiche del cliente» e la categoria di ogni script. Non serve un testo identico: basta la stessa situazione.",
        "Rispondere SOLO con l'id esatto dello script scelto, senza nient'altro.",
        "Se nessuno script è davvero pertinente, rispondere: nessuno (meglio non suggerire nulla che indovinare).",
        "A parità di pertinenza, preferire uno script marcato PRIORITARIO, poi quello con priorità numerica più alta.",
        "Rispettare l'obiettivo della chiamata e gli argomenti da evitare indicati nel contesto della sessione.",
    ], 1):
        el.append(regola(i, r))

    el.append(P("2. Regole rigide dell'operatore (contesto di sessione)", "h1"))
    el.append(P("Compilate prima della chiamata (`regole_operatore`). Filtrano o forzano gli script indipendentemente dalla similarità semantica.", "nota"))
    for k, v in ro.items():
        extra = f" Valori ammessi: {', '.join(v['enum'])}." if "enum" in v else ""
        el.append(regola("•", f"{k}: {v.get('description', '')}{extra}"))

    el.append(P("3. Regole del matching prima dell'AI", "h1"))
    for i, r in enumerate([
        f"Soglia minima di similarità: {SOGLIA}. Gli script sotto soglia vengono scartati subito.",
        f"Se il primo candidato supera il secondo di almeno {MARGINE} di similarità, viene scelto direttamente, senza chiamare l'AI.",
        "Gli script vietati (`script_vietati`) non vengono mai suggeriti nella sessione.",
        "Se il classificatore risponde con un id sconosciuto o «nessuno», non viene mostrato alcun suggerimento.",
    ], 1):
        el.append(regola(i, r))

    el.append(P("4. Regole dell'assistente di scrittura nuovi script", "h1"))
    el.append(P(f"Modello: {MOD_GEN}. Voce di menu «Aggiungi script».", "nota"))
    for i, r in enumerate([
        "Scrivere UN solo suggerimento breve (1-3 frasi), concreto e naturale da leggere a monitor durante una telefonata, in italiano.",
        "Rispondere SOLO con il testo del suggerimento: niente titoli, niente virgolette, niente spiegazioni, niente elenchi puntati.",
        "Regole fisse del profilo azienda (campo `regole_fisse`): da rispettare sempre. Il contenuto lo scrive l'operatore dal menu «Profilo azienda»; "
        "il file `schema/profilo-azienda.json` non è nel repository (è creato sul Mac).",
        "In modalità «alternativa»: scrivere una versione valida ma con approccio diverso (più diretta, o su un argomento diverso) dal suggerimento principale già proposto.",
        "Se il profilo azienda non è compilato: scrivere un suggerimento di buon senso commerciale, generico ma concreto.",
    ], 1):
        el.append(regola(i, r))

    el.append(P("Nota", "h2"))
    el.append(P("Le regole di compliance «Sig./Sig.ra», niente emoji, nessun nome del partner, ecc. appartengono a LEADREWORKS e non sono "
                "passate al motore di Suggerimenti Vendita: qui l'unico contenuto commerciale arriva dagli script della libreria e dal profilo azienda.", "nota"))
    costruisci(os.path.join(OUT, "SALESASSISTANT REGOLE.pdf"), "SALESASSISTANT — REGOLE",
               f"Regole applicate/inviate all'AI durante una chiamata · generato il {oggi}", el)


# ===== 4. SALESASSISTANT — ISTRUZIONI =====
def pdf_sv_istruzioni():
    sys_c, msg_c = blocco_system_classificatore()
    gen_sys, gen_msg = blocco_generatore()
    el = []
    el.append(P("Istruzioni (prompt) che Suggerimenti Vendita invia all'AI. Estratte letteralmente dal codice sorgente "
                f"(`{SRC_SV}`), stato al {oggi}.", "p"))

    el.append(P("Flusso", "h1"))
    el.append(P("Il cliente parla → Deepgram trascrive → il motore calcola la similarità semantica (embedding locale) con le frasi tipiche della "
                "libreria → se il migliore vince con margine netto viene mostrato direttamente (nessuna AI) → altrimenti decide il classificatore AI "
                "(prompt A). Il prompt B serve solo in fase di preparazione, per scrivere nuovi script.", "p"))

    el.append(P("A. Classificatore live (motore_suggerimenti.py → _classifica)", "h1"))
    el.append(P(f"Modello: {MOD_CLASS} · max_tokens 20.", "nota"))
    el.append(P("System prompt (codice sorgente)", "h2"))
    el.append(codice(sys_c))
    el.append(P("User prompt (codice sorgente)", "h2"))
    el.append(codice(msg_c))
    el.append(P("Forma del messaggio inviato (esempio)", "h2"))
    el.append(codice(
        'Frase del cliente: "<frase trascritta>"\n\n'
        "Script candidati:\n"
        "- id: <id>\n  categoria: <trigger_categoria>\n  frasi tipiche del cliente in questa situazione: <trigger_esempi separati da ;>\n"
        "  suggerimento: <testo_suggerimento>\n  priorità: <n> (PRIORITARIO se marcato)\n  [... un blocco per candidato ...]\n\n"
        "Id scelto:"))

    el.append(P("B. Assistente di scrittura nuovi script (genera_testo_script.py)", "h1"))
    el.append(P(f"Modello: {MOD_GEN} · max_tokens 200 · voce di menu «Aggiungi script».", "nota"))
    el.append(P("Costruzione del system prompt (codice sorgente)", "h2"))
    el.append(codice(gen_sys))
    el.append(P("Costruzione del messaggio utente (codice sorgente)", "h2"))
    el.append(codice(gen_msg))
    el.append(P("Testo effettivo del system prompt con profilo non compilato", "h2"))
    el.append(codice("Sei un copywriter esperto di script di vendita telefonica.\n"
                     "Scrivi UN suggerimento breve (1-3 frasi), concreto e naturale da leggere a monitor durante una telefonata di vendita, in italiano.\n"
                     "Rispondi SOLO con il testo del suggerimento: niente titoli, niente virgolette, niente spiegazioni, niente elenchi puntati.\n"
                     "Non è stato fornito un profilo azienda: scrivi un suggerimento di buon senso commerciale, generico ma concreto."))

    el.append(P("C. Libreria script di riferimento del sistema", "h1"))
    lib_path = os.path.join(RADICE, "SUGGERIMENTIVENDITA", "schema", "esempio-libreria-script.json")
    lib = json.load(open(lib_path, encoding="utf-8"))
    voci = lib if isinstance(lib, list) else lib.get("script", lib.get("scripts", []))
    el.append(P(f"{len(voci)} script in `schema/esempio-libreria-script.json` (la copia attiva nell'app può essere cresciuta). "
                "Il testo mostrato all'operatore è `testo_suggerimento`; il matching usa `trigger_esempi`.", "nota"))
    for s in voci:
        blocco = [P(f"{s.get('id', '?')}", "h2"),
                  P(f"fase: {s.get('fase_chiamata', '')} · categoria: {s.get('trigger_categoria', '')} · priorità: {s.get('priorita', 0)}", "nota"),
                  P("Frasi tipiche del cliente: " + "; ".join(s.get("trigger_esempi", [])), "p"),
                  P("Suggerimento: " + s.get("testo_suggerimento", ""), "p")]
        el.append(KeepTogether(blocco))
    costruisci(os.path.join(OUT, "SALESASSISTANT ISTRUZIONI.pdf"), "SALESASSISTANT — ISTRUZIONI",
               f"Prompt inviati all'AI durante e in preparazione di una chiamata · generato il {oggi}", el)


if __name__ == "__main__":
    pdf_lr_regole()
    pdf_lr_istruzioni()
    pdf_sv_regole()
    pdf_sv_istruzioni()
    print("PDF generati in", OUT)
