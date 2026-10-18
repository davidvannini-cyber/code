package online.vannini.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import androidx.annotation.OptIn;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.TreeSet;

/**
 * Lettore TV per Fire TV: legge la stessa lista del sito (tv.vannini.online/playlist.m3u) e la riproduce con ExoPlayer.
 * Telecomando: OK guarda, sinistra/destra (o su/giu') cambiano canale, MENU cambia fonte, Indietro torna alla lista.
 */
@OptIn(markerClass = UnstableApi.class)
public class MainActivity extends Activity {
    private static final String PLAYLIST_URL = "https://tv.vannini.online/playlist.m3u";
    private static final String USER_AGENT = "Mozilla/5.0 (Linux; Android 9; AFTMM) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Safari/537.36";
    private static final int STARTUP_MS = 20000;           // se un canale non parte entro questo tempo si passa alla fonte successiva
    private static final int ZAP_DELAY_MS = 350;           // attesa prima di avviare, se si scorrono i canali in fretta
    private static final int BANNER_MS = 4000;
    private static final int INFO_MS = 8000;
    private static final int MAX_PLAYLIST_BYTES = 24 * 1024 * 1024;

    private static final int COLOR_BG = Color.rgb(10, 11, 30);
    private static final int COLOR_ACCENT = Color.rgb(123, 92, 255);

    private final Handler ui = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;

    // Dati
    private List<Dtt.Group> all = new ArrayList<>();
    private List<Dtt.Group> shown = new ArrayList<>();
    private boolean italianOnly = true;
    private String label;                                   // gruppo scelto, null = tutti
    private String status = "Carico la lista…";

    // Lista
    private LinearLayout listScreen;
    private TextView header;
    private ListView list;
    private ChannelAdapter adapter;

    // Lettore
    private FrameLayout playerScreen;
    private SurfaceView surface;
    private TextView banner;
    private TextView message;
    private TextView info;
    private ExoPlayer player;
    private boolean inPlayer;
    private Dtt.Group cur;
    private int altIdx;
    private Channel curCh;
    private boolean triedHls;
    private int swallowUp = -1;

    private final Runnable startTimer = new Runnable() {
        @Override public void run() { onNoStart("Il canale non risponde"); }
    };
    private final Runnable zapRun = new Runnable() {
        @Override public void run() { if (inPlayer && cur != null) playGroup(cur); }
    };
    private final Runnable hideBanner = new Runnable() {
        @Override public void run() { banner.setVisibility(View.GONE); }
    };
    private final Runnable hideInfo = new Runnable() {
        @Override public void run() { info.setVisibility(View.GONE); }
    };

    /* ---------- Avvio ---------- */
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("tv", Context.MODE_PRIVATE);
        italianOnly = prefs.getBoolean("it", true);
        buildUi();
        refresh();
    }

    @Override protected void onStop() {
        super.onStop();
        if (inPlayer) closePlayer();
    }

    @Override protected void onDestroy() {
        ui.removeCallbacksAndMessages(null);
        releasePlayer();
        super.onDestroy();
    }

    /* ---------- Interfaccia ---------- */
    private int dp(int v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    private TextView text(int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(COLOR_BG);

        listScreen = new LinearLayout(this);
        listScreen.setOrientation(LinearLayout.VERTICAL);
        listScreen.setPadding(dp(48), dp(24), dp(48), dp(16));

        header = text(20, Color.WHITE, true);
        header.setPadding(dp(12), 0, 0, dp(4));
        listScreen.addView(header);
        TextView hint = text(14, Color.argb(170, 255, 255, 255), false);
        hint.setText("OK: guarda   ·   MENU: filtri e aggiornamento   ·   nel video: ◄ ► cambiano canale, MENU cambia fonte");
        hint.setPadding(dp(12), 0, 0, dp(10));
        listScreen.addView(hint);

        list = new ListView(this);
        list.setDivider(null);
        list.setSelector(rounded(Color.argb(150, 123, 92, 255)));
        list.setDrawSelectorOnTop(false);
        list.setFocusable(true);
        adapter = new ChannelAdapter();
        list.setAdapter(adapter);
        list.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override public void onItemClick(AdapterView<?> parent, View v, int pos, long id) {
                if (pos >= 0 && pos < shown.size()) openPlayer(shown.get(pos));
            }
        });
        listScreen.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        root.addView(listScreen, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        playerScreen = new FrameLayout(this);
        playerScreen.setBackgroundColor(Color.BLACK);
        playerScreen.setVisibility(View.GONE);
        surface = new SurfaceView(this);
        playerScreen.addView(surface, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        banner = overlay(26, Gravity.BOTTOM | Gravity.START, dp(48), dp(40));
        message = overlay(22, Gravity.CENTER, 0, 0);
        info = overlay(18, Gravity.TOP | Gravity.START, dp(48), dp(32));
        playerScreen.addView(info);
        playerScreen.addView(banner);
        playerScreen.addView(message);
        root.addView(playerScreen, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(root);
        updateHeader();
        list.requestFocus();
    }

    private GradientDrawable rounded(int color) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(10));
        return d;
    }

    private TextView overlay(int sp, int gravity, int marginX, int marginY) {
        TextView t = text(sp, Color.WHITE, false);
        t.setBackground(rounded(Color.argb(190, 10, 11, 30)));
        t.setPadding(dp(18), dp(10), dp(18), dp(10));
        t.setVisibility(View.GONE);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, gravity);
        lp.setMargins(marginX, marginY, marginX, marginY);
        t.setLayoutParams(lp);
        return t;
    }

    private void updateHeader() {
        String filter = italianOnly ? "Italiani (DTT)" : "Tutti i canali";
        if (label != null) filter += " · " + label;
        header.setText(shown.isEmpty() ? status : "TV · " + filter + " · " + shown.size() + " canali");
    }

    private final class ChannelAdapter extends BaseAdapter {
        @Override public int getCount() { return shown.size(); }
        @Override public Object getItem(int i) { return shown.get(i); }
        @Override public long getItemId(int i) { return i; }

        @Override public View getView(int pos, View convert, ViewGroup parent) {
            LinearLayout row;
            if (convert instanceof LinearLayout) {
                row = (LinearLayout) convert;
            } else {
                row = new LinearLayout(MainActivity.this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(Gravity.CENTER_VERTICAL);
                row.setPadding(dp(12), dp(8), dp(12), dp(8));
                TextView num = text(20, Color.argb(190, 255, 255, 255), true);
                num.setGravity(Gravity.END);
                row.addView(num, new LinearLayout.LayoutParams(dp(64), ViewGroup.LayoutParams.WRAP_CONTENT));
                TextView name = text(24, Color.WHITE, false);
                name.setSingleLine(true);
                name.setPadding(dp(20), 0, 0, 0);
                row.addView(name, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
                TextView grp = text(16, Color.argb(150, 255, 255, 255), false);
                grp.setSingleLine(true);
                row.addView(grp);
            }
            Dtt.Group g = shown.get(pos);
            TextView num = (TextView) row.getChildAt(0);
            TextView name = (TextView) row.getChildAt(1);
            TextView grp = (TextView) row.getChildAt(2);
            num.setText(italianOnly ? (g.lcn != null ? String.valueOf(g.lcn) : "") : String.valueOf(pos + 1));
            name.setText(Dtt.cleanName(g.head) + (g.alts.size() > 1 ? "  ×" + g.alts.size() : ""));
            grp.setText(g.head.group != null ? g.head.group : "");
            return row;
        }
    }

    /* ---------- Lista dei canali ---------- */
    private File cacheFile() { return new File(getFilesDir(), "playlist.m3u"); }

    // Mostra subito l'ultima lista salvata, poi scarica quella aggiornata dal sito.
    private void refresh() {
        status = "Carico la lista…";
        updateHeader();
        new Thread(new Runnable() {
            @Override public void run() {
                List<Channel> cached = readCache();
                if (!cached.isEmpty()) postApply(cached);
                try {
                    String text = download();
                    List<Channel> fresh = M3u.parse(text);
                    if (!fresh.isEmpty()) {
                        writeCache(text);
                        postApply(fresh);
                    } else if (cached.isEmpty()) {
                        postStatus("La lista è vuota. Aggiungi le liste dall'area /admin del sito.");
                    }
                } catch (IOException e) {
                    if (cached.isEmpty()) postStatus("Impossibile caricare la lista (" + e.getMessage() + "). MENU: riprova.");
                }
            }
        }).start();
    }

    private List<Channel> readCache() {
        File f = cacheFile();
        if (!f.exists()) return Collections.emptyList();
        try {
            java.io.FileInputStream in = new java.io.FileInputStream(f);
            try { return M3u.parse(readAll(in)); } finally { in.close(); }
        } catch (IOException e) {
            return Collections.emptyList();
        }
    }

    private void writeCache(String text) {
        try {
            File tmp = new File(getFilesDir(), "playlist.tmp");
            FileOutputStream out = new FileOutputStream(tmp);
            try { out.write(text.getBytes(StandardCharsets.UTF_8)); } finally { out.close(); }
            if (!tmp.renameTo(cacheFile())) tmp.delete();
        } catch (IOException ignored) { /* senza copia salvata si riscarica la prossima volta */ }
    }

    private String download() throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(PLAYLIST_URL).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(20000);
        c.setRequestProperty("User-Agent", USER_AGENT);
        try {
            int code = c.getResponseCode();
            if (code != 200) throw new IOException("risposta " + code);
            return readAll(c.getInputStream());
        } finally {
            c.disconnect();
        }
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
            if (out.size() > MAX_PLAYLIST_BYTES) throw new IOException("lista troppo grande");
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private void postApply(final List<Channel> channels) {
        final List<Dtt.Group> groups = Dtt.groupChannels(channels);
        ui.post(new Runnable() {
            @Override public void run() { all = groups; applyFilter(); }
        });
    }

    private void postStatus(final String s) {
        ui.post(new Runnable() {
            @Override public void run() { status = s; updateHeader(); }
        });
    }

    private List<Dtt.Group> base() {
        if (!italianOnly) return all;
        List<Dtt.Group> it = new ArrayList<>();
        for (Dtt.Group g : all) {
            for (Channel c : g.alts) {
                if (Dtt.isItalian(c)) { it.add(g); break; }
            }
        }
        return Dtt.sortGroups(it);
    }

    private void applyFilter() {
        String keepId = cur != null ? cur.id : currentSelectionId();
        List<Dtt.Group> out = new ArrayList<>();
        for (Dtt.Group g : base()) if (label == null || g.labels.contains(label)) out.add(g);
        shown = out;
        adapter.notifyDataSetChanged();
        updateHeader();
        int idx = indexOf(keepId);
        if (idx >= 0) list.setSelection(idx);
    }

    private String currentSelectionId() {
        int p = list.getSelectedItemPosition();
        return p >= 0 && p < shown.size() ? shown.get(p).id : null;
    }

    private int indexOf(String id) {
        if (id == null) return -1;
        for (int i = 0; i < shown.size(); i++) if (shown.get(i).id.equals(id)) return i;
        return -1;
    }

    // MENU: filtri (italiani/tutti, gruppi) e aggiornamento della lista.
    private void showFilters() {
        final List<String> items = new ArrayList<>();
        final List<String> labels = new ArrayList<>();
        items.add("Italiani (ordine DTT)");
        items.add("Tutti i canali");
        items.add("Aggiorna la lista");
        TreeSet<String> groupNames = new TreeSet<>();
        for (Dtt.Group g : base()) groupNames.addAll(g.labels);
        for (String l : groupNames) { items.add("Gruppo: " + l); labels.add(l); }
        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle("TV Vannini")
            .setItems(items.toArray(new String[0]), new android.content.DialogInterface.OnClickListener() {
                @Override public void onClick(android.content.DialogInterface d, int which) {
                    if (which == 0 || which == 1) {
                        italianOnly = which == 0;
                        label = null;
                        prefs.edit().putBoolean("it", italianOnly).apply();
                        applyFilter();
                    } else if (which == 2) {
                        refresh();
                    } else {
                        label = labels.get(which - 3);
                        applyFilter();
                    }
                }
            })
            .show();
    }

    /* ---------- Lettore ---------- */
    private void ensurePlayer() {
        if (player != null) return;
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setUserAgent(USER_AGENT)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(10000)
            .setReadTimeoutMs(15000);
        // Poca memoria (Fire TV Stick Lite): buffer contenuto, sufficiente per una diretta.
        DefaultLoadControl load = new DefaultLoadControl.Builder()
            .setBufferDurationsMs(15000, 30000, 2500, 5000)
            .build();
        player = new ExoPlayer.Builder(this)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(http))
            .setLoadControl(load)
            .build();
        player.setVideoSurfaceView(surface);
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int s) {
                if (!inPlayer) return;
                if (s == Player.STATE_READY) {
                    ui.removeCallbacks(startTimer);
                    setMessage(null);
                    if (cur != null && curCh != null) prefs.edit().putString("alt|" + cur.id, curCh.url).apply();
                } else if (s == Player.STATE_BUFFERING) {
                    setMessage("Buffering…");
                    ui.removeCallbacks(startTimer);
                    ui.postDelayed(startTimer, STARTUP_MS);
                }
            }

            @Override public void onPlayerError(PlaybackException e) { onFail(e); }
        });
    }

    private void releasePlayer() {
        if (player != null) {
            player.release();
            player = null;
        }
    }

    private void openPlayer(Dtt.Group g) {
        inPlayer = true;
        listScreen.setVisibility(View.GONE);
        playerScreen.setVisibility(View.VISIBLE);
        ensurePlayer();
        playGroup(g);
    }

    private void closePlayer() {
        ui.removeCallbacks(startTimer);
        ui.removeCallbacks(zapRun);
        ui.removeCallbacks(hideBanner);
        ui.removeCallbacks(hideInfo);
        inPlayer = false;
        releasePlayer();
        banner.setVisibility(View.GONE);
        info.setVisibility(View.GONE);
        message.setVisibility(View.GONE);
        playerScreen.setVisibility(View.GONE);
        listScreen.setVisibility(View.VISIBLE);
        int idx = indexOf(cur != null ? cur.id : null);
        if (idx >= 0) list.setSelection(idx);
        list.requestFocus();
        cur = null;
    }

    // Parte dalla fonte che ha funzionato l'ultima volta, se c'e'.
    private void playGroup(Dtt.Group g) {
        cur = g;
        String last = prefs.getString("alt|" + g.id, null);
        altIdx = 0;
        if (last != null) {
            for (int i = 0; i < g.alts.size(); i++) if (g.alts.get(i).url.equals(last)) { altIdx = i; break; }
        }
        startAlt();
        showBanner();
    }

    private static String guessMime(String url) {
        String u = url.toLowerCase(Locale.ROOT);
        if (u.contains(".m3u8")) return MimeTypes.APPLICATION_M3U8;
        if (u.contains(".mpd")) return MimeTypes.APPLICATION_MPD;
        return null;
    }

    private void startAlt() {
        triedHls = false;
        curCh = cur.alts.get(altIdx);
        play(guessMime(curCh.url));
    }

    private void play(String mime) {
        if (player == null) return;
        MediaItem.Builder b = new MediaItem.Builder().setUri(curCh.url);
        if (mime != null) b.setMimeType(mime);
        player.setMediaItem(b.build());
        player.prepare();
        player.setPlayWhenReady(true);
        setMessage("Avvio…");
        ui.removeCallbacks(startTimer);
        ui.postDelayed(startTimer, STARTUP_MS);
    }

    private void onFail(PlaybackException e) {
        if (!inPlayer || player == null) return;
        if (e.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) {      // la diretta e' andata avanti: si riparte dal punto live
            player.seekToDefaultPosition();
            player.prepare();
            return;
        }
        // Indirizzo senza estensione: se non e' un file video si prova come HLS.
        if (!triedHls && guessMime(curCh.url) == null && e.errorCode == PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED) {
            triedHls = true;
            play(MimeTypes.APPLICATION_M3U8);
            return;
        }
        onNoStart(e.getErrorCodeName());
    }

    // La fonte corrente non funziona: si passa alla successiva dello stesso canale.
    private void onNoStart(String reason) {
        ui.removeCallbacks(startTimer);
        if (!inPlayer || cur == null) return;
        if (altIdx + 1 < cur.alts.size()) {
            altIdx++;
            startAlt();
            showBanner();
            return;
        }
        if (player != null) player.stop();
        setMessage("Questo canale non parte (" + reason + ").\n◄ ► altro canale   ·   MENU: riprova dalla prima fonte");
    }

    private void setMessage(String s) {
        if (s == null) { message.setVisibility(View.GONE); return; }
        message.setText(s);
        message.setVisibility(View.VISIBLE);
    }

    private void showBanner() {
        if (cur == null) return;
        String n = cur.lcn != null && italianOnly ? cur.lcn + "   " : "";
        String src = cur.alts.size() > 1 ? "\nFonte " + (altIdx + 1) + " di " + cur.alts.size() : "";
        banner.setText(n + Dtt.cleanName(cur.head) + src);
        banner.setVisibility(View.VISIBLE);
        ui.removeCallbacks(hideBanner);
        ui.postDelayed(hideBanner, BANNER_MS);
    }

    private void toggleInfo() {
        if (info.getVisibility() == View.VISIBLE) { info.setVisibility(View.GONE); return; }
        if (cur == null || curCh == null || player == null) return;
        StringBuilder s = new StringBuilder(Dtt.cleanName(cur.head));
        s.append("\nFonte ").append(altIdx + 1).append(" di ").append(cur.alts.size());
        try { s.append("\nServer: ").append(URI.create(curCh.url).getHost()); } catch (IllegalArgumentException ignored) { /* indirizzo non valido */ }
        Format f = player.getVideoFormat();
        s.append("\nVideo: ");
        if (f == null) s.append("in attesa");
        else s.append(f.width).append("×").append(f.height).append(f.codecs != null ? " · " + f.codecs : "");
        info.setText(s.toString());
        info.setVisibility(View.VISIBLE);
        ui.removeCallbacks(hideInfo);
        ui.postDelayed(hideInfo, INFO_MS);
    }

    // Canale precedente (-1) o successivo (+1) nell'elenco mostrato; parte dopo una breve attesa se si scorre in fretta.
    private void zap(int dir) {
        int n = shown.size();
        if (n == 0 || cur == null) return;
        int i = indexOf(cur.id);
        i = i < 0 ? 0 : (i + dir + n) % n;
        cur = shown.get(i);
        if (player != null) player.stop();
        setMessage(null);
        showBanner();
        ui.removeCallbacks(startTimer);
        ui.removeCallbacks(zapRun);
        ui.postDelayed(zapRun, ZAP_DELAY_MS);
    }

    private void cycleSource() {
        if (cur == null) return;
        if (cur.alts.size() < 2) {
            setMessage("Per questo canale c'è una sola fonte");
            ui.postDelayed(new Runnable() { @Override public void run() { if (player != null && player.getPlaybackState() == Player.STATE_READY) setMessage(null); } }, 2000);
            return;
        }
        altIdx = (altIdx + 1) % cur.alts.size();
        startAlt();
        showBanner();
    }

    /* ---------- Telecomando ---------- */
    private boolean handlePlayerKey(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_DOWN:
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
            case KeyEvent.KEYCODE_MEDIA_REWIND:
            case KeyEvent.KEYCODE_CHANNEL_DOWN:
                zap(-1);
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_MEDIA_NEXT:
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
            case KeyEvent.KEYCODE_CHANNEL_UP:
                zap(1);
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                toggleInfo();
                return true;
            case KeyEvent.KEYCODE_MENU:
                cycleSource();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (player != null) {
                    boolean play = code == KeyEvent.KEYCODE_MEDIA_PLAY || (code == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE && !player.getPlayWhenReady());
                    player.setPlayWhenReady(play);
                    setMessage(play ? null : "In pausa");
                }
                return true;
            case KeyEvent.KEYCODE_BACK:
                closePlayer();
                return true;
            default:
                return false;
        }
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (e.getAction() == KeyEvent.ACTION_UP && code == swallowUp) {      // il rilascio di un tasto gia' gestito non deve arrivare al sistema
            swallowUp = -1;
            return true;
        }
        if (e.getAction() == KeyEvent.ACTION_DOWN) {
            if (inPlayer) {
                if (e.getRepeatCount() == 0 && handlePlayerKey(code)) { swallowUp = code; return true; }
                if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_MENU) return true;
            } else if (code == KeyEvent.KEYCODE_MENU && e.getRepeatCount() == 0) {
                swallowUp = code;
                showFilters();
                return true;
            }
        }
        return super.dispatchKeyEvent(e);
    }
}
