/* Century 21 Nova — cliente chico para la API real (backend/).
   Cambiar API_BASE cuando el backend esté desplegado en Render. */
(function () {
  var API_BASE = 'http://localhost:3000';

  function getToken() {
    try { return sessionStorage.getItem('c21-api-token'); } catch (e) { return null; }
  }
  function setSession(token, usuario) {
    try {
      sessionStorage.setItem('c21-api-token', token);
      sessionStorage.setItem('c21-api-usuario', JSON.stringify(usuario));
    } catch (e) {}
  }
  function getUsuario() {
    try { return JSON.parse(sessionStorage.getItem('c21-api-usuario') || 'null'); } catch (e) { return null; }
  }
  function clearSession() {
    try { sessionStorage.removeItem('c21-api-token'); sessionStorage.removeItem('c21-api-usuario'); } catch (e) {}
  }

  async function login(email, password) {
    var r = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    });
    var body = await r.json();
    if (!r.ok) throw new Error(body.error || 'No se pudo iniciar sesión');
    setSession(body.token, body.usuario);
    return body.usuario;
  }

  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    var r = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
    if (r.status === 204) return null;
    var body = await r.json().catch(function () { return null; });
    if (!r.ok) throw new Error((body && body.error) || ('Error ' + r.status));
    return body;
  }

  window.C21Api = { login: login, api: api, getToken: getToken, getUsuario: getUsuario, clearSession: clearSession, API_BASE: API_BASE };
})();
