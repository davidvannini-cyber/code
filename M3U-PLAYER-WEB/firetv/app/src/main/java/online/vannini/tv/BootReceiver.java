package online.vannini.tv;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

// Apre l'app quando la Fire TV si accende (dopo un riavvio o la corrente tolta).
// Ci prova subito e ancora dopo qualche secondo: la schermata Home della Fire TV compare dopo l'accensione e potrebbe coprirla.
// Segna in "tv" cosa e' successo, per il riquadro «Avvio automatico» del MENU.
public class BootReceiver extends BroadcastReceiver {
    static final String PREF = "boot";
    private static final long DELAY_MS = 12 * 1000;

    static String now() { return new SimpleDateFormat("dd/MM HH:mm:ss", Locale.ITALY).format(new Date()); }

    @Override public void onReceive(Context c, Intent in) {
        String a = in.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        SharedPreferences p = c.getSharedPreferences("tv", Context.MODE_PRIVATE);
        SharedPreferences.Editor e = p.edit().putString("boot_seen", now());
        if (!p.getBoolean(PREF, true)) {
            e.putString("boot_try", "funzione spenta dal MENU").apply();
            return;
        }
        Intent go = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        String r = "";
        try {
            c.startActivity(go);
            r = "subito: richiesta inviata";
        } catch (RuntimeException x) {
            r = "subito: bloccata (" + x.getClass().getSimpleName() + ")";
        }
        try {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent pi = PendingIntent.getActivity(c, 0, go, flags);
            ((AlarmManager) c.getSystemService(Context.ALARM_SERVICE))
                .set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + DELAY_MS, pi);
            r += "; dopo " + (DELAY_MS / 1000) + " s: programmata";
        } catch (RuntimeException x) {
            r += "; dopo: non programmata (" + x.getClass().getSimpleName() + ")";
        }
        e.putString("boot_try", r).apply();
    }
}
