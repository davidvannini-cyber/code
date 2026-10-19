(function () {
  'use strict';
  const PAGE = 300;                       // canali mostrati per volta
  const STARTUP_MS = 20000;               // se un canale non parte entro questo tempo si passa alla fonte successiva
  const ALT_KEY = 'm3u-player:alt';       // ultima fonte che ha funzionato per ogni canale
  const $ = id => document.getElementById(id);
  const video = $('video');
  const player = $('player');
  const state = {
    it: false, channels: [], groups: [], filtered: [], shown: 0,
    cur: null,                            // { g: gruppo, i: indice della fonte in prova }
    current: -1,                          // id del canale (fonte) in riproduzione
    hls: null, ts: null, dash: null, failFn: null, startTimer: 0,
    type: null, playUrl: null, engine: null, fs: false, idleTimer: 0,
  };

  /* ---------- Elenco ---------- */
  async function loadPlaylist() {
    try {
      const res = await fetch('playlist.m3u', { cache: 'no-store' });
      if (res.status === 401) { location.href = 'login.html'; return; }
      if (!res.ok) throw new Error('risposta ' + res.status);
      state.channels = M3U.parseM3U(await res.text()).channels;
      state.groups = DTT.groupChannels(state.channels);       // un elemento per canale, con le sue fonti
      fillGroups();
      applyFilter();
    } catch (e) {
      $('count').textContent = 'Impossibile caricare la playlist (' + e.message + ').';
    }
  }

  // Con "Italiani" attivo: solo i canali italiani, nell'ordine standard del digitale terrestre.
  function baseGroups() {
    if (!state.it) return state.groups;
    return DTT.sortGroups(state.groups.filter(g => g.alts.some(DTT.isItalian)));
  }

  function fillGroups() {
    const keep = $('group').value;
    const labels = [...new Set(baseGroups().flatMap(g => g.labels))].sort((a, b) => a.localeCompare(b));
    $('group').replaceChildren(new Option('Tutti i gruppi', ''), ...labels.map(l => new Option(l, l)));
    if (labels.includes(keep)) $('group').value = keep;
    $('group').hidden = labels.length === 0;
  }

  function applyFilter() {
    const q = $('search').value.trim().toLowerCase();
    const label = $('group').value;
    state.filtered = baseGroups().filter(g =>
      (!label || g.labels.includes(label)) && (!q || g.alts.some(c => DTT.cleanName(c).toLowerCase().includes(q))));
    state.shown = 0;
    $('channels').replaceChildren();
    renderMore();
  }

  function renderMore() {
    const list = $('channels');
    const slice = state.filtered.slice(state.shown, state.shown + PAGE);
    slice.forEach((g, i) => {
      const n = state.it ? (g.lcn !== undefined ? String(g.lcn) : '') : String(state.shown + i + 1);
      list.appendChild(row(g, n));
    });
    state.shown += slice.length;
    $('more').hidden = state.shown >= state.filtered.length;
    // Il conteggio non si mostra piu': resta solo un avviso quando non c'e' niente da vedere.
    $('count').textContent = state.filtered.length ? '' : (state.groups.length ? 'Nessun canale trovato.' : 'Nessun canale nella playlist.');
  }

  function span(cls, text) {
    const s = document.createElement('span');
    s.className = cls;
    if (text !== undefined) s.textContent = text;
    return s;
  }

  // Segnaposto al posto di un logo mancante: iniziali su un colore che dipende dal nome.
  function monogram(name) {
    const words = String(name).replace(/[^\p{L}\p{N} ]+/gu, '').split(/\s+/).filter(Boolean);
    const first = words[0] || '?';
    let text;
    if (/^\d+$/.test(first)) text = first.slice(0, 3);                                   // "20 Mediaset" -> 20
    else if (words.length > 1) text = (first[0] + words[1][0]).toUpperCase();              // "Rai 1" -> R1
    else text = (first.match(/^\D{1,2}\d{0,1}/) || [first.slice(0, 2)])[0].toUpperCase();   // "TV8" -> TV8, "LA7d" -> LA7
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
    const m = span('mono', text);
    m.style.setProperty('--h', h);
    return m;
  }

  function row(g, n) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.appendChild(span('num', n));
    const label = DTT.cleanName(g.head);
    if (g.logo) {
      const img = document.createElement('img');
      img.src = g.logo; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = () => img.replaceWith(monogram(label));
      b.appendChild(img);
    } else {
      b.appendChild(monogram(label));
    }
    const nm = span('nm');
    nm.appendChild(span('name', label));
    const epg = span('epg', epgText(g));
    epg._g = g;
    nm.appendChild(epg);
    b.appendChild(nm);
    if (g.alts.length > 1) b.appendChild(span('alts', '×' + g.alts.length));
    if (g.head.group) b.appendChild(span('grp', g.head.group));
    b.addEventListener('click', () => openPlayer(g));
    li.appendChild(b);
    return li;
  }

  /* ---------- Guida programmi (EPG) leggera: "adesso in onda" e "dopo" ---------- */
  const EPG_RELOAD_MS = 10 * 60 * 1000;
  const hhmm = secs => new Date(secs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  async function loadEpg() {
    try {
      const res = await fetch('api/epg', { cache: 'no-store' });
      if (!res.ok) throw new Error('risposta ' + res.status);
      const data = await res.json();
      if (data && data.channels) state.epg = data.channels;
    } catch (_) { /* senza guida i canali restano senza programma */ }
    paintEpg();
  }

  // Programma in corso e successivo del canale. Si provano le chiavi dei suoi indirizzi (nome e tvg-id) e il numero DTT.
  function epgNow(g) {
    if (!state.epg || !g.alts.some(DTT.isItalian)) return null;
    if (!g.epgKeys) {
      const keys = new Set();
      for (const a of g.alts) { keys.add(DTT.key(DTT.cleanName(a))); keys.add(DTT.idKey(a.tvgId)); }
      if (g.lcn !== undefined) keys.add(DTT.canonicalKey(g.lcn));
      g.epgKeys = [...keys].filter(Boolean);
    }
    const now = Date.now() / 1000;
    for (const k of g.epgKeys) {
      const list = state.epg[k];
      const i = list ? list.findIndex(p => p[0] <= now && now < p[1]) : -1;
      if (i >= 0) return { now: list[i], next: list[i + 1] || null };
    }
    return null;
  }

  function epgText(g) {
    const e = epgNow(g);
    return e ? e.now[2] + (e.next ? '  \u00B7  poi ' + hhmm(e.next[0]) + ' ' + e.next[2] : '') : '';
  }

  function paintEpg() {
    document.querySelectorAll('#channels .epg').forEach(el => { el.textContent = epgText(el._g); });
    setTitle();
    if (state.cur) updateMediaSession(state.cur.g);
  }

  // Titolo del lettore: canale, fonte e programma in corso.
  function setTitle() {
    const cur = state.cur;
    const c = state.channels[state.current];
    if (!cur || !c) return;
    const nAlts = cur.g.alts.length;
    const label = DTT.cleanName(c);
    const guide = epgNow(cur.g);
    $('title').textContent = (nAlts > 1 ? label + '  \u00B7  fonte ' + (cur.i + 1) + '/' + nAlts : label) + (guide ? '  \u00B7  ' + guide.now[2] : '');
  }

  /* ---------- Fonti alternative dello stesso canale ---------- */
  function rememberedUrls() {
    try { return JSON.parse(localStorage.getItem(ALT_KEY)) || {}; } catch (_) { return {}; }
  }
  function remember(g, url) {
    try {
      const all = rememberedUrls();
      all[g.id] = url;
      localStorage.setItem(ALT_KEY, JSON.stringify(all));
    } catch (_) { /* storage non disponibile */ }
  }

  // Parte dalla fonte che ha funzionato l'ultima volta, se c'e'.
  function playGroup(g) {
    updateMediaSession(g);
    const last = rememberedUrls()[g.id];
    const i = last ? g.alts.findIndex(c => c.url === last) : -1;
    state.cur = { g, i: i >= 0 ? i : 0 };
    start(g.alts[state.cur.i]);
  }

  // Passa alla fonte successiva dello stesso canale; false se non ce ne sono altre da provare.
  function failover() {
    const cur = state.cur;
    if (!cur || cur.i + 1 >= cur.g.alts.length) return false;
    cur.i += 1;
    start(cur.g.alts[cur.i]);
    return true;
  }

  function cycleSource() {
    const cur = state.cur;
    if (!cur || cur.g.alts.length < 2) return;
    cur.i = (cur.i + 1) % cur.g.alts.length;
    start(cur.g.alts[cur.i]);
    showBar();
  }

  /* ---------- Schermo intero ---------- */
  // Va chiamato dentro il gestore del click: il browser concede il fullscreen solo a un gesto dell'utente.
  function openPlayer(g) {
    player.hidden = false;
    document.body.classList.add('noscroll');
    const req = player.requestFullscreen || player.webkitRequestFullscreen;
    if (req) {
      try { const p = req.call(player); if (p && p.catch) p.catch(() => {}); } catch (_) { /* resta il pannello a tutto schermo */ }
    }
    playGroup(g);
    showBar();
  }

  function closePlayer() {
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    clearInterval(state.infoTimer);
    $('info').hidden = true;
    stopPlayback();
    state.cur = null;
    player.hidden = true;
    document.body.classList.remove('noscroll');
    state.fs = false;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }

  // Icone dei pulsanti (SVG disegnate, senza immagini esterne).
  const svg = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICON_ENTER = svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>');
  const ICON_EXIT = svg('<path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5"/>');
  const ICON_PIP = svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="12" y="12" width="6.5" height="4.5" rx="1" fill="currentColor" stroke="none"/>');

  const fullscreenOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  function updateFsButton() {
    const on = fullscreenOn();
    state.fs = on;
    $('fsToggle').innerHTML = on ? ICON_EXIT : ICON_ENTER;
    $('fsToggle').title = (on ? 'Esci dallo schermo intero' : 'Schermo intero') + ' (F)';
    $('fsToggle').setAttribute('aria-label', on ? 'Esci dallo schermo intero' : 'Schermo intero');
  }

  // Uscire dallo schermo intero (pulsante o Esc) lascia il video acceso: riempie la finestra del browser.
  // Per tornare all'elenco si usa la X.
  document.addEventListener('fullscreenchange', updateFsButton);
  document.addEventListener('webkitfullscreenchange', updateFsButton);

  function toggleFullscreen() {
    if (fullscreenOn()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const req = player.requestFullscreen || player.webkitRequestFullscreen;
      if (req) { try { const p = req.call(player); if (p && p.catch) p.catch(() => {}); } catch (_) { /* non disponibile */ } }
    }
  }

  /* Finestra flottante (Picture-in-Picture): il video resta in primo piano sopra le altre app. */
  const pipSupported = !!(document.pictureInPictureEnabled && video.requestPictureInPicture) ||
    !!(video.webkitSupportsPresentationMode && video.webkitSupportsPresentationMode('picture-in-picture'));

  async function togglePip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.webkitPresentationMode === 'picture-in-picture') video.webkitSetPresentationMode('inline');
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else if (video.webkitSetPresentationMode) video.webkitSetPresentationMode('picture-in-picture');
    } catch (_) {
      setMsg('La finestra flottante parte solo quando il video e\' in riproduzione: aspetta un attimo e riprova.', true);
    }
  }

  /* Canale precedente/successivo dai pulsanti della finestra flottante e dai tasti multimediali della tastiera. */
  function updateMediaSession(g) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      const guide = epgNow(g);
      navigator.mediaSession.metadata = new MediaMetadata({ title: DTT.cleanName(g.head), artist: guide ? guide.now[2] : 'TV Vannini' });
    } catch (_) { /* metadati non supportati */ }
  }

  if ('mediaSession' in navigator) {
    for (const [action, delta] of [['previoustrack', -1], ['nexttrack', 1]]) {
      try { navigator.mediaSession.setActionHandler(action, () => step(delta)); } catch (_) { /* azione non supportata dal browser */ }
    }
  }

  function step(delta) {
    const list = state.filtered;
    if (!list.length) return;
    const i = state.cur ? list.indexOf(state.cur.g) : -1;
    playGroup(list[(i + delta + list.length) % list.length]);
    showBar();
  }

  function showBar() {
    $('bar').classList.remove('idle');
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => $('bar').classList.add('idle'), 3000);
  }

  /* ---------- Riproduzione ---------- */
  function setMsg(text, isError, url) {
    $('msg').textContent = text;
    $('msg').classList.toggle('error', !!isError);
    const u = $('streamUrl');
    u.hidden = !url;
    u.textContent = url || '';
  }

  function stopPlayback() {
    clearTimeout(state.startTimer);
    state.failFn = null;
    if (state.hls) { state.hls.destroy(); state.hls = null; }
    if (state.ts) { state.ts.destroy(); state.ts = null; }
    if (state.dash) { state.dash.reset(); state.dash = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

  // Tipo di flusso dall'estensione dell'indirizzo; null se non si capisce (es. "relinker" della Rai).
  function typeFromUrl(url) {
    if (/\.m3u8(\?|#|$)/i.test(url)) return 'hls';
    if (/\.mpd(\?|#|$)/i.test(url)) return 'dash';
    if (/\.(ts|aac|mp3)(\?|#|$)/i.test(url)) return 'ts';
    return null;
  }

  // Indirizzo senza estensione: guarda cosa risponde il server (segue i reindirizzamenti) e ne deduce il tipo.
  async function probe(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ctl.signal });
      if (!res.ok) return null;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      const { value } = await res.body.getReader().read();
      const head = new TextDecoder().decode(value ? value.slice(0, 300) : new Uint8Array());
      ctl.abort();
      const final = res.url || url;
      if (head.startsWith('#EXTM3U') || ct.includes('mpegurl')) return { type: 'hls', url: final };
      if (/<MPD/i.test(head) || ct.includes('dash+xml')) return { type: 'dash', url: final };
      return { type: 'ts', url: final };
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Dopo un errore interroga il server del canale per capire il motivo, e lo spiega in italiano.
  async function diagnose(c, url, type, engine) {
    const token = state.current;
    const n = state.cur ? state.cur.g.alts.length : 1;
    const say = text => {
      if (state.current !== token || player.hidden) return;
      setMsg((n > 1 ? 'Nessuna delle ' + n + ' fonti parte. Ultima: ' : '') + text + ' [' + engine + ']', true, url);
    };
    const exp = /[~?&]exp=(\d{10})\b/.exec(url);
    if (exp && Number(exp[1]) * 1000 < Date.now()) {
      return say('Il link di questo canale e\' scaduto il ' + new Date(Number(exp[1]) * 1000).toLocaleDateString('it-IT') + ': la lista va aggiornata.');
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ctl.signal });
      if ([401, 403, 451].includes(res.status)) return say('Il server del canale rifiuta l\'accesso (errore ' + res.status + '): di solito blocco geografico o protezione contro i lettori web.');
      if (res.status === 404 || res.status === 410) return say('Il flusso non esiste piu\' (errore ' + res.status + ').');
      if (!res.ok) return say('Il server del canale risponde con errore ' + res.status + '.');
      if (type === 'ts' || !type) return say('Il server risponde, ma il browser non riesce a decodificare il flusso.');
      const text = (await res.text()).slice(0, 6000);
      if (type === 'hls') {
        if (!text.startsWith('#EXTM3U')) return say('Il server non restituisce un flusso HLS (probabilmente una pagina di errore).');
        if (/#EXT-X-(SESSION-)?KEY:[^\n]*(SAMPLE-AES|skd:|widevine|playready)/i.test(text)) return say('Il canale e\' protetto da DRM: un browser web non puo\' riprodurlo.');
      } else if (/<ContentProtection[^>]*(edef8ba9|9a04f079|widevine|playready)/i.test(text)) {
        return say('Il canale e\' protetto da DRM: un browser web non puo\' riprodurlo.');
      }
      say('La lista del flusso si legge, ma il video non parte: i segmenti sono bloccati o in un formato non supportato dal browser.');
    } catch (e) {
      say(e.name === 'AbortError'
        ? 'Il server del canale non risponde.'
        : 'Il server non permette a una pagina web di leggere il flusso (CORS) oppure non e\' raggiungibile da qui.');
    } finally {
      clearTimeout(timer);
    }
  }

  async function start(c) {
    stopPlayback();
    state.current = c.id;
    const cur = state.cur;
    const nAlts = cur ? cur.g.alts.length : 1;
    setTitle();
    $('alt').hidden = nAlts < 2;
    let url = c.url;
    // Una pagina https non puo' aprire flussi http: provo la versione https (molti server la offrono).
    if (location.protocol === 'https:' && url.startsWith('http:')) url = 'https:' + url.slice(5);
    setMsg(cur && cur.i > 0 ? 'Provo la fonte ' + (cur.i + 1) + ' di ' + nAlts + '…' : 'Caricamento…');

    let type = typeFromUrl(url);
    if (!type) {
      const found = await probe(url);
      if (state.current !== c.id) return;                    // nel frattempo ha scelto un altro canale
      if (found) { type = found.type; url = found.url; }
    }
    let engine;
    let triedNative = false;
    let failed = false;
    state.type = type; state.playUrl = url;
    const fail = () => {
      if (state.current !== c.id) return;
      // hls.js ha bisogno del permesso CORS del server; il lettore nativo di alcuni browser no: prima di arrendersi lo provo.
      if (engine === 'hls.js' && !triedNative && video.canPlayType('application/vnd.apple.mpegurl')) {
        triedNative = true;
        engine = state.engine = 'nativo';
        if (state.hls) { state.hls.destroy(); state.hls = null; }
        video.src = url;
        video.play().catch(() => { /* l'utente puo' premere play */ });
        return;
      }
      if (failed) return;
      failed = true;
      clearTimeout(state.startTimer);
      if (failover()) return;                                // c'e' un'altra fonte per questo canale
      diagnose(c, url, type, engine);
    };
    state.failFn = fail;
    state.startTimer = setTimeout(fail, STARTUP_MS);         // un server che non risponde mai non deve bloccare

    // hls.js ovunque tranne Safari (che legge l'HLS da solo): il lettore nativo di Chrome e' piu' recente e meno affidabile.
    if (type === 'hls' && window.Hls && Hls.isSupported() && !isSafari) {
      engine = 'hls.js';
      // Diretta TV: meglio qualche secondo di ritardo in piu' che scatti. Buffer piu' ampio e distanza maggiore dal bordo live.
      const hls = state.hls = new Hls({ lowLatencyMode: false, liveSyncDurationCount: 5, liveMaxLatencyDurationCount: 12,
        maxBufferLength: 40, maxMaxBufferLength: 90, backBufferLength: 30 });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) fail(); });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      engine = 'nativo';
      video.src = url;
    } else if (type === 'dash' && window.dashjs) {
      engine = 'dash.js';
      const dash = state.dash = dashjs.MediaPlayer().create();
      // Diretta TV: stare qualche secondo dietro il bordo della diretta, con piu' buffer, evita le fermate; niente "rincorsa" della diretta.
      try {
        dash.updateSettings({ streaming: {
          delay: { liveDelay: 25 },
          liveCatchup: { enabled: false },
          buffer: { fastSwitchEnabled: false, bufferTimeDefault: 25, bufferTimeAtTopQuality: 40, bufferTimeAtTopQualityLongForm: 40, bufferToKeep: 20 },
          gaps: { jumpGaps: true, jumpLargeGaps: true },
          retryAttempts: { MPD: 3, MediaSegment: 4 },
        } });
      } catch (_) { /* impostazioni non supportate da questa versione: si usano quelle predefinite */ }
      dash.on(dashjs.MediaPlayer.events.ERROR, fail);
      dash.initialize(video, url, true);
    } else if (type === 'ts' && window.mpegts && mpegts.getFeatureList().mseLivePlayback) {
      engine = 'mpegts.js';
      const ts = state.ts = mpegts.createPlayer({ type: 'mpegts', isLive: true, url });
      ts.on(mpegts.Events.ERROR, fail);
      ts.attachMediaElement(video);
      ts.load();
    } else {
      engine = 'browser';
      video.src = url;                                       // ultima possibilita': il browser ci prova da solo
    }
    state.engine = engine;
    video.play().catch(() => { /* l'utente puo' premere play */ });
  }

  video.addEventListener('playing', () => {
    clearTimeout(state.startTimer);
    setMsg('');
    if (state.cur) remember(state.cur.g, state.channels[state.current].url);
  });
  video.addEventListener('waiting', () => { if (!$('msg').classList.contains('error')) setMsg('Buffering…'); });
  video.addEventListener('error', () => {
    if (video.error && video.getAttribute('src') && state.failFn) state.failFn();
  });

  /* ---------- Pannello di diagnosi (tasto I) ---------- */
  function infoText() {
    const lines = [];
    const cur = state.cur;
    const c = state.channels[state.current];
    if (!c) return 'Nessun canale in riproduzione.';
    lines.push('Canale: ' + DTT.cleanName(c) + (cur ? '  (fonte ' + (cur.i + 1) + '/' + cur.g.alts.length + ')' : ''));
    lines.push('Motore: ' + (state.engine || '?') + '   tipo: ' + (state.type || '?'));
    lines.push('Indirizzo: ' + (state.playUrl || c.url));
    if (video.videoWidth) lines.push('Video: ' + video.videoWidth + '\u00D7' + video.videoHeight);
    try {
      const q = video.getVideoPlaybackQuality();
      const pct = q.totalVideoFrames ? (100 * q.droppedVideoFrames / q.totalVideoFrames).toFixed(1) : '0.0';
      lines.push('Frame persi: ' + q.droppedVideoFrames + ' su ' + q.totalVideoFrames + ' (' + pct + '%)');
    } catch (_) { /* non disponibile */ }
    try {
      const b = video.buffered;
      if (b.length) lines.push('Buffer in avanti: ' + Math.max(0, b.end(b.length - 1) - video.currentTime).toFixed(1) + ' s');
    } catch (_) { /* non disponibile */ }
    try {
      if (state.hls) {
        const lv = state.hls.levels[state.hls.currentLevel];
        if (lv) lines.push('Qualita\' scelta: ' + (lv.height ? lv.height + 'p ' : '') + Math.round(lv.bitrate / 1000) + ' kbit/s');
        if (state.hls.bandwidthEstimate) lines.push('Banda stimata: ' + Math.round(state.hls.bandwidthEstimate / 1000) + ' kbit/s');
      } else if (state.dash) {
        lines.push('Banda stimata: ' + Math.round(state.dash.getAverageThroughput('video')) + ' kbit/s');
        lines.push('Buffer (dash): ' + state.dash.getBufferLength('video').toFixed(1) + ' s   ritardo dalla diretta: ' + state.dash.getCurrentLiveLatency().toFixed(1) + ' s');
      }
    } catch (_) { /* non disponibile */ }
    lines.push('Il valore piu\' utile: se i frame persi salgono, il limite e\' il computer; se il buffer scende a 0, e\' la rete o la fonte.');
    return lines.join('\n');
  }

  function toggleInfo() {
    const box = $('info');
    box.hidden = !box.hidden;
    clearInterval(state.infoTimer);
    if (!box.hidden) {
      const tick = () => { box.textContent = infoText(); };
      tick();
      state.infoTimer = setInterval(tick, 1000);
    }
  }

  /* ---------- Eventi ---------- */
  $('itOnly').addEventListener('change', () => {
    state.it = $('itOnly').checked;
    try { localStorage.setItem('m3u-player:it', state.it ? '1' : '0'); } catch (_) { /* storage non disponibile */ }
    fillGroups();
    applyFilter();
  });
  // "Italiani (DTT)" e' attivo di default; se lo togli, la scelta resta ricordata.
  try { const saved = localStorage.getItem('m3u-player:it'); state.it = saved === null ? true : saved === '1'; } catch (_) { state.it = true; }
  $('itOnly').checked = state.it;
  $('theme').value = document.documentElement.getAttribute('data-theme') || 'aurora';
  $('theme').addEventListener('change', () => {
    document.documentElement.setAttribute('data-theme', $('theme').value);
    try { localStorage.setItem('m3u-player:theme-v2', $('theme').value); } catch (_) { /* storage non disponibile */ }
  });
  $('search').addEventListener('input', applyFilter);
  $('group').addEventListener('change', applyFilter);
  $('more').addEventListener('click', renderMore);
  $('close').addEventListener('click', closePlayer);
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('alt').addEventListener('click', cycleSource);
  // Il pulsante schermo intero/finestra serve dove il browser lo permette alle pagine (computer, Android).
  if (player.requestFullscreen || player.webkitRequestFullscreen) {
    $('fsToggle').hidden = false;
    $('fsToggle').addEventListener('click', () => { toggleFullscreen(); showBar(); });
    updateFsButton();
  }
  if (pipSupported) {
    $('pipBtn').hidden = false;
    $('pipBtn').innerHTML = ICON_PIP;
    $('pipBtn').addEventListener('click', () => { togglePip(); showBar(); });
  }
  // iPhone (Safari): il browser non concede lo schermo intero a una pagina, solo al video. Il pulsante apre il lettore
  // nativo a tutto schermo; dalla schermata Home (app installata) non serve, e' gia' tutto schermo.
  const canElementFullscreen = !!(player.requestFullscreen || player.webkitRequestFullscreen);
  if (!canElementFullscreen && video.webkitEnterFullscreen && !navigator.standalone) {
    $('fsBtn').hidden = false;
    $('fsBtn').addEventListener('click', () => { try { video.webkitEnterFullscreen(); } catch (_) { /* non disponibile */ } });
  }
  $('infoBtn').addEventListener('click', () => { toggleInfo(); showBar(); });
  ['mousemove', 'touchstart'].forEach(ev => player.addEventListener(ev, showBar, { passive: true }));
  // Tasti nel player. In fase di cattura e con stopImmediatePropagation, cosi' le frecce non spostano il cursore del video
  // (su un flusso in diretta non serve) e il player non le intercetta prima di noi.
  document.addEventListener('keydown', e => {
    if (player.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    const swallow = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { swallow(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { swallow(); step(-1); }
    else if (e.key === 'i' || e.key === 'I') { swallow(); toggleInfo(); showBar(); }
    else if ((e.key === 'f' || e.key === 'F') && !$('fsToggle').hidden) { swallow(); toggleFullscreen(); showBar(); }
    else if ((e.key === 'p' || e.key === 'P') && pipSupported) { swallow(); togglePip(); showBar(); }
    else showBar();
  }, true);

  loadPlaylist();
  loadEpg();
  setInterval(loadEpg, EPG_RELOAD_MS);
  setInterval(paintEpg, 60 * 1000);                          // il programma in corso cambia anche senza ricaricare la guida
})();
