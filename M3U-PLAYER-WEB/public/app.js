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
    return DTT.sortDtt(state.channels.filter(DTT.isItalian));
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
    b.appendChild(span('name', c.name));
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
  function setMsg(text, isError) {
    $('msg').textContent = text;
    $('msg').classList.toggle('error', !!isError);
  }

  function stopPlayback() {
    if (state.hls) { state.hls.destroy(); state.hls = null; }
    if (state.ts) { state.ts.destroy(); state.ts = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  function start(c) {
    stopPlayback();
    state.current = c.id;
    $('title').textContent = c.name;
    const url = c.url;
    if (location.protocol === 'https:' && url.startsWith('http:')) {
      return setMsg('La pagina e\' in https e il flusso e\' http: il browser lo blocca (contenuto misto).', true);
    }
    setMsg('Caricamento…');
    const isHls = /\.m3u8(\?|#|$)/i.test(url);
    const fatal = msg => setMsg('Errore: ' + msg, true);

    if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;                                   // Safari / iOS: HLS nativo
    } else if (isHls && window.Hls && Hls.isSupported()) {
      const hls = state.hls = new Hls();
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) fatal(d.details); });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (!isHls && window.mpegts && mpegts.getFeatureList().mseLivePlayback) {
      const ts = state.ts = mpegts.createPlayer({ type: 'mpegts', isLive: true, url });
      ts.on(mpegts.Events.ERROR, (type, detail) => fatal(type + ' ' + detail));
      ts.attachMediaElement(video);
      ts.load();
    } else {
      video.src = url;                                   // ultima possibilita': il browser ci prova da solo
    }
    video.play().catch(() => { /* l'utente puo' premere play */ });
  }

  video.addEventListener('playing', () => setMsg(''));
  video.addEventListener('waiting', () => setMsg('Buffering…'));
  video.addEventListener('error', () => {
    if (video.error && video.getAttribute('src')) setMsg('Il browser non riesce a riprodurre questo flusso.', true);
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
