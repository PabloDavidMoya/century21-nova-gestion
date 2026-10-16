const jwt = require('jsonwebtoken');

const STAFF_ROLES = ['broker', 'gerente', 'administracion'];

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

/* Broker, Gerente y Administración: hoy con el mismo nivel de acceso.
   Si el día de mañana hay que separar permisos entre ellos, es acá. */
function requireAdmin(req, res, next) {
  if (!STAFF_ROLES.includes(req.user.rol)) return res.status(403).json({ error: 'Solo personal de administración' });
  next();
}

/* Solo el dueño/a de la cuenta puede crear otros logins de staff. */
function requireBroker(req, res, next) {
  if (req.user.rol !== 'broker') return res.status(403).json({ error: 'Solo el Broker puede hacer esto' });
  next();
}

module.exports = { requireAuth, requireAdmin, requireBroker, STAFF_ROLES };
