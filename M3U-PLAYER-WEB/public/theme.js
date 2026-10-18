(function () {
  'use strict';
  var THEMES = ['notte', 'televideo', 'vetrina', 'carta', 'aurora'];
  var theme = 'aurora';                                      // aspetto predefinito
  // Chiave "v2": ignora le scelte fatte durante le prove, cosi' all'inizio si parte da Aurora.
  try { var saved = localStorage.getItem('m3u-player:theme-v2'); if (THEMES.indexOf(saved) >= 0) theme = saved; } catch (_) { /* storage non disponibile */ }
  document.documentElement.setAttribute('data-theme', theme);
})();
