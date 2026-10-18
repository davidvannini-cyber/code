(function () {
  'use strict';
  const msg = document.getElementById('msg');

  async function submit(password) {
    const res = await fetch('/api/viewer-login', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { location.replace('./'); return; }
    let data = null;
    try { data = await res.json(); } catch (_) { /* senza JSON */ }
    msg.textContent = (data && data.error) || 'Accesso non riuscito.';
    msg.classList.add('error');
  }

  document.getElementById('login').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('password');
    const password = input.value;
    input.value = '';
    submit(password);
  });

  // Link con password: https://tuosito/#k=PASSWORD. Quello che segue il # non viene mai inviato al server
  // (niente log, niente Referer). Lo tolgo subito dalla barra degli indirizzi e dalla cronologia.
  const m = /^#k=(.+)$/.exec(location.hash);
  if (m) {
    history.replaceState(null, '', location.pathname);
    let key = '';
    try { key = decodeURIComponent(m[1]); } catch (_) { /* link malformato */ }
    if (key) submit(key);
  }
})();
