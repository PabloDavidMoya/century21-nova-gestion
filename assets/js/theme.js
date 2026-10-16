/* Century 21 Nova — tema claro/oscuro, persistido por navegador (no viaja al servidor) */
(function () {
  function getStored() {
    try { return localStorage.getItem('c21-theme'); } catch (e) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem('c21-theme', v); } catch (e) { /* modo privado: se pierde al cerrar, no rompe nada */ }
  }
  function current() {
    return document.documentElement.getAttribute('data-theme')
      || getStored()
      || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setStored(theme);
  }
  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark');
  }
  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });
  });
  window.C21Theme = { toggle: toggle, apply: apply, current: current };
})();
