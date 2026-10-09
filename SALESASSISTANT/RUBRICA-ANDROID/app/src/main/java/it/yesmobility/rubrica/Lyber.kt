package it.yesmobility.rubrica

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri

/** Trova l'app Lyber sul telefono e la apre, con il numero già scritto se Lyber lo accetta. */
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

    /** Apre Lyber. Va chiamata con l'app in primo piano (Android blocca l'apertura da sfondo). */
    fun apri(c: Context, numero: String): String {
        val pkg = pacchetto(c) ?: return "Lyber non trovata sul telefono"
        val pm = c.packageManager
        if (numero.isNotEmpty()) {
            val dial = Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(numero)))
                .setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (dial.resolveActivity(pm) != null) {
                try {
                    c.startActivity(dial)
                    return "Lyber aperta con il numero già scritto ($pkg)"
                } catch (e: Exception) {
                    // si prova l'apertura semplice
                }
            }
        }
        val lancio = pm.getLaunchIntentForPackage(pkg)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ?: return "Lyber trovata ($pkg) ma non si apre"
        return try {
            c.startActivity(lancio)
            "Lyber aperta SENZA il numero (non lo accetta da altre app): incolla dagli appunti"
        } catch (e: Exception) {
            "Lyber non si è aperta: " + (e.message ?: "errore")
        }
    }
}
