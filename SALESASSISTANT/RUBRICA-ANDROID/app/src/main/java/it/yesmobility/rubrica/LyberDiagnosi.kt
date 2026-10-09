package it.yesmobility.rubrica

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri

/** Chiede ad Android quali comandi l'app Lyber è in grado di ricevere da altre app. */
object LyberDiagnosi {
    private fun prova(c: Context, pkg: String, titolo: String, intent: Intent): String {
        intent.setPackage(pkg)
        val trovate = c.packageManager.queryIntentActivities(intent, 0)
        return if (trovate.isEmpty()) "NO   $titolo"
        else "SI   $titolo -> " + trovate.joinToString(", ") { it.activityInfo.name.substringAfterLast('.') }
    }

    @Suppress("DEPRECATION")
    fun rapporto(c: Context, numero: String): String {
        val pkg = Lyber.pacchetto(c) ?: return "Lyber non trovata sul telefono."
        val n = if (numero.isNotEmpty()) numero else "+390000000000"
        val r = StringBuilder()
        r.append("App: $pkg\n")
        try {
            val info = c.packageManager.getPackageInfo(pkg, 0)
            r.append("Versione Lyber: ${info.versionName}\n")
        } catch (e: Exception) {}
        r.append("\nComandi accettati da Lyber:\n")
        r.append(prova(c, pkg, "Comporre numero (DIAL tel:)", Intent(Intent.ACTION_DIAL, Uri.parse("tel:$n")))).append("\n")
        r.append(prova(c, pkg, "Aprire numero (VIEW tel:)", Intent(Intent.ACTION_VIEW, Uri.parse("tel:$n")))).append("\n")
        r.append(prova(c, pkg, "Chiamare (CALL tel:)", Intent(Intent.ACTION_CALL, Uri.parse("tel:$n")))).append("\n")
        r.append(prova(c, pkg, "Chiamata via internet (VIEW sip:)", Intent(Intent.ACTION_VIEW, Uri.parse("sip:$n")))).append("\n")
        r.append(prova(c, pkg, "Condividere testo (SEND)", Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, n))).append("\n")
        r.append(prova(c, pkg, "Elabora testo (PROCESS_TEXT)", Intent(Intent.ACTION_PROCESS_TEXT).setType("text/plain").putExtra(Intent.EXTRA_PROCESS_TEXT, n))).append("\n")
        r.append(prova(c, pkg, "Link lyber://", Intent(Intent.ACTION_VIEW, Uri.parse("lyber://call/$n")))).append("\n")
        r.append(prova(c, pkg, "Link web https://", Intent(Intent.ACTION_VIEW, Uri.parse("https://www.lyber.it/")))).append("\n")
        r.append(prova(c, pkg, "Apertura normale (MAIN)", Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER))).append("\n")
        r.append("\nSchermate di Lyber raggiungibili da altre app:\n")
        try {
            val info = c.packageManager.getPackageInfo(pkg, PackageManager.GET_ACTIVITIES)
            val esportate = info.activities?.filter { it.exported } ?: emptyList()
            if (esportate.isEmpty()) r.append("(nessuna)\n")
            esportate.forEach { r.append("- ").append(it.name).append("\n") }
        } catch (e: Exception) {
            r.append("(elenco non disponibile: ").append(e.message ?: "errore").append(")\n")
        }
        return r.toString()
    }
}
