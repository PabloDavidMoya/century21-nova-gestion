/* Century 21 Nova — comportamiento compartido del panel (sidebar móvil, logout demo) */
document.addEventListener('DOMContentLoaded', function () {
  var sidebar = document.querySelector('.sidebar');
  var backdrop = document.querySelector('.sidebar-backdrop');
  var menuBtn = document.querySelector('[data-menu-toggle]');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('open');
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', function () {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }
  document.querySelectorAll('[data-logout]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      try { sessionStorage.removeItem('c21-rol'); sessionStorage.removeItem('c21-asesor'); } catch (err) {}
      var depth = b.getAttribute('data-depth') || '0';
      window.location.href = (depth === '1' ? '../' : './') + 'index.html';
    });
  });
});
