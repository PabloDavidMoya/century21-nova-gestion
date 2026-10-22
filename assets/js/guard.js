/* Century 21 Nova — guardia de sesión real para páginas protegidas.
   Reemplaza los login-gate sueltos de cada página: el login único vive en
   index.html (o ../index.html desde /admin y /asesor). Cada página llama
   C21Guard.requireRole([...roles], depth) al cargar: si no hay sesión válida
   o el rol no está permitido, redirige al login y no muestra nada. */
(function () {
  var ROL_LABELS = {
    broker: 'Broker · acceso completo',
    gerente: 'Gerente',
    administracion: 'Administración',
    asesor: 'Asesor/a',
  };

  function fillSidebar(usuario) {
    var av = document.querySelector('.sidebar-user .av');
    var who = document.querySelector('.sidebar-user .who');
    if (av) av.textContent = (usuario.nombre || usuario.email || '?').charAt(0).toUpperCase();
    if (who) {
      var b = who.querySelector('b'), span = who.querySelector('span');
      if (b) b.textContent = usuario.nombre || usuario.email;
      if (span) span.textContent = ROL_LABELS[usuario.rol] || usuario.rol;
    }
    // Solo el Broker administra logins de Broker/Gerente/Administración.
    if (usuario.rol !== 'broker') {
      document.querySelectorAll('a.nav-link[href="usuarios.html"]').forEach(function (a) {
        var group = a.closest('.nav-group');
        if (group) group.style.display = 'none';
      });
    }
  }

  function requireRole(roles, depth) {
    var root = depth === 1 ? '../' : './';
    var token = window.C21Api && window.C21Api.getToken();
    var usuario = window.C21Api && window.C21Api.getUsuario();
    if (!token || !usuario || roles.indexOf(usuario.rol) === -1) {
      if (window.C21Api) window.C21Api.clearSession();
      window.location.href = root + 'index.html';
      return null;
    }
    fillSidebar(usuario);
    return usuario;
  }

  window.C21Guard = { requireRole: requireRole };
})();
