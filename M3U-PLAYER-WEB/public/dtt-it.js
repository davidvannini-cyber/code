/* Canali italiani e ordine standard del digitale terrestre (DTT / LCN).
   ATTENZIONE: la numerazione qui sotto e' scritta a mano dalla memoria e puo' contenere errori o essere cambiata:
   controllala e correggila liberamente. Le chiavi sono nomi "compattati" (minuscolo, senza spazi ne' simboli). */
(function (root) {
  // numero DTT -> nomi possibili del canale (anche senza spazi: "Rai 1" == "Rai1")
  const LCN = {
    1: ['rai1'], 2: ['rai2'], 3: ['rai3'], 4: ['rete4'], 5: ['canale5'], 6: ['italia1'], 7: ['la7'], 8: ['tv8'], 9: ['nove'],
    20: ['20', '20mediaset'], 21: ['rai4'], 22: ['iris'], 23: ['rai5'], 24: ['raimovie'], 25: ['raipremium'], 26: ['cielo'],
    27: ['27twentyseven', 'twentyseven'], 28: ['tv2000'], 29: ['la7d'], 30: ['la5'], 31: ['realtime'], 32: ['qvc'],
    33: ['foodnetwork'], 34: ['cine34'], 35: ['focus'], 36: ['rtl1025', 'rtl1025tv'], 37: ['warnertv'], 38: ['giallo'],
    39: ['topcrime'], 40: ['boing'], 41: ['k2'], 42: ['raigulp'], 43: ['raiyoyo'], 44: ['frisbee'], 45: ['cartoonnetwork'],
    46: ['cartoonito'], 47: ['super'], 48: ['rainews24', 'rainews'], 49: ['italia2'], 50: ['skytg24'], 51: ['tgcom24'],
    52: ['dmax'], 54: ['raistoria'], 55: ['mediasetextra'], 57: ['raisport'], 146: ['raiscuola'],
  };

  // Chiave di confronto: minuscolo, senza accenti, senza testo tra () o [], senza qualita' finale (HD, 4K…), senza spazi.
  function key(name) {
    let s = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
      .replace(/\+/g, ' plus ')
      .replace(/[^a-z0-9]+/g, ' ').trim();
    let prev;
    do { prev = s; s = s.replace(/\s+(hd|fhd|uhd|sd|4k|hevc|h265)$/, ''); } while (s !== prev);
    return s.replace(/ /g, '');
  }

  const byKey = new Map();
  for (const [lcn, names] of Object.entries(LCN)) for (const n of names) byKey.set(n, Number(lcn));

  function lcnOf(channel) {
    const byName = byKey.get(key(channel.name));
    if (byName !== undefined) return byName;
    // id di iptv-org, es. "Rai1.it@SD" o "Rai1HD.it"
    const id = String(channel.tvgId || '').split('@')[0].replace(/\.it$/i, '');
    return id ? byKey.get(key(id)) : undefined;
  }

  // Paese indicato dall'id della lista (iptv-org: "Rai1.it@SD", "TV8.tr@SD"), se presente.
  function countryOf(channel) {
    const m = /\.([a-z]{2})(?:@|$)/i.exec(channel.tvgId || '');
    return m ? m[1].toLowerCase() : null;
  }

  // Testo tra parentesi tonde che non e' una qualita' (1080p, HD...) ne' "Italy": di solito e' il paese, es. "TV8 (Moldova)".
  function foreignTag(name) {
    const tags = [...String(name || '').matchAll(/\(([^)]*)\)/g)].map(m => m[1].trim());
    return tags.some(t => t && !/^(\d{3,4}[pi]|hd|fhd|uhd|sd|4k)$/i.test(t) && !/ital/i.test(t));
  }

  // Se la lista dichiara il paese, vale quello. Altrimenti si guarda il nome e il gruppo.
  function isItalian(channel) {
    const cc = countryOf(channel);
    if (cc) return cc === 'it';
    if (foreignTag(channel.name)) return false;
    if (/\bital(y|ia|ian[oi]?)\b/i.test(channel.group || '')) return true;
    return lcnOf(channel) !== undefined;                                 // e' un canale noto del DTT
  }

  // Ordine DTT: prima i canali con numero (stesso numero = ordine originale), poi gli altri per nome.
  function sortDtt(channels) {
    return channels
      .map((c, i) => ({ c, i, n: lcnOf(c) }))
      .sort((a, b) => (a.n ?? Infinity) - (b.n ?? Infinity) || (a.n === undefined ? a.c.name.localeCompare(b.c.name, 'it') : 0) || a.i - b.i)
      .map(x => x.c);
  }

  const api = { key, lcnOf, isItalian, sortDtt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DTT = api;
})(typeof window !== 'undefined' ? window : globalThis);
