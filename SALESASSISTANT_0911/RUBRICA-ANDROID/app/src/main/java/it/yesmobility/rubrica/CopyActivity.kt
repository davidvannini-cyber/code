package it.yesmobility.rubrica

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast

/** Ripiego: se la chiamata automatica non è partita, toccando la notifica copia il numero e chiama con Lyber. */
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
            val esito = if (intent.getBooleanExtra("chiama", false)) Lyber.chiama(this, numero) else "Numero copiato"
            Prefs.aggiungiLog(this, "Notifica: $esito")
            Toast.makeText(this, esito, Toast.LENGTH_LONG).show()
            finish()
        }
    }
}
