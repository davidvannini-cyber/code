(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  function say(text, isError) {
    $('msg').textContent = text;
    $('msg').classList.toggle('error', !!isError);
  }

  async function api(path, options) {
    const res = await fetch(path, { credentials: 'same-origin', ...options });
    let data = null;
    try { data = await res.json(); } catch (_) { /* risposta senza JSON */ }
    return { ok: res.ok, status: res.status, data };
  }

  function showInfo(i) {
    $('info').textContent = i.channels + ' canali, ' + i.groups + ' gruppi, ' + Math.round(i.bytes / 1024) +
      ' KB. Ultima modifica: ' + new Date(i.updatedAt).toLocaleString('it-IT');
  }

  function showSources(cfg) {
    $('maxSources').textContent = cfg.max || 20;
    if (document.activeElement !== $('sources')) $('sources').value = (cfg.urls || []).join('\n');
    const list = $('srcStatus');
    list.replaceChildren();
    (cfg.status || []).forEach((st, i) => {
      const li = document.createElement('li');
      const when = st.at ? ' · ' + new Date(st.at).toLocaleString('it-IT') : '';
      let text;
      if (st.ok) text = '\u2713 ' + st.channels + ' canali';
      else if (st.fromCache) text = '\u26A0 non raggiungibile (' + st.error + '): uso la copia salvata, ' + st.channels + ' canali';
      else text = '\u2717 ' + (st.error || 'errore');
      li.className = st.ok ? 'ok' : (st.fromCache ? 'warn' : 'bad');
      li.textContent = (i + 1) + '. ' + st.url.slice(0, 90) + ' \u2014 ' + text + when;
      list.appendChild(li);
    });
  }

  async function refresh() {
    const r = await api('/api/status');
    const logged = r.ok;
    $('login').hidden = logged;
    $('panel').hidden = !logged;
    if (logged) {
      showInfo(r.data);
      const src = await api('/api/sources');
      if (src.ok) showSources(src.data);
    }
  }

  async function saveSources(path, body) {
    say('Scarico le liste…');
    $('srcSave').disabled = $('srcRefresh').disabled = true;
    const r = await api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    $('srcSave').disabled = $('srcRefresh').disabled = false;
    if (r.status === 401) { say('Sessione scaduta: accedi di nuovo.', true); return refresh(); }
    if (!r.ok) { say((r.data && r.data.error) || 'Aggiornamento non riuscito.', true); return refresh(); }
    showInfo(r.data);
    showSources(r.data);
    say('Liste aggiornate: ' + r.data.channels + ' canali in totale.');
  }

  $('srcSave').addEventListener('click', () => {
    const urls = $('sources').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (!urls.length) return say('Scrivi almeno un indirizzo.', true);
    saveSources('/api/sources', JSON.stringify({ urls }));
  });
  $('srcRefresh').addEventListener('click', () => saveSources('/api/sources/refresh', ''));

  $('login').addEventListener('submit', async e => {
    e.preventDefault();
    const r = await api('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('password').value }),
    });
    $('password').value = '';
    if (!r.ok) return say((r.data && r.data.error) || 'Accesso non riuscito.', true);
    say('');
    refresh();
  });

  $('file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    $('text').value = await f.text();
    $('fileName').textContent = f.name;
    e.target.value = '';
  });

  async function replaceFromUrl(url) {
    say('Scarico la playlist…');
    $('urlBtn').disabled = true;
    const r = await api('/api/playlist-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    $('urlBtn').disabled = false;
    if (r.status === 401) { say('Sessione scaduta: accedi di nuovo.', true); return refresh(); }
    if (!r.ok) return say((r.data && r.data.error) || 'Download non riuscito.', true);
    showInfo(r.data);
    $('urlInput').value = '';
    say('Playlist scaricata e sostituita. La pagina dei canali mostra gia\' la nuova lista.');
  }

  $('urlBtn').addEventListener('click', () => {
    const url = $('urlInput').value.trim();
    if (!url) return say('Scrivi l\'indirizzo della playlist.', true);
    replaceFromUrl(url);
  });
  $('urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('urlBtn').click(); });

  $('save').addEventListener('click', async () => {
    const text = $('text').value;
    if (!text.trim()) return say('Scegli un file o incolla il testo della playlist.', true);
    if (/^https?:\/\/\S+$/i.test(text.trim())) { $('text').value = ''; return replaceFromUrl(text.trim()); }   // incollato un indirizzo invece del testo
    const r = await api('/api/playlist', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: text });
    if (r.status === 401) { say('Sessione scaduta: accedi di nuovo.', true); return refresh(); }
    if (!r.ok) return say((r.data && r.data.error) || 'Salvataggio non riuscito.', true);
    showInfo(r.data);
    $('text').value = '';
    $('fileName').textContent = '';
    say('Playlist sostituita. La pagina dei canali mostra gia\' la nuova lista.');
  });

  $('logout').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); say(''); refresh(); });

  refresh();
})();
