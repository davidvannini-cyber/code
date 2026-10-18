package online.vannini.tv;

/** Una voce della playlist: un indirizzo di un canale, con i dati della riga #EXTINF. */
final class Channel {
    String name;
    String url;
    String logo;
    String group;
    String tvgId;
    Integer chno;      // tvg-chno: numero scelto dalla lista
    int src;           // fonte (lista) di provenienza nella playlist unita
}
