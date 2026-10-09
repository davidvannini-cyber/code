package it.yesmobility.rubrica

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Resta in ascolto del canale ntfy.sh e, per ogni lead ricevuto, salva il contatto e copia il numero. */
class NtfyService : Service() {
    @Volatile private var attivo = false
    private var thread: Thread? = null
    private var conn: HttpURLConnection? = null
    private val main = Handler(Looper.getMainLooper())
    private var contatoreNotifiche = 100

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        creaCanali()
        val n = Notification.Builder(this, CANALE_SERVIZIO)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle("Rubrica YesMobility")
            .setContentText("In ascolto dei lead dal Mac")
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1, n)
        }
        if (!attivo) {
            attivo = true
            thread = Thread { ciclo() }.also { it.isDaemon = true; it.start() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        attivo = false
        try { conn?.disconnect() } catch (e: Exception) {}
        super.onDestroy()
    }

    private fun ciclo() {
        while (attivo) {
            val topic = Prefs.topic(this)
            if (topic.isEmpty()) { dormi(5000); continue }
            try {
                var da = Prefs.ultimoTempo(this)
                if (da == 0L) da = System.currentTimeMillis() / 1000
                val url = URL("https://ntfy.sh/" + URLEncoder.encode(topic, "UTF-8") + "/json?since=$da")
                val c = url.openConnection() as HttpURLConnection
                conn = c
                c.connectTimeout = 15000
                c.readTimeout = 120000 // ntfy manda un segnale di vita ogni ~45 s
                BufferedReader(InputStreamReader(c.inputStream, "UTF-8")).use { r ->
                    while (attivo) {
                        val riga = r.readLine() ?: break
                        elabora(riga)
                    }
                }
            } catch (e: Exception) {
                // rete assente o connessione caduta: si riprova
            }
            if (attivo) dormi(5000)
        }
    }

    private fun dormi(ms: Long) { try { Thread.sleep(ms) } catch (e: InterruptedException) {} }

    private fun elabora(riga: String) {
        if (riga.isBlank()) return
        try {
            val m = JSONObject(riga)
            if (m.optString("event") != "message") return
            val t = m.optLong("time", 0L)
            if (t > 0) Prefs.setUltimoTempo(this, t + 1)
            val corpo = m.optString("message")
            val o = try { JSONObject(corpo) } catch (e: Exception) { return }
            val lead = Lead(
                o.optString("nome").trim(), o.optString("cognome").trim(),
                o.optString("telefono").trim(), o.optString("email").trim()
            )
            if (lead.telefono.isEmpty()) return
            gestisci(lead)
        } catch (e: Exception) {
            Prefs.aggiungiLog(this, "Errore: " + (e.message ?: e.javaClass.simpleName))
        }
    }

    private fun gestisci(lead: Lead) {
        val numero = Contatti.normalizza(lead.telefono)
        val esito = try {
            if (Contatti.salva(this, lead)) "salvato in rubrica" else "già in rubrica"
        } catch (e: Exception) {
            "contatto NON salvato (" + (e.message ?: "permessi?") + ")"
        }
        // Prova a copiare subito; se Android lo blocca in background, basta toccare la notifica.
        main.post {
            try {
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("Numero lead", numero))
            } catch (e: Exception) {}
        }
        Prefs.aggiungiLog(this, lead.nomeCompleto + " " + numero + " — " + esito)

        val tocca = Intent(this, CopyActivity::class.java)
            .putExtra("numero", numero).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val pi = PendingIntent.getActivity(
            this, contatoreNotifiche, tocca, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = Notification.Builder(this, CANALE_LEAD)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle("Nuovo lead: " + lead.nomeCompleto.ifEmpty { numero })
            .setContentText("$numero — $esito. Tocca per copiare il numero.")
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(contatoreNotifiche++, n)
    }

    private fun creaCanali() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel(CANALE_SERVIZIO, "Servizio in ascolto", NotificationManager.IMPORTANCE_MIN))
        nm.createNotificationChannel(NotificationChannel(CANALE_LEAD, "Nuovi lead", NotificationManager.IMPORTANCE_DEFAULT))
    }

    companion object {
        const val CANALE_SERVIZIO = "servizio"
        const val CANALE_LEAD = "lead"
    }
}
