package online.vannini.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.display.DisplayManager;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Display;

// Piccolo servizio sempre acceso: quando la Fire TV si risveglia dal riposo riapre l'app sull'ultimo canale.
// Il risveglio non e' un riavvio, quindi BootReceiver da solo non basta. Sulla Fire TV lo schermo per il sistema non si spegne mai
// (provato con adb: displayState e isInteractive restano attivi): l'unico segnale che cambia e' il collegamento audio HDMI con la TV
// (ACTION_HDMI_AUDIO_PLUG: 0 allo spegnimento, 1 al risveglio, con 5-10 s di «ballo» 1-0-1-0-1). Si ascolta quello; gli altri segnali
// restano solo per il registro del MENU → «Avvio automatico».
// Parte all'accensione (BootReceiver) e ogni volta che si apre l'app; si ferma se «Avvio automatico» e' spento.
public class WakeService extends Service {
    private static final String CHANNEL = "avvio";
    private final Handler ui = new Handler(Looper.getMainLooper());
    private DisplayManager displays;
    private int lastDisplayState = Display.STATE_ON;
    private int hdmi = 1;             // ultimo stato del collegamento HDMI (1 = TV collegata)
    private boolean away;             // la TV e' rimasta spenta (HDMI scollegato) per almeno 5 secondi

    private final BroadcastReceiver signals = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent in) {
            String a = in.getAction() == null ? "?" : in.getAction();
            String name = a.substring(a.lastIndexOf('.') + 1);
            if (!AudioManager.ACTION_HDMI_AUDIO_PLUG.equals(a)) BootReceiver.log(c, name);
            if (AudioManager.ACTION_HDMI_AUDIO_PLUG.equals(a)) {
                hdmi(in.getIntExtra(AudioManager.EXTRA_AUDIO_PLUG_STATE, 0));
                return;
            }
            if (Intent.ACTION_SCREEN_OFF.equals(a)) { ui.removeCallbacks(open); return; }
            if (Intent.ACTION_SCREEN_ON.equals(a) || Intent.ACTION_USER_PRESENT.equals(a) || a.endsWith("DREAMING_STOPPED")) schedule();
        }
    };

    private final DisplayManager.DisplayListener display = new DisplayManager.DisplayListener() {
        @Override public void onDisplayAdded(int id) { }
        @Override public void onDisplayRemoved(int id) { }
        @Override public void onDisplayChanged(int id) {
            if (id != Display.DEFAULT_DISPLAY) return;
            int st = displays.getDisplay(id).getState();
            if (st == lastDisplayState) return;
            BootReceiver.log(WakeService.this, "schermo " + (st == Display.STATE_ON ? "acceso" : st == Display.STATE_OFF ? "spento" : "stato " + st));
            if (st == Display.STATE_ON) schedule(); else ui.removeCallbacks(open);
            lastDisplayState = st;
        }
    };

    // Apre l'app dopo ogni attesa indicata (ms); la Home puo' comparire dopo, quindi si riporta l'app davanti piu' volte.
    private void schedule(long... delays) {
        if (!getSharedPreferences("tv", Context.MODE_PRIVATE).getBoolean(BootReceiver.PREF, true)) return;
        ui.removeCallbacks(open);
        for (long d : delays) ui.postDelayed(open, d);
    }

    private void schedule() { schedule(1500, 6000); }

    // HDMI scollegato per 5 secondi = TV spenta. Al ritorno a 1 si apre l'app, e si ripete finche' il segnale smette di ballare.
    private final Runnable markAway = new Runnable() {
        @Override public void run() {
            if (hdmi == 0) { away = true; BootReceiver.log(WakeService.this, "TV spenta (HDMI scollegato da 5 s)"); }
        }
    };

    private void hdmi(int state) {
        hdmi = state;
        BootReceiver.log(this, "HDMI " + (state == 1 ? "collegato" : "scollegato"));
        ui.removeCallbacks(markAway);
        if (state == 0) { ui.postDelayed(markAway, 5000); return; }
        if (!away) return;
        // away resta vero finche' il segnale non e' stabile: lo azzera l'apertura dell'ultima ripetizione
        schedule(2000, 6000, 12000);
        ui.removeCallbacks(clearAway);
        ui.postDelayed(clearAway, 20000);
    }

    private final Runnable clearAway = new Runnable() {
        @Override public void run() { if (hdmi == 1) away = false; }
    };

    private final Runnable open = new Runnable() {
        @Override public void run() {
            try {
                startActivity(BootReceiver.launchIntent(WakeService.this));
                BootReceiver.log(WakeService.this, "apro l'app");
            } catch (RuntimeException x) {
                BootReceiver.log(WakeService.this, "apertura bloccata (" + x.getClass().getSimpleName() + ")");
            }
        }
    };

    static void start(Context c) {
        Intent i = new Intent(c, WakeService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
        } catch (RuntimeException x) {
            BootReceiver.log(c, "servizio non partito (" + x.getClass().getSimpleName() + ")");
        }
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
        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_SCREEN_ON);
        f.addAction(Intent.ACTION_SCREEN_OFF);
        f.addAction(Intent.ACTION_USER_PRESENT);
        f.addAction("android.intent.action.DREAMING_STARTED");
        f.addAction("android.intent.action.DREAMING_STOPPED");
        f.addAction(AudioManager.ACTION_HDMI_AUDIO_PLUG);
        registerReceiver(signals, f);
        displays = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
        lastDisplayState = displays.getDisplay(Display.DEFAULT_DISPLAY).getState();
        displays.registerDisplayListener(display, ui);
        BootReceiver.log(this, "servizio partito (" + SystemClock.elapsedRealtime() / 1000 + " s dopo l'accensione)");
    }

    @Override public int onStartCommand(Intent in, int flags, int id) { return START_STICKY; }

    @Override public void onTaskRemoved(Intent root) {
        BootReceiver.log(this, "app chiusa dai recenti");
        super.onTaskRemoved(root);
    }

    @Override public void onDestroy() {
        BootReceiver.log(this, "servizio fermato");
        ui.removeCallbacksAndMessages(null);
        try { unregisterReceiver(signals); } catch (RuntimeException ignored) { }
        try { displays.unregisterDisplayListener(display); } catch (RuntimeException ignored) { }
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent in) { return null; }
}
