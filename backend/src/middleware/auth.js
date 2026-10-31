const jwt = require('jsonwebtoken');

const STAFF_ROLES = ['broker', 'gerente', 'administracion'];

/* Broker y Gerente: acceso total al sistema. Administración queda afuera
   de esto a propósito — su acceso se limita a Finanzas (ver requireAdmin). */
const FULL_ACCESS_ROLES = ['broker', 'gerente'];

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta token de autenticación' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido o vencido' });
  }
}

/* Broker, Gerente y Administración: nivel "staff" — hoy es lo que da acceso
   a Finanzas (facturas/mensualidades). */
function requireAdmin(req, res, next) {
  if (!STAFF_ROLES.includes(req.user.rol)) return res.status(403).json({ error: 'Solo personal de administración' });
  next();
}

/* Broker y Gerente: acceso total (Asesores, Cierres, Reservas, Calendario,
   Usuarios, etc). Administración y Asesor no entran acá. */
function requireFullAccess(req, res, next) {
  if (!FULL_ACCESS_ROLES.includes(req.user.rol)) return res.status(403).json({ error: 'No tenés acceso a esta sección' });
  next();
}

/* Solo el dueño/a de la cuenta puede crear otros logins de staff (Broker,
   Gerente o Administración) — ver POST /api/usuarios. */
function requireBroker(req, res, next) {
  if (req.user.rol !== 'broker') return res.status(403).json({ error: 'Solo el Broker puede hacer esto' });
  next();
}

module.exports = { requireAuth, requireAdmin, requireFullAccess, requireBroker, STAFF_ROLES, FULL_ACCESS_ROLES };
