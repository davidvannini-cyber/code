package it.yesmobility.rubrica

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && Prefs.topic(context).isNotEmpty()) {
            try {
                context.startForegroundService(Intent(context, NtfyService::class.java))
            } catch (e: Exception) {
                // il sistema può negare l'avvio: l'app si riapre a mano
            }
        }
    }
}
