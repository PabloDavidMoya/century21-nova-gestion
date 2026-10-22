const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireBroker, STAFF_ROLES } = require('../middleware/auth');

router.get('/', requireAuth, requireBroker, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.rol, u.nombre, u.activo, u.asesor_id, a.nombre AS asesor_nombre, u.created_at
     FROM usuarios u LEFT JOIN asesores a ON a.id = u.asesor_id
     ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

router.post('/', requireAuth, requireBroker, async (req, res) => {
  const { email, password, rol, nombre, asesorId } = req.body;
  if (!email || !password || !rol) return res.status(400).json({ error: 'Faltan email, password o rol' });

  if (STAFF_ROLES.includes(rol) && req.user.rol !== 'broker') {
    return res.status(403).json({ error: 'Solo un Broker puede crear logins de Broker, Gerente o Administración' });
  }
  if (rol === 'asesor' && !asesorId) {
    return res.status(400).json({ error: 'Para rol asesor hay que indicar a qué asesor corresponde (asesorId)' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña tiene que tener al menos 8 caracteres' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (email, password_hash, rol, nombre, asesor_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, rol, nombre, asesor_id, activo`,
      [email, hash, rol, STAFF_ROLES.includes(rol) ? nombre : null, rol === 'asesor' ? asesorId : null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    throw e;
  }
});

router.patch('/:id', requireAuth, requireBroker, async (req, res) => {
  const { activo, password } = req.body;
  if (req.params.id === req.user.sub && activo === false) {
    return res.status(400).json({ error: 'No podés desactivar tu propia cuenta' });
  }
  const fields = [];
  const values = [];
  let i = 1;

  if (activo !== undefined) { fields.push(`activo = $${i++}`); values.push(activo); }
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña tiene que tener al menos 8 caracteres' });
    fields.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(password, 10));
  }
  if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' });

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, rol, nombre, activo`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireBroker, async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'No podés eliminar tu propia cuenta' });
  }
  const { rows: brokerCheck } = await pool.query(
    `SELECT rol FROM usuarios WHERE id = $1`, [req.params.id]
  );
  if (brokerCheck[0] && brokerCheck[0].rol === 'broker') {
    const { rows: countRows } = await pool.query(`SELECT count(*) FROM usuarios WHERE rol = 'broker' AND activo = true`);
    if (Number(countRows[0].count) <= 1) {
      return res.status(400).json({ error: 'No podés eliminar el último Broker activo — quedaría nadie con acceso total' });
    }
  }
  await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
