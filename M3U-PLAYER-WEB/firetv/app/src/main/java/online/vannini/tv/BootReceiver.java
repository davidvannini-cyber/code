package online.vannini.tv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Apre l'app quando la Fire TV si accende (dopo un riavvio o la corrente tolta).
public class BootReceiver extends BroadcastReceiver {
    static final String PREF = "boot";

    @Override public void onReceive(Context c, Intent in) {
        String a = in.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(a) && !"android.intent.action.QUICKBOOT_POWERON".equals(a)) return;
        if (!c.getSharedPreferences("tv", Context.MODE_PRIVATE).getBoolean(PREF, true)) return;
        Intent go = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        c.startActivity(go);
    }
}
