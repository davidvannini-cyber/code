#!/usr/bin/env python3
# Rigenera moduli-modelli.js dai due PDF vuoti in questa cartella.
# Se cambi un PDF (stessi nomi dei campi), lancia: python3 costruisci-modelli.py
import base64, os
d = os.path.dirname(os.path.abspath(__file__))
o = '/* GENERATO da moduli/costruisci-modelli.py: non modificare a mano. PDF vuoti in base64 (la console si apre da file://, dove fetch() non può leggere i PDF). */\nwindow.MODULI_PDF={\n'
for k, f in [('quotazione', 'Quotazione_indicativa_YM.pdf'), ('preventivo', 'Preventivo_YM.pdf')]:
    o += ' %s:"%s",\n' % (k, base64.b64encode(open(os.path.join(d, f), 'rb').read()).decode())
open(os.path.join(d, 'moduli-modelli.js'), 'w').write(o + '};\n')
