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

  async function refresh() {
    const r = await api('/api/status');
    const logged = r.ok;
    $('login').hidden = logged;
    $('panel').hidden = !logged;
    if (logged) showInfo(r.data);
  }

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

  $('save').addEventListener('click', async () => {
    const text = $('text').value;
    if (!text.trim()) return say('Scegli un file o incolla il testo della playlist.', true);
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
