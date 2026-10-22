package online.vannini.bgvideocal.prova;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import top.niunaijun.blackbox.BlackBoxCore;
import top.niunaijun.blackbox.entity.pm.InstallResult;

/** Prova: mette WhatsApp (gia' installato sul telefono) dentro il contenitore BlackBox e lo avvia. */
public class MainActivity extends Activity {
    private static final String WA = "com.whatsapp";
    private TextView log;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 64, 32, 32);

        Button install = new Button(this);
        install.setText("1. Metti WhatsApp nel contenitore");
        Button launch = new Button(this);
        launch.setText("2. Avvia WhatsApp dal contenitore");
        log = new TextView(this);
        log.setTextSize(15f);
        ScrollView sv = new ScrollView(this);
        sv.addView(log);

        root.addView(install);
        root.addView(launch);
        root.addView(sv);
        setContentView(root);

        say("Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + "), " + Build.MODEL);

        install.setOnClickListener(v -> new Thread(() -> {
            try {
                say("Installo WhatsApp nel contenitore...");
                InstallResult r = BlackBoxCore.get().installPackageAsUser(WA, 0);
                say("Risultato: " + (r.success ? "OK" : "ERRORE") + (r.msg != null ? " - " + r.msg : ""));
            } catch (Throwable t) {
                say("ERRORE: " + t);
            }
        }).start());

        launch.setOnClickListener(v -> {
            try {
                boolean ok = BlackBoxCore.get().launchApk(WA, 0);
                say("Avvio: " + (ok ? "richiesto" : "non riuscito (WhatsApp non e' nel contenitore?)"));
            } catch (Throwable t) {
                say("ERRORE: " + t);
            }
        });
    }

    private void say(String s) {
        runOnUiThread(() -> log.append(s + "\n\n"));
    }
}
