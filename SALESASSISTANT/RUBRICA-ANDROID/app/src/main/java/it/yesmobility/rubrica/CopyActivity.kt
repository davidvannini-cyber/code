package it.yesmobility.rubrica

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast

/** Toccando la notifica: copia il numero negli appunti e apre Lyber (Android lo consente solo con un'app in primo piano). */
class CopyActivity : Activity() {
    private var fatto = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && !fatto) {
            fatto = true
            val numero = intent.getStringExtra("numero") ?: ""
            if (numero.isNotEmpty()) {
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("Numero lead", numero))
            }
            val esito = Lyber.apri(this, numero)
            Prefs.aggiungiLog(this, "Notifica: $esito")
            Toast.makeText(this, "Numero copiato. $esito", Toast.LENGTH_LONG).show()
            finish()
        }
    }
}
