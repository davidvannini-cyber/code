package online.vannini.tv;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/** Stampa, per una playlist, i gruppi (id, numero, nome, n. alternative) e l'elenco «Italiani» ordinato: da confrontare con idcheck.js. */
public class IdCheck {
    public static void main(String[] a) throws Exception {
        List<Channel> ch = M3u.parse(new String(Files.readAllBytes(Paths.get(a[0])), "UTF-8"));
        List<Dtt.Group> groups = Dtt.groupChannels(ch);
        StringBuilder sb = new StringBuilder("canali=" + ch.size() + " gruppi=" + groups.size() + "\n");
        for (Dtt.Group g : groups) sb.append("G\t").append(g.id).append('\t').append(g.lcn).append('\t').append(Dtt.cleanName(g.head)).append('\t').append(g.alts.size()).append('\n');
        List<Dtt.Group> it = new ArrayList<>();
        for (Dtt.Group g : groups) for (Channel c : g.alts) if (Dtt.isItalian(c)) { it.add(g); break; }
        for (Dtt.Group g : Dtt.sortGroups(it)) sb.append("I\t").append(g.id).append('\t').append(g.lcn).append('\t').append(g.head.url).append('\n');
        System.out.print(sb);
    }
}
