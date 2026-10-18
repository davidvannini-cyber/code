(function () {
  'use strict';
  var THEMES = ['notte', 'televideo', 'vetrina', 'carta', 'aurora'];
  var theme = 'notte';
  try { var saved = localStorage.getItem('m3u-player:theme'); if (THEMES.indexOf(saved) >= 0) theme = saved; } catch (_) { /* storage non disponibile */ }
  document.documentElement.setAttribute('data-theme', theme);
})();
