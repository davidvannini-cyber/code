package online.vannini.tv;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Parser M3U/M3U8 esteso (#EXTM3U / #EXTINF), stesso comportamento di public/m3u.js. */
final class M3u {
    private M3u() {}

    private static final Pattern CHNO = Pattern.compile("^\\d{1,4}$");

    private static final class Scan {
        final Map<String, String> attrs = new HashMap<>();
        int end;
    }

    // Legge coppie chiave="valore" (o chiave=valore) da una stringa.
    private static Scan scanAttributes(String s, int from, boolean stopAtComma) {
        Scan r = new Scan();
        int i = from;
        int n = s.length();
        while (i < n) {
            char c = s.charAt(i);
            if (c == ',' && stopAtComma) break;
            if (c == ' ') { i++; continue; }
            StringBuilder key = new StringBuilder();
            while (i < n && s.charAt(i) != '=' && !(stopAtComma && s.charAt(i) == ',') && s.charAt(i) != ' ') key.append(s.charAt(i++));
            if (i >= n || s.charAt(i) != '=') continue;
            i++;
            StringBuilder value = new StringBuilder();
            if (i < n && s.charAt(i) == '"') {
                i++;
                while (i < n && s.charAt(i) != '"') value.append(s.charAt(i++));
                i++;
            } else {
                while (i < n && s.charAt(i) != ' ' && !(stopAtComma && s.charAt(i) == ',')) value.append(s.charAt(i++));
            }
            if (key.length() > 0) r.attrs.put(key.toString().toLowerCase(Locale.ROOT), value.toString());
        }
        r.end = i;
        return r;
    }

    /** Restituisce i canali; lista vuota se il testo non e' una playlist. */
    static List<Channel> parse(String text) {
        List<Channel> out = new ArrayList<>();
        String[] raw = text.replace("﻿", "").split("\\r?\\n");
        List<String> lines = new ArrayList<>(raw.length);
        for (String l : raw) {
            String t = l.trim();
            if (!t.isEmpty()) lines.add(t);
        }
        if (lines.isEmpty() || !lines.get(0).startsWith("#EXTM3U")) return out;

        Scan pending = null;
        String pendingTitle = "";
        String pendingGroup = null;
        int currentSrc = 0;                      // dichiarata da righe "#X-SOURCE:n" nelle playlist unite

        for (int k = 1; k < lines.size(); k++) {
            String line = lines.get(k);
            if (line.startsWith("#EXTINF:")) {
                String s = line.substring("#EXTINF:".length());
                int i = 0;
                while (i < s.length() && s.charAt(i) != ' ' && s.charAt(i) != ',') i++;     // durata
                pending = scanAttributes(s, i, true);
                pendingTitle = pending.end < s.length() && s.charAt(pending.end) == ',' ? s.substring(pending.end + 1).trim() : "";
            } else if (line.startsWith("#X-SOURCE:")) {
                currentSrc = toInt(line.substring("#X-SOURCE:".length()));
            } else if (line.startsWith("#EXTGRP:")) {
                pendingGroup = line.substring("#EXTGRP:".length()).trim();
            } else if (line.startsWith("#")) {
                continue;
            } else {
                String lower = line.toLowerCase(Locale.ROOT);
                if (!lower.startsWith("http://") && !lower.startsWith("https://")) continue;
                Map<String, String> a = pending != null ? pending.attrs : new HashMap<String, String>();
                Channel c = new Channel();
                String title = pending != null ? pendingTitle : "";
                c.name = !title.isEmpty() ? title : nz(a.get("tvg-name")) != null ? a.get("tvg-name") : host(line, out.size());
                c.url = line;
                c.logo = nz(a.get("tvg-logo"));
                c.group = nz(a.get("group-title")) != null ? a.get("group-title") : nz(pendingGroup);
                c.tvgId = nz(a.get("tvg-id"));
                String no = a.get("tvg-chno");
                c.chno = no != null && CHNO.matcher(no).matches() ? Integer.valueOf(no) : null;
                String x = a.get("x-src");
                c.src = x != null && toInt(x) != 0 ? toInt(x) : currentSrc;
                out.add(c);
                pending = null;
                pendingTitle = "";
                pendingGroup = null;
            }
        }
        return out;
    }

    private static String nz(String s) { return s == null || s.isEmpty() ? null : s; }

    private static int toInt(String s) {
        try { return Integer.parseInt(s.trim()); } catch (NumberFormatException e) { return 0; }
    }

    private static String host(String url, int index) {
        try {
            String h = java.net.URI.create(url).getHost();
            if (h != null && !h.isEmpty()) return h;
        } catch (IllegalArgumentException ignored) { /* indirizzo con caratteri non validi */ }
        return "Canale " + (index + 1);
    }
}
