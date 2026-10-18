(function () {
  'use strict';
  const msg = document.getElementById('msg');
  document.getElementById('login').addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('password');
    const res = await fetch('/api/viewer-login', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input.value }),
    });
    input.value = '';
    if (res.ok) { location.href = './'; return; }
    let data = null;
    try { data = await res.json(); } catch (_) { /* senza JSON */ }
    msg.textContent = (data && data.error) || 'Accesso non riuscito.';
    msg.classList.add('error');
  });
})();
