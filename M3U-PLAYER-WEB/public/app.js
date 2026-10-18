(function () {
  'use strict';
  const PAGE = 300;                       // canali mostrati per volta
  const $ = id => document.getElementById(id);
  const video = $('video');
  const player = $('player');
  const state = { it: false, channels: [], filtered: [], shown: 0, current: -1, hls: null, ts: null, fs: false, idleTimer: 0 };

  /* ---------- Elenco ---------- */
  async function loadPlaylist() {
    try {
      const res = await fetch('playlist.m3u', { cache: 'no-store' });
      if (res.status === 401) { location.href = 'login.html'; return; }
      if (!res.ok) throw new Error('risposta ' + res.status);
      state.channels = M3U.parseM3U(await res.text()).channels;
      fillGroups();
      applyFilter();
    } catch (e) {
      $('count').textContent = 'Impossibile caricare la playlist (' + e.message + ').';
    }
  }

  // Con "Italiani" attivo: solo i canali italiani, nell'ordine standard del digitale terrestre.
  function baseChannels() {
    if (!state.it) return state.channels;
    return DTT.sortDtt(DTT.preferWorking(state.channels.filter(DTT.isItalian)));
  }

  function fillGroups() {
    const keep = $('group').value;
    const groups = [...new Set(baseChannels().map(c => c.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    $('group').replaceChildren(new Option('Tutti i gruppi', ''), ...groups.map(g => new Option(g, g)));
    if (groups.includes(keep)) $('group').value = keep;
    $('group').hidden = groups.length === 0;
  }

  function applyFilter() {
    const q = $('search').value.trim().toLowerCase();
    const g = $('group').value;
    state.filtered = baseChannels().filter(c => (!g || c.group === g) && (!q || c.name.toLowerCase().includes(q)));
    state.shown = 0;
    $('channels').replaceChildren();
    renderMore();
  }

  function renderMore() {
    const list = $('channels');
    const slice = state.filtered.slice(state.shown, state.shown + PAGE);
    slice.forEach((c, i) => {
      const lcn = state.it ? DTT.lcnOf(c) : undefined;
      list.appendChild(row(c, state.it ? (lcn !== undefined ? String(lcn) : '') : String(state.shown + i + 1)));
    });
    state.shown += slice.length;
    $('more').hidden = state.shown >= state.filtered.length;
    $('count').textContent = !state.channels.length ? 'Nessun canale nella playlist.'
      : state.it ? state.filtered.length + ' canali italiani (ordine DTT) su ' + state.channels.length
      : state.filtered.length + ' di ' + state.channels.length + ' canali';
  }

  function span(cls, text) {
    const s = document.createElement('span');
    s.className = cls;
    if (text !== undefined) s.textContent = text;
    return s;
  }

  function row(c, n) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.appendChild(span('num', n));
    if (c.logo) {
      const img = document.createElement('img');
      img.src = c.logo; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = () => img.replaceWith(span('ph'));
      b.appendChild(img);
    } else {
      b.appendChild(span('ph'));
    }
    b.appendChild(span('name', DTT.cleanName(c)));
    if (c.group) b.appendChild(span('grp', c.group));
    b.addEventListener('click', () => openPlayer(c));
    li.appendChild(b);
    return li;
  }

  /* ---------- Schermo intero ---------- */
  // Va chiamato dentro il gestore del click: il browser concede il fullscreen solo a un gesto dell'utente.
  function openPlayer(c) {
    player.hidden = false;
    document.body.classList.add('noscroll');
    const req = player.requestFullscreen || player.webkitRequestFullscreen;
    if (req) {
      try { const p = req.call(player); if (p && p.catch) p.catch(() => {}); } catch (_) { /* resta il pannello a tutto schermo */ }
    }
    start(c);
    showBar();
  }

  function closePlayer() {
    stopPlayback();
    player.hidden = true;
    document.body.classList.remove('noscroll');
    state.fs = false;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }

  function onFullscreenChange() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (on) state.fs = true;
    else if (state.fs) closePlayer();      // l'utente e' uscito dal fullscreen (Esc): torna all'elenco
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  function step(delta) {
    const list = state.filtered;
    if (!list.length) return;
    const i = list.findIndex(c => c.id === state.current);
    start(list[(i + delta + list.length) % list.length]);
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
    const say = text => { if (state.current === token && !player.hidden) setMsg(text + ' [' + engine + ']', true, url); };
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
    $('title').textContent = DTT.cleanName(c);
    let url = c.url;
    // Una pagina https non puo' aprire flussi http: provo la versione https (molti server la offrono).
    if (location.protocol === 'https:' && url.startsWith('http:')) url = 'https:' + url.slice(5);
    setMsg('Caricamento…');

    let type = typeFromUrl(url);
    if (!type) {
      const found = await probe(url);
      if (state.current !== c.id) return;                    // nel frattempo ha scelto un altro canale
      if (found) { type = found.type; url = found.url; }
    }
    let engine;
    let triedNative = false;
    state.type = type; state.playUrl = url;
    const fail = () => {
      // hls.js ha bisogno del permesso CORS del server; il lettore nativo di alcuni browser no: prima di arrendersi lo provo.
      if (engine === 'hls.js' && !triedNative && video.canPlayType('application/vnd.apple.mpegurl')) {
        triedNative = true;
        engine = state.engine = 'nativo';
        if (state.hls) { state.hls.destroy(); state.hls = null; }
        video.src = url;
        video.play().catch(() => { /* l'utente puo' premere play */ });
        return;
      }
      diagnose(c, url, type, engine);
    };

    // hls.js ovunque tranne Safari (che legge l'HLS da solo): il lettore nativo di Chrome e' piu' recente e meno affidabile.
    if (type === 'hls' && window.Hls && Hls.isSupported() && !isSafari) {
      engine = 'hls.js';
      const hls = state.hls = new Hls();
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) fail(); });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      engine = 'nativo';
      video.src = url;
    } else if (type === 'dash' && window.dashjs) {
      engine = 'dash.js';
      const dash = state.dash = dashjs.MediaPlayer().create();
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
      video.src = url;                                   // ultima possibilita': il browser ci prova da solo
    }
    state.engine = engine;
    video.play().catch(() => { /* l'utente puo' premere play */ });
  }

  video.addEventListener('playing', () => setMsg(''));
  video.addEventListener('waiting', () => setMsg('Buffering…'));
  video.addEventListener('error', () => {
    const c = state.channels[state.current];
    if (video.error && video.getAttribute('src') && c) diagnose(c, state.playUrl || c.url, state.type, state.engine || 'browser');
  });

  /* ---------- Eventi ---------- */
  $('itOnly').addEventListener('change', () => {
    state.it = $('itOnly').checked;
    try { localStorage.setItem('m3u-player:it', state.it ? '1' : '0'); } catch (_) { /* storage non disponibile */ }
    fillGroups();
    applyFilter();
  });
  try { state.it = localStorage.getItem('m3u-player:it') === '1'; $('itOnly').checked = state.it; } catch (_) { /* storage non disponibile */ }
  $('search').addEventListener('input', applyFilter);
  $('group').addEventListener('change', applyFilter);
  $('more').addEventListener('click', renderMore);
  $('close').addEventListener('click', closePlayer);
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  ['mousemove', 'touchstart'].forEach(ev => player.addEventListener(ev, showBar, { passive: true }));
  document.addEventListener('keydown', e => {
    if (player.hidden) return;
    if (e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'Escape' && !state.fs) closePlayer();
    else showBar();
  });

  loadPlaylist();
})();
