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

  // Numero DTT dal solo nome o dall'id (tabella qui sopra).
  function tableLcn(channel) {
    const byName = byKey.get(key(channel.name));
    if (byName !== undefined) return byName;
    // id di iptv-org, es. "Rai1.it@SD" o "Rai1HD.it"
    const id = String(channel.tvgId || '').split('@')[0].replace(/\.it$/i, '');
    return id ? byKey.get(key(id)) : undefined;
  }

  // Numero del canale. In ordine di fiducia: tvg-chno della lista, prefisso "[12]" nel nome, tabella.
  function lcnOf(channel) {
    if (Number.isFinite(channel.chno) && channel.chno > 0) return channel.chno;
    const prefix = /^\s*\[(\d{1,4})\]/.exec(channel.name || '');
    if (prefix) return Number(prefix[1]);
    return tableLcn(channel);
  }

  // Nome da mostrare: senza il prefisso numerico "[12] " che alcune liste mettono davanti.
  function cleanName(channel) {
    return String(channel.name || '').replace(/^\s*\[\d{1,4}\]\s*/, '') || channel.name;
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
    if (/^\s*\[\d{1,4}\]/.test(channel.name || '')) return true;      // liste italiane numerate "[1] Rai 1"
    if (/\bital(y|ia|ian[oi]?)\b/i.test(channel.group || '')) return true;
    return tableLcn(channel) !== undefined;                              // e' un canale noto del DTT
  }

  const isGeo = c => /\[geo-blocked\]/i.test(c.name || '');
  const isNot247 = c => /\[not 24\/7\]/i.test(c.name || '');
  const resolution = c => Number((/(\d{3,4})p\b/.exec(c.name || '') || [])[1]) || 0;

  // Stesso canale in piu' versioni: se esiste una versione senza [Geo-blocked], le versioni [Geo-blocked] (di solito
  // indirizzi spenti) si nascondono. Un canale che esiste solo con [Geo-blocked] resta in elenco.
  function preferWorking(channels) {
    const groupOf = c => { const n = lcnOf(c); return n !== undefined ? 'n' + n : 'k' + key(c.name); };
    const hasWorking = new Set();
    for (const c of channels) if (!isGeo(c)) hasWorking.add(groupOf(c));
    return channels.filter(c => !isGeo(c) || !hasWorking.has(groupOf(c)));
  }

  // Ordine DTT: prima i canali con numero, poi gli altri per nome. A parita' di numero: senza [Geo-blocked],
  // senza [Not 24/7], risoluzione piu' alta, poi ordine originale della lista.
  function sortDtt(channels) {
    return channels
      .map((c, i) => ({ c, i, n: lcnOf(c) }))
      .sort((a, b) =>
        (a.n ?? Infinity) - (b.n ?? Infinity)
        || (a.n === undefined ? a.c.name.localeCompare(b.c.name, 'it') : 0)
        || isGeo(a.c) - isGeo(b.c)
        || isNot247(a.c) - isNot247(b.c)
        || resolution(b.c) - resolution(a.c)
        || a.i - b.i)
      .map(x => x.c);
  }

  const QUALITY = /^(\d{3,4}[pi]|hd|fhd|uhd|sd|4k)$/i;

  // Identita' di un canale per riconoscere lo stesso canale in liste diverse. Canali con paese diverso (id ".tr") o con un
  // paese tra parentesi ("TV8 (Moldova)") non si fondono con quello italiano.
  function identity(channel) {
    const cc = countryOf(channel);
    const tags = [...String(channel.name || '').matchAll(/\(([^)]*)\)/g)].map(m => m[1].trim().toLowerCase())
      .filter(t => t && !QUALITY.test(t) && !/ital/.test(t)).join(',');
    const n = tableLcn(channel);
    return (cc && cc !== 'it' ? cc : '') + '|' + tags + '|' + (n !== undefined ? 'n' + n : key(cleanName(channel)));
  }

  // Alternative dello stesso canale, dalla migliore: senza [Geo-blocked], fonte piu' in alto, senza [Not 24/7],
  // risoluzione piu' alta, ordine originale.
  function rankAlts(items) {
    return items.sort((a, b) =>
      isGeo(a.c) - isGeo(b.c) || (a.c.src || 0) - (b.c.src || 0) || isNot247(a.c) - isNot247(b.c)
      || resolution(b.c) - resolution(a.c) || a.i - b.i);
  }

  // Un elemento per canale: { id, alts: [versioni in ordine di prova], head, lcn, logo, labels, firstIndex }.
  function groupChannels(channels) {
    const map = new Map();
    channels.forEach((c, i) => {
      const id = identity(c);
      let list = map.get(id);
      if (!list) map.set(id, list = []);
      list.push({ c, i });
    });
    const groups = [];
    for (const [id, items] of map) {
      const seenUrls = new Set();
      const alts = rankAlts(items).map(x => x.c).filter(c => !seenUrls.has(c.url) && seenUrls.add(c.url));   // stesso indirizzo in piu' liste: una volta sola
      const nums = alts.map(lcnOf).filter(n => n !== undefined);
      groups.push({
        id, alts, head: alts[0],
        firstIndex: Math.min(...items.map(x => x.i)),
        lcn: nums.length ? nums[0] : undefined,
        logo: (alts.find(a => a.logo) || {}).logo || null,
        labels: [...new Set(alts.map(a => a.group).filter(Boolean))],
      });
    }
    return groups.sort((a, b) => a.firstIndex - b.firstIndex);
  }

  // Ordine DTT dei gruppi: prima quelli con numero, poi gli altri per nome.
  function sortGroups(groups) {
    return [...groups].sort((a, b) =>
      (a.lcn ?? Infinity) - (b.lcn ?? Infinity)
      || (a.lcn === undefined ? cleanName(a.head).localeCompare(cleanName(b.head), 'it') : 0)
      || a.firstIndex - b.firstIndex);
  }

  const api = { key, lcnOf, cleanName, isItalian, preferWorking, sortDtt, identity, groupChannels, sortGroups };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DTT = api;
})(typeof window !== 'undefined' ? window : globalThis);
