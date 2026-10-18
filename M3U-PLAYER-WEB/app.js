(function () {
  'use strict';
  const PAGE = 300;                       // canali mostrati per volta
  const STORE_KEY = 'm3u-player:last';
  const $ = id => document.getElementById(id);
  const video = $('video');
  const state = { channels: [], filtered: [], shown: 0, current: -1, hls: null, ts: null };

  function setStatus(text, isError) {
    $('status').textContent = text;
    $('status').classList.toggle('error', !!isError);
  }

  /* ---------- Playlist ---------- */
  function loadText(text, label, sourceUrl) {
    try {
      const { channels } = M3U.parseM3U(text);
      if (!channels.length) throw new Error('La playlist non contiene canali http/https.');
      state.channels = channels;
      fillGroups();
      applyFilter();
      setStatus(label + ': ' + channels.length + ' canali. Scegline uno.');
      try { localStorage.setItem(STORE_KEY, text); } catch (_) { /* quota piena o storage bloccato */ }
    } catch (e) {
      if (e.code === 'hls-manifest') setStatus('Questo e\' un flusso HLS, non una lista di canali: lo riproduco direttamente.');
      else { setStatus(e.message, true); return; }
      if (sourceUrl) play({ id: -1, name: 'Flusso', url: sourceUrl, group: null });
      else setStatus('Questo e\' un flusso HLS, non una lista di canali: inserisci il suo URL con "Carica URL".', true);
    }
  }

  async function loadUrl(url) {
    if (!/^https?:\/\//i.test(url)) return setStatus('Inserisci un URL che inizia con http:// o https://', true);
    setStatus('Scarico la playlist…');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Il server ha risposto ' + res.status);
      loadText(await res.text(), 'Playlist da URL', url);
    } catch (e) {
      setStatus('Impossibile scaricare la playlist (' + e.message + '). Spesso e\' un blocco CORS del server: ' +
        'scarica il file e usa "Apri file", oppure incolla il testo.', true);
    }
  }

  /* ---------- Elenco ---------- */
  function fillGroups() {
    const sel = $('group');
    const groups = [...new Set(state.channels.map(c => c.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    sel.replaceChildren(new Option('Tutti i gruppi', ''), ...groups.map(g => new Option(g, g)));
  }

  function applyFilter() {
    const q = $('search').value.trim().toLowerCase();
    const g = $('group').value;
    state.filtered = state.channels.filter(c => (!g || c.group === g) && (!q || c.name.toLowerCase().includes(q)));
    state.shown = 0;
    $('channels').replaceChildren();
    renderMore();
  }

  function renderMore() {
    const list = $('channels');
    const slice = state.filtered.slice(state.shown, state.shown + PAGE);
    for (const c of slice) list.appendChild(row(c));
    state.shown += slice.length;
    $('more').hidden = state.shown >= state.filtered.length;
    $('count').textContent = state.channels.length
      ? state.filtered.length + ' di ' + state.channels.length + ' canali' : '';
  }

  function row(c) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = c.id;
    if (c.id === state.current) b.classList.add('active');
    if (c.logo) {
      const img = document.createElement('img');
      img.src = c.logo; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'ph' }));
      b.appendChild(img);
    } else {
      b.appendChild(Object.assign(document.createElement('span'), { className: 'ph' }));
    }
    const name = Object.assign(document.createElement('span'), { className: 'name', textContent: c.name });
    b.appendChild(name);
    if (c.group) b.appendChild(Object.assign(document.createElement('span'), { className: 'grp', textContent: c.group }));
    b.addEventListener('click', () => play(c));
    li.appendChild(b);
    return li;
  }

  /* ---------- Player ---------- */
  function destroyPlayers() {
    if (state.hls) { state.hls.destroy(); state.hls = null; }
    if (state.ts) { state.ts.destroy(); state.ts = null; }
    video.removeAttribute('src');
    video.load();
  }

  function play(c) {
    destroyPlayers();
    state.current = c.id;
    document.querySelectorAll('#channels button').forEach(b => b.classList.toggle('active', Number(b.dataset.id) === c.id));
    const url = c.url;
    if (location.protocol === 'https:' && url.startsWith('http:')) {
      return setStatus('Questa pagina e\' in https e il flusso e\' http: il browser lo blocca (contenuto misto). ' +
        'Apri la pagina da file locale o da un indirizzo http.', true);
    }
    setStatus('Caricamento di ' + c.name + '…');
    const isHls = /\.m3u8(\?|#|$)/i.test(url);
    const fatal = msg => setStatus('Errore su ' + c.name + ': ' + msg, true);

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

  video.addEventListener('playing', () => { const c = state.channels[state.current]; if (c) setStatus('In riproduzione: ' + c.name); });
  video.addEventListener('waiting', () => setStatus('Buffering…'));
  video.addEventListener('error', () => {
    if (video.error && !state.hls && !state.ts) setStatus('Il browser non riesce a riprodurre questo flusso.', true);
  });

  /* ---------- Eventi ---------- */
  $('file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (f) loadText(await f.text(), f.name);
    e.target.value = '';
  });
  $('urlBtn').addEventListener('click', () => loadUrl($('urlInput').value.trim()));
  $('urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('urlBtn').click(); });
  $('pasteBtn').addEventListener('click', () => loadText($('paste').value, 'Testo incollato'));
  $('sampleBtn').addEventListener('click', () => loadUrl(new URL('sample.m3u', location.href).href));
  $('search').addEventListener('input', applyFilter);
  $('group').addEventListener('change', applyFilter);
  $('more').addEventListener('click', renderMore);

  // Ripristina l'ultima playlist usata.
  try {
    const last = localStorage.getItem(STORE_KEY);
    if (last) loadText(last, 'Ultima playlist');
  } catch (_) { /* storage non disponibile */ }
})();
