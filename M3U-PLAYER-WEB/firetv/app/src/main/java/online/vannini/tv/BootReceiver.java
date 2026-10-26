package online.vannini.tv;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.SystemClock;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

// Apre l'app quando la Fire TV si accende (dopo un riavvio o la corrente tolta).
// Ascolta sia «accensione bloccata» (LOCKED_BOOT_COMPLETED, piu' presto) sia «accensione finita» (BOOT_COMPLETED) e apre l'app col primo.
// Ci prova subito e ancora dopo qualche secondo: la schermata Home della Fire TV compare dopo l'accensione e potrebbe coprirla.
// Scrive un registro (ultime righe) per il riquadro «Avvio automatico» del MENU.
public class BootReceiver extends BroadcastReceiver {
    static final String PREF = "boot";
    private static final long DELAY_MS = 12 * 1000;
    private static final int LOG_LINES = 8;

    // Apre l'app davanti; se e' gia' aperta la riporta in primo piano e le dice di riprendere l'ultimo canale.
    static Intent launchIntent(Context c) {
        return new Intent(c, MainActivity.class).putExtra("auto", true)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    // Con «Avvio automatico» spento ricevitore e servizio restano spenti e non pesano; acceso, partono con la Fire TV.
    static void apply(Context c, boolean on) {
        c.getPackageManager().setComponentEnabledSetting(new ComponentName(c, BootReceiver.class),
            on ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP);
        if (on) WakeService.start(c); else WakeService.stop(c);
    }

    static String now() { return new SimpleDateFormat("dd/MM HH:mm:ss", Locale.ITALY).format(new Date()); }

    // Aggiunge una riga in cima al registro (ora + cosa e' successo), tenendo le ultime LOG_LINES.
    static synchronized void log(Context c, String what) {
        try {
            SharedPreferences p = c.getSharedPreferences("tv", Context.MODE_PRIVATE);
            String time = new SimpleDateFormat("HH:mm:ss", Locale.ITALY).format(new Date());
            String all = time + " " + what + "\n" + p.getString("log", "");
            String[] lines = all.split("\n");
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < lines.length && i < LOG_LINES; i++) out.append(lines[i]).append('\n');
            p.edit().putString("log", out.toString().trim()).apply();
        } catch (RuntimeException ignored) { /* memoria non ancora disponibile (accensione bloccata): niente registro */ }
    }

    @Override public void onReceive(Context c, Intent in) {
        String a = in.getAction();
        boolean locked = "android.intent.action.LOCKED_BOOT_COMPLETED".equals(a);
        if (!locked && !Intent.ACTION_BOOT_COMPLETED.equals(a) && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        long sec = SystemClock.elapsedRealtime() / 1000;
        log(c, (locked ? "accensione bloccata" : "accensione finita") + " (" + sec + " s dall'accensione)");
        SharedPreferences p;
        try {
            p = c.getSharedPreferences("tv", Context.MODE_PRIVATE);
        } catch (RuntimeException x) {
            return;
        }
        SharedPreferences.Editor e = p.edit().putString("boot_seen", now() + " (" + sec + " s dopo l'accensione)");
        if (!p.getBoolean(PREF, true)) {
            e.putString("boot_try", "funzione spenta dal MENU").apply();
            return;
        }
        WakeService.start(c);
        Intent go = launchIntent(c);
        String r;
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
