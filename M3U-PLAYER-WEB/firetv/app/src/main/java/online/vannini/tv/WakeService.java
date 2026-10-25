package online.vannini.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

// Piccolo servizio sempre acceso: quando la Fire TV si risveglia dal riposo (schermo che si riaccende) riapre l'app
// sull'ultimo canale. Il risveglio non e' un riavvio, quindi BootReceiver da solo non basta.
// Parte all'accensione (BootReceiver) e ogni volta che si apre l'app; si ferma se «Avvio automatico» e' spento.
public class WakeService extends Service {
    private static final String CHANNEL = "avvio";
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final BroadcastReceiver screen = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent in) {
            c.getSharedPreferences("tv", Context.MODE_PRIVATE).edit().putString("wake_seen", BootReceiver.now()).apply();
            if (!c.getSharedPreferences("tv", Context.MODE_PRIVATE).getBoolean(BootReceiver.PREF, true)) return;
            ui.postDelayed(open, 1500);
            ui.postDelayed(open, 6000);   // la Home puo' comparire dopo: si riporta l'app davanti
        }
    };
    private final Runnable open = new Runnable() {
        @Override public void run() {
            try {
                startActivity(BootReceiver.launchIntent(WakeService.this));
                getSharedPreferences("tv", Context.MODE_PRIVATE).edit().putString("wake_try", "richiesta inviata " + BootReceiver.now()).apply();
            } catch (RuntimeException x) {
                getSharedPreferences("tv", Context.MODE_PRIVATE).edit().putString("wake_try", "bloccata (" + x.getClass().getSimpleName() + ")").apply();
            }
        }
    };

    static void start(Context c) {
        Intent i = new Intent(c, WakeService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
        } catch (RuntimeException ignored) { /* il sistema non lo permette ora: riprovera' alla prossima apertura */ }
    }

    static void stop(Context c) { c.stopService(new Intent(c, WakeService.class)); }

    @Override public void onCreate() {
        super.onCreate();
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Avvio automatico", NotificationManager.IMPORTANCE_MIN));
            b = new Notification.Builder(this, CHANNEL);
        } else {
            b = new Notification.Builder(this);
        }
        startForeground(1, b.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle("TV Vannini").setContentText("Riapre il canale al risveglio").build());
        registerReceiver(screen, new IntentFilter(Intent.ACTION_SCREEN_ON));
    }

    @Override public int onStartCommand(Intent in, int flags, int id) { return START_STICKY; }

    @Override public void onDestroy() {
        ui.removeCallbacksAndMessages(null);
        try { unregisterReceiver(screen); } catch (RuntimeException ignored) { }
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent in) { return null; }
}
