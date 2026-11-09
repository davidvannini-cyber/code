package it.yesmobility.rubrica

import android.content.Context
import android.content.Intent
import android.net.Uri

/** Trova l'app Lyber sul telefono e le chiede di chiamare un numero (Lyber avvia la chiamata subito). */
object Lyber {
    /** Nome interno dell'app il cui nome visibile contiene "lyber", oppure null. */
    fun pacchetto(c: Context): String? {
        val pm = c.packageManager
        val main = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val trovata = pm.queryIntentActivities(main, 0).firstOrNull {
            it.loadLabel(pm).toString().contains("lyber", ignoreCase = true)
        }
        return trovata?.activityInfo?.packageName
    }

    /** Intent che apre Lyber e fa partire la chiamata (null se Lyber non è installata). */
    fun intentChiamata(c: Context, numero: String): Intent? {
        val pkg = pacchetto(c) ?: return null
        return Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Contatti.normalizza(numero)))
            .setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    /** Da chiamare solo con l'app in primo piano. */
    fun chiama(c: Context, numero: String): String {
        val intent = intentChiamata(c, numero) ?: return "Lyber non trovata sul telefono"
        return try {
            c.startActivity(intent)
            "Chiamata avviata con Lyber"
        } catch (e: Exception) {
            "Lyber non si è aperta: " + (e.message ?: "errore")
        }
    }
}
