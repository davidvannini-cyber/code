package online.vannini.tv;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Guida programmi leggera (api/epg): "adesso in onda" e "dopo" per ogni canale, stesse chiavi del sito. */
final class Epg {
    static final class Prog {
        final long start;
        final long stop;
        final String title;
        Prog(long start, long stop, String title) { this.start = start; this.stop = stop; this.title = title; }
    }

    private final Map<String, List<Prog>> channels = new HashMap<>();
    private final Map<Dtt.Group, List<String>> keyCache = new HashMap<>();

    /** Legge il JSON { updated, channels: { chiave: [[inizio, fine, titolo], ...] } }. */
    static Epg parse(String json) throws JSONException {
        Epg epg = new Epg();
        JSONObject all = new JSONObject(json).getJSONObject("channels");
        Iterator<String> it = all.keys();
        while (it.hasNext()) {
            String key = it.next();
            JSONArray arr = all.getJSONArray(key);
            List<Prog> list = new ArrayList<>(arr.length());
            for (int i = 0; i < arr.length(); i++) {
                JSONArray p = arr.getJSONArray(i);
                list.add(new Prog(p.getLong(0), p.getLong(1), p.getString(2)));
            }
            epg.channels.put(key, list);
        }
        return epg;
    }

    // Si provano le chiavi dei suoi indirizzi (nome e tvg-id) e il numero DTT.
    private List<String> keysOf(Dtt.Group g) {
        List<String> keys = keyCache.get(g);
        if (keys == null) {
            Set<String> set = new LinkedHashSet<>();
            for (Channel a : g.alts) {
                set.add(Dtt.key(Dtt.cleanName(a)));
                set.add(Dtt.idKey(a.tvgId));
            }
            String canonical = Dtt.canonicalKey(g.lcn);
            if (canonical != null) set.add(canonical);
            set.remove("");
            keys = new ArrayList<>(set);
            keyCache.put(g, keys);
        }
        return keys;
    }

    /** { in corso, successivo (o null) } oppure null se la guida non ha il canale. */
    Prog[] nowNext(Dtt.Group g) {
        long now = System.currentTimeMillis() / 1000;
        for (String k : keysOf(g)) {
            List<Prog> list = channels.get(k);
            if (list == null) continue;
            for (int i = 0; i < list.size(); i++) {
                Prog p = list.get(i);
                if (p.start <= now && now < p.stop) return new Prog[] { p, i + 1 < list.size() ? list.get(i + 1) : null };
            }
        }
        return null;
    }

    /** "TG1  ·  poi 20:40 Affari tuoi" oppure "" se non c'e' niente. */
    String text(Dtt.Group g) {
        Prog[] e = nowNext(g);
        if (e == null) return "";
        if (e[1] == null) return e[0].title;
        DateFormat hm = DateFormat.getTimeInstance(DateFormat.SHORT, Locale.ITALY);
        return e[0].title + "  ·  poi " + hm.format(new Date(e[1].start * 1000)) + " " + e[1].title;
    }
}
