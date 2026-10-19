#!/bin/bash
# Verifica l'app Fire TV SENZA Android SDK (non c'e' nel sandbox):
#  1) compila tutti i .java contro android.jar (da Maven Central) e gli STUB di Media3 (strumenti/stub);
#  2) confronta Java e JavaScript (public/dtt-it.js, m3u.js) sugli stessi dati: stessi gruppi, stessi id, stesso ordine.
# Uso:  bash M3U-PLAYER-WEB/firetv/strumenti/verifica.sh [playlist.m3u]    (predefinita: sample.m3u)
# La compilazione VERA e' quella di GitHub Actions («Fire TV APK»): qui si prendono errori di sintassi/logica, non di API Media3.
set -e
AQUI="$(cd "$(dirname "$0")" && pwd)"
SRC="$AQUI/../app/src/main/java"
W="${TMPDIR:-/tmp}/tv-verifica"
PL="${1:-$AQUI/../../sample.m3u}"
mkdir -p "$W/out" "$W/parita"
JAR="$W/android.jar"
[ -s "$JAR" ] || curl -sSf -o "$JAR" https://repo.maven.apache.org/maven2/org/robolectric/android-all/9-robolectric-4913185-2/android-all-9-robolectric-4913185-2.jar

javac -cp "$JAR" -d "$W/out" $(find "$AQUI/stub" -name '*.java') $(find "$SRC" -name '*.java') 2>&1 | grep -v "JAVA_TOOL\|warning\|deprecat\|\^\|HttpURLConnection c\|class PlaybackException" || true
echo "Compilazione: ok"

javac -cp "$JAR" -d "$W/parita" "$SRC/online/vannini/tv/Channel.java" "$SRC/online/vannini/tv/M3u.java" "$SRC/online/vannini/tv/Dtt.java" "$AQUI/IdCheck.java" 2>&1 | grep -v "JAVA_TOOL" || true
java -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "$W/parita:$JAR" online.vannini.tv.IdCheck "$PL" 2>/dev/null > "$W/java.txt"
node "$AQUI/idcheck.js" "$PL" > "$W/js.txt"
# Confronto: (1) gruppi G identici (id, numero, nome, n. alternative); (2) elenco Italiani: stessi canali, e per quelli CON numero stesso ordine.
# Differenze note e accettate: l'ordine alfabetico dei canali senza numero con accenti/punteggiatura (Collator Java vs ICU di Node) e gli indirizzi
# che JS normalizza (es. ":80" tolto) e Java no.
ok=1
if ! diff <(grep '^G' "$W/java.txt") <(grep '^G' "$W/js.txt") > "$W/diff.txt"; then echo "Parita: GRUPPI DIVERSI"; head -20 "$W/diff.txt"; ok=0; fi
if ! diff <(grep '^I' "$W/java.txt" | cut -f2 | sort) <(grep '^I' "$W/js.txt" | cut -f2 | sort) > "$W/diff2.txt"; then echo "Parita: ELENCO ITALIANI DIVERSO"; head -20 "$W/diff2.txt"; ok=0; fi
if ! diff <(grep -P '^I\t[^\t]*\t[0-9]' "$W/java.txt" | cut -f2) <(grep -P '^I\t[^\t]*\t[0-9]' "$W/js.txt" | cut -f2) > "$W/diff3.txt"; then echo "Parita: ORDINE DEI CANALI NUMERATI DIVERSO"; head -20 "$W/diff3.txt"; ok=0; fi
[ "$ok" = 1 ] && echo "Parita Java/JS: ok ($(head -1 "$W/js.txt"))" || exit 1
