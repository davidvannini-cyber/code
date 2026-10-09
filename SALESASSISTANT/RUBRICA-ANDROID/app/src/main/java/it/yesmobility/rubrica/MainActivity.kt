package it.yesmobility.rubrica

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var campoCodice: EditText
    private lateinit var stato: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val p = (16 * resources.displayMetrics.density).toInt()
        val colonna = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(p, p * 2, p, p)
        }
        fun testo(t: String, size: Float = 15f) = TextView(this).apply { text = t; textSize = size; setPadding(0, p / 2, 0, p / 4) }
        fun bottone(t: String, azione: () -> Unit) = Button(this).apply {
            text = t; isAllCaps = false
            setOnClickListener { azione() }
        }

        colonna.addView(testo("Rubrica YesMobility", 22f))
        colonna.addView(testo("Versione " + packageManager.getPackageInfo(packageName, 0).versionName))
        colonna.addView(testo("Riceve i lead dal Mac, salva il contatto nella rubrica del telefono (etichetta «YesMobility») e copia il numero negli appunti."))
        colonna.addView(testo("Codice segreto (lo stesso della Lead Rework Console):"))
        campoCodice = EditText(this).apply {
            setText(Prefs.topic(this@MainActivity))
            hint = "ym-…"
            setSingleLine(true)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
        colonna.addView(campoCodice)
        colonna.addView(bottone("1. Salva e avvia l'ascolto") { salvaEAvvia() })
        colonna.addView(bottone("2. Concedi i permessi (contatti e notifiche)") { chiediPermessi() })
        colonna.addView(bottone("3. Non limitare la batteria") { escludiBatteria() })
        colonna.addView(bottone("4. Consenti \"Mostra sopra altre app\" (serve per far partire Lyber)") { chiediSovrapposizione() })
        colonna.addView(bottone("Ferma l'ascolto") {
            stopService(Intent(this, NtfyService::class.java)); aggiorna()
        })
        stato = testo("")
        stato.gravity = Gravity.START
        colonna.addView(stato)

        setContentView(ScrollView(this).apply { addView(colonna) })
        aggiorna()
    }

    override fun onResume() { super.onResume(); aggiorna() }

    private fun permessiDaChiedere(): Array<String> {
        val l = mutableListOf(Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS)
        if (Build.VERSION.SDK_INT >= 33) l.add(Manifest.permission.POST_NOTIFICATIONS)
        return l.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }.toTypedArray()
    }

    private fun chiediPermessi() {
        val d = permessiDaChiedere()
        if (d.isEmpty()) Toast.makeText(this, "Permessi già concessi", Toast.LENGTH_SHORT).show()
        else requestPermissions(d, 1)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        aggiorna()
    }

    private fun escludiBatteria() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(packageName)) {
            Toast.makeText(this, "Già escluso dal risparmio batteria", Toast.LENGTH_SHORT).show()
        } else {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        }
    }

    private fun chiediSovrapposizione() {
        if (Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Permesso già concesso", Toast.LENGTH_SHORT).show()
        } else {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        }
    }

    private fun salvaEAvvia() {
        val codice = campoCodice.text.toString().trim()
        if (codice.isEmpty()) { Toast.makeText(this, "Inserisci il codice segreto", Toast.LENGTH_SHORT).show(); return }
        if (codice != Prefs.topic(this)) Prefs.setUltimoTempo(this, 0L)
        Prefs.setTopic(this, codice)
        if (permessiDaChiedere().isNotEmpty()) chiediPermessi()
        startForegroundService(Intent(this, NtfyService::class.java))
        aggiorna()
    }

    private fun aggiorna() {
        val perm = if (permessiDaChiedere().isEmpty()) "concessi ✓" else "da concedere (tocca il pulsante 2)"
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val batt = if (pm.isIgnoringBatteryOptimizations(packageName)) "non limitata ✓" else "da escludere (tocca il pulsante 3)"
        val sopra = if (Settings.canDrawOverlays(this)) "concesso ✓" else "da concedere (tocca il pulsante 4)"
        val log = Prefs.log(this).ifEmpty { "(nessun lead ricevuto)" }
        stato.text = "Codice: " + (if (Prefs.topic(this).isEmpty()) "non impostato" else "impostato ✓") +
            "\nPermessi: $perm\nBatteria: $batt\nMostra sopra altre app: $sopra\n\nUltimi lead:\n$log"
    }
}
