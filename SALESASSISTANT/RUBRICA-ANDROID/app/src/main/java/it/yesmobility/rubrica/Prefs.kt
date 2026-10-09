package it.yesmobility.rubrica

import android.content.Context

object Prefs {
    private fun sp(c: Context) = c.getSharedPreferences("rubrica", Context.MODE_PRIVATE)
    fun topic(c: Context): String = sp(c).getString("topic", "") ?: ""
    fun setTopic(c: Context, v: String) { sp(c).edit().putString("topic", v).apply() }
    fun ultimoTempo(c: Context): Long = sp(c).getLong("ultimo_tempo", 0L)
    fun setUltimoTempo(c: Context, v: Long) { sp(c).edit().putLong("ultimo_tempo", v).apply() }
    fun ultimoNumero(c: Context): String = sp(c).getString("ultimo_numero", "") ?: ""
    fun setUltimoNumero(c: Context, v: String) { sp(c).edit().putString("ultimo_numero", v).apply() }
    fun log(c: Context): String = sp(c).getString("log", "") ?: ""
    fun aggiungiLog(c: Context, riga: String) {
        val righe = (riga + "\n" + log(c)).lines().take(8).joinToString("\n")
        sp(c).edit().putString("log", righe).apply()
    }
}
