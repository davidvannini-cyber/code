package online.vannini.tv;

import java.text.Collator;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Canali italiani e ordine standard del digitale terrestre (LCN): stessa logica di public/dtt-it.js. */
final class Dtt {
    private Dtt() {}

    /** Un canale con tutte le sue versioni (fonti), in ordine di prova. */
    static final class Group {
        String id;
        List<Channel> alts;
        Channel head;
        int firstIndex;
        Integer lcn;
        Set<String> labels;
    }

    private static final Object[][] LCN = {
        {1, "rai1"}, {2, "rai2"}, {3, "rai3"}, {4, "rete4"}, {5, "canale5"}, {6, "italia1"}, {7, "la7"}, {8, "tv8"}, {9, "nove"},
        {20, "20", "20mediaset"}, {21, "rai4"}, {22, "iris"}, {23, "rai5"}, {24, "raimovie"}, {25, "raipremium"}, {26, "cielo"},
        {27, "27twentyseven", "twentyseven"}, {28, "tv2000"}, {29, "la7d"}, {30, "la5"}, {31, "realtime"}, {32, "qvc"},
        {33, "foodnetwork"}, {34, "cine34"}, {35, "focus"}, {36, "rtl1025", "rtl1025tv"}, {37, "warnertv"}, {38, "giallo"},
        {39, "topcrime"}, {40, "boing"}, {41, "k2"}, {42, "raigulp"}, {43, "raiyoyo"}, {44, "frisbee"}, {45, "cartoonnetwork"},
        {46, "cartoonito"}, {47, "super"}, {48, "rainews24", "rainews"}, {49, "italia2"}, {50, "skytg24"}, {51, "tgcom24"},
        {52, "dmax"}, {54, "raistoria"}, {55, "mediasetextra"}, {57, "raisport"}, {146, "raiscuola"},
    };

    private static final Map<String, Integer> BY_KEY = new HashMap<>();
    static {
        for (Object[] row : LCN) for (int i = 1; i < row.length; i++) BY_KEY.put((String) row[i], (Integer) row[0]);
    }

    private static final Pattern BRACKETS = Pattern.compile("\\[[^\\]]*\\]|\\([^)]*\\)");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern TRAILING_QUALITY = Pattern.compile("\\s+(hd|fhd|uhd|sd|4k|hevc|h265)$");
    private static final Pattern QUALITY = Pattern.compile("^(\\d{3,4}[pi]|hd|fhd|uhd|sd|4k)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern NUM_PREFIX = Pattern.compile("^\\s*\\[(\\d{1,4})\\]");
    private static final Pattern NUM_PREFIX_CLEAN = Pattern.compile("^\\s*\\[\\d{1,4}\\]\\s*");
    private static final Pattern COUNTRY = Pattern.compile("\\.([a-z]{2})(?:@|$)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PARENS = Pattern.compile("\\(([^)]*)\\)");
    private static final Pattern ITALY_GROUP = Pattern.compile("\\bital(y|ia|ian[oi]?)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern DOT_IT = Pattern.compile("\\.it$", Pattern.CASE_INSENSITIVE);
    private static final Pattern RES = Pattern.compile("(\\d{3,4})p\\b");

    // Chiave di confronto: minuscolo, senza accenti, senza testo tra () o [], senza qualita' finale, senza spazi.
    static String key(String name) {
        String s = Normalizer.normalize(name == null ? "" : name.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        s = BRACKETS.matcher(s).replaceAll(" ");
        s = s.replace("+", " plus ");
        s = NON_ALNUM.matcher(s).replaceAll(" ").trim();
        String prev;
        do { prev = s; s = TRAILING_QUALITY.matcher(s).replaceFirst(""); } while (!s.equals(prev));
        return s.replace(" ", "");
    }

    private static Integer tableLcn(Channel c) {
        Integer byName = BY_KEY.get(key(c.name));
        if (byName != null) return byName;
        String id = c.tvgId == null ? "" : c.tvgId.split("@", -1)[0];
        id = DOT_IT.matcher(id).replaceFirst("");
        return id.isEmpty() ? null : BY_KEY.get(key(id));
    }

    // In ordine di fiducia: tvg-chno della lista, prefisso "[12]" nel nome, tabella.
    static Integer lcnOf(Channel c) {
        if (c.chno != null && c.chno > 0) return c.chno;
        Matcher m = NUM_PREFIX.matcher(c.name == null ? "" : c.name);
        if (m.find()) return Integer.valueOf(m.group(1));
        return tableLcn(c);
    }

    static String cleanName(Channel c) {
        String s = NUM_PREFIX_CLEAN.matcher(c.name == null ? "" : c.name).replaceFirst("");
        return s.isEmpty() ? c.name : s;
    }

    private static String countryOf(Channel c) {
        Matcher m = COUNTRY.matcher(c.tvgId == null ? "" : c.tvgId);
        return m.find() ? m.group(1).toLowerCase(Locale.ROOT) : null;
    }

    // Testo tra parentesi che non e' una qualita' ne' "Italy": di solito e' il paese, es. "TV8 (Moldova)".
    private static boolean foreignTag(String name) {
        Matcher m = PARENS.matcher(name == null ? "" : name);
        while (m.find()) {
            String t = m.group(1).trim();
            if (!t.isEmpty() && !QUALITY.matcher(t).matches() && !t.toLowerCase(Locale.ROOT).contains("ital")) return true;
        }
        return false;
    }

    static boolean isItalian(Channel c) {
        String cc = countryOf(c);
        if (cc != null) return cc.equals("it");
        if (foreignTag(c.name)) return false;
        if (NUM_PREFIX.matcher(c.name == null ? "" : c.name).find()) return true;
        if (c.group != null && ITALY_GROUP.matcher(c.group).find()) return true;
        return tableLcn(c) != null;
    }

    private static boolean isGeo(Channel c) { return c.name != null && c.name.toLowerCase(Locale.ROOT).contains("[geo-blocked]"); }
    private static boolean isNot247(Channel c) { return c.name != null && c.name.toLowerCase(Locale.ROOT).contains("[not 24/7]"); }

    private static int resolution(Channel c) {
        Matcher m = RES.matcher(c.name == null ? "" : c.name);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    // Identita': canali con paese diverso (".tr") o con un paese tra parentesi non si fondono con quello italiano.
    private static String identity(Channel c) {
        String cc = countryOf(c);
        StringBuilder tags = new StringBuilder();
        Matcher m = PARENS.matcher(c.name == null ? "" : c.name);
        while (m.find()) {
            String t = m.group(1).trim().toLowerCase(Locale.ROOT);
            if (t.isEmpty() || QUALITY.matcher(t).matches() || t.contains("ital")) continue;
            if (tags.length() > 0) tags.append(',');
            tags.append(t);
        }
        Integer n = tableLcn(c);
        return (cc != null && !cc.equals("it") ? cc : "") + "|" + tags + "|" + (n != null ? "n" + n : key(cleanName(c)));
    }

    private static final class Item {
        final Channel c;
        final int i;
        Item(Channel c, int i) { this.c = c; this.i = i; }
    }

    // Dalla migliore: senza [Geo-blocked], fonte piu' in alto, senza [Not 24/7], risoluzione piu' alta, ordine originale.
    private static final Comparator<Item> RANK = new Comparator<Item>() {
        @Override public int compare(Item a, Item b) {
            int d = Boolean.compare(isGeo(a.c), isGeo(b.c));
            if (d != 0) return d;
            d = Integer.compare(a.c.src, b.c.src);
            if (d != 0) return d;
            d = Boolean.compare(isNot247(a.c), isNot247(b.c));
            if (d != 0) return d;
            d = Integer.compare(resolution(b.c), resolution(a.c));
            if (d != 0) return d;
            return Integer.compare(a.i, b.i);
        }
    };

    /** Un elemento per canale, con le sue versioni in ordine di prova. */
    static List<Group> groupChannels(List<Channel> channels) {
        Map<String, List<Item>> map = new LinkedHashMap<>();
        for (int i = 0; i < channels.size(); i++) {
            Channel c = channels.get(i);
            String id = identity(c);
            List<Item> list = map.get(id);
            if (list == null) { list = new ArrayList<>(); map.put(id, list); }
            list.add(new Item(c, i));
        }
        List<Group> groups = new ArrayList<>();
        for (Map.Entry<String, List<Item>> e : map.entrySet()) {
            List<Item> items = e.getValue();
            Collections.sort(items, RANK);
            Group g = new Group();
            g.id = e.getKey();
            g.alts = new ArrayList<>();
            Set<String> seenUrls = new HashSet<>();
            g.firstIndex = Integer.MAX_VALUE;
            g.labels = new LinkedHashSet<>();
            for (Item it : items) {
                if (seenUrls.add(it.c.url)) g.alts.add(it.c);       // stesso indirizzo in piu' liste: una volta sola
                g.firstIndex = Math.min(g.firstIndex, it.i);
                if (it.c.group != null) g.labels.add(it.c.group);
            }
            g.head = g.alts.get(0);
            for (Channel a : g.alts) {
                Integer n = lcnOf(a);
                if (n != null) { g.lcn = n; break; }
            }
            groups.add(g);
        }
        Collections.sort(groups, new Comparator<Group>() {
            @Override public int compare(Group a, Group b) { return Integer.compare(a.firstIndex, b.firstIndex); }
        });
        return groups;
    }

    /** Ordine DTT: prima i canali con numero, poi gli altri per nome. */
    static List<Group> sortGroups(List<Group> groups) {
        final Collator collator = Collator.getInstance(Locale.ITALIAN);
        List<Group> out = new ArrayList<>(groups);
        Collections.sort(out, new Comparator<Group>() {
            @Override public int compare(Group a, Group b) {
                if (a.lcn != null && b.lcn != null) {
                    int d = Integer.compare(a.lcn, b.lcn);
                    return d != 0 ? d : Integer.compare(a.firstIndex, b.firstIndex);
                }
                if (a.lcn != null) return -1;
                if (b.lcn != null) return 1;
                int d = collator.compare(cleanName(a.head), cleanName(b.head));
                return d != 0 ? d : Integer.compare(a.firstIndex, b.firstIndex);
            }
        });
        return out;
    }
}
