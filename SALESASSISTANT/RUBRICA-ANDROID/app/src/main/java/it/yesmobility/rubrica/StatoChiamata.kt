package it.yesmobility.rubrica

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Racconta al Mac cosa succede alla chiamata partita su richiesta dell'agente vocale.
 * Gli eventi vanno sul canale «<codice>-stato» di ntfy.sh (lo ascolta l'orchestratore sul Mac):
 *   ricevuto, lyber_aperta, non_partita, linea_occupata, libera, termina_eseguito.
 * Attenzione: «linea_occupata» e «libera» vengono dallo stato telefonico di Android; se Lyber fa le chiamate
 * come app VoIP separata, Android può non segnalarli mai (prova T4 nella guida): in quel caso il Mac usa il
 * rilevatore audio e il pulsante «Ha risposto».
 */
object StatoChiamata {
    @Volatile var idChiamata: String = ""
    private var registrato = false
    private var ultimo = TelephonyManager.CALL_STATE_IDLE

    /** Manda un evento al Mac (in un thread a parte). Senza id di chiamata non fa nulla. */
    fun invia(c: Context, evento: String, id: String = idChiamata) {
        val topic = Prefs.topic(c)
        if (topic.isEmpty() || id.isEmpty()) return
        val corpo = JSONObject().put("evento", evento).put("id", id).toString()
        Thread {
            try {
                val u = URL("https://ntfy.sh/" + URLEncoder.encode(topic + "-stato", "UTF-8"))
                val conn = u.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                conn.outputStream.use { it.write(corpo.toByteArray(Charsets.UTF_8)) }
                conn.responseCode
                conn.disconnect()
            } catch (e: Exception) {
                Prefs.aggiungiLog(c, "Stato «$evento» non inviato al Mac: " + (e.message ?: "rete"))
            }
        }.start()
    }

    /** Inizia ad ascoltare lo stato telefonico (serve il permesso «Stato del telefono»). Una volta sola. */
    fun osserva(c: Context) {
        if (registrato) return
        if (c.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return
        val ctx = c.applicationContext
        Handler(Looper.getMainLooper()).post {
            registrato = true
            try {
                val tm = ctx.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                if (Build.VERSION.SDK_INT >= 31) {
                    tm.registerTelephonyCallback(ctx.mainExecutor, CallbackNuovo { s -> cambio(ctx, s) })
                } else {
                    @Suppress("DEPRECATION")
                    tm.listen(object : PhoneStateListener() {
                        @Deprecated("API vecchie")
                        override fun onCallStateChanged(state: Int, phoneNumber: String?) { cambio(ctx, state) }
                    }, PhoneStateListener.LISTEN_CALL_STATE)
                }
            } catch (e: Exception) {
                registrato = false
                Prefs.aggiungiLog(ctx, "Stato telefono non osservabile: " + (e.message ?: "errore"))
            }
        }
    }

    private fun cambio(c: Context, stato: Int) {
        val prima = ultimo
        ultimo = stato
        if (idChiamata.isEmpty()) return
        if (stato == TelephonyManager.CALL_STATE_OFFHOOK && prima == TelephonyManager.CALL_STATE_IDLE) {
            invia(c, "linea_occupata")
        } else if (stato == TelephonyManager.CALL_STATE_IDLE && prima != TelephonyManager.CALL_STATE_IDLE) {
            invia(c, "libera")
            idChiamata = ""
        }
    }

    // Classe usata solo da Android 12 in su (vedi osserva()).
    private class CallbackNuovo(val f: (Int) -> Unit) : TelephonyCallback(), TelephonyCallback.CallStateListener {
        override fun onCallStateChanged(state: Int) { f(state) }
    }
}
