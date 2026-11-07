const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, STAFF_ROLES } = require('../middleware/auth');

/* Un asesor solo ve su propia actividad. Staff ve toda, con filtro opcional
   por asesorId. */
router.get('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (!STAFF_ROLES.includes(rol) && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const { asesorId } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (rol === 'asesor') { cond.push(`asesor_id = $${i++}`); vals.push(req.user.asesorId); }
  else if (asesorId) { cond.push(`asesor_id = $${i++}`); vals.push(asesorId); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT * FROM actividad_asesores ${where} ORDER BY fecha DESC`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  const { fecha, tipo, cantidad, notas } = req.body;
  let asesorId;
  if (rol === 'asesor') {
    asesorId = req.user.asesorId;
  } else {
    if (!STAFF_ROLES.includes(rol)) return res.status(403).json({ error: 'No autorizado' });
    asesorId = req.body.asesorId;
    if (!asesorId) return res.status(400).json({ error: 'Falta asesorId' });
  }
  if (!fecha || !tipo) return res.status(400).json({ error: 'Faltan fecha o tipo' });
  const { rows } = await pool.query(
    `INSERT INTO actividad_asesores (asesor_id, fecha, tipo, cantidad, notas)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [asesorId, fecha, tipo, cantidad || null, notas || null]
  );
  res.status(201).json(rows[0]);
});

// Devuelve true si puede seguir (es dueño del registro o es staff); si no,
// ya envió la respuesta de error (404/403) y el caller debe retornar.
async function puedeOperar(req, res) {
  const rol = req.user.rol;
  if (STAFF_ROLES.includes(rol)) return true;
  const { rows } = await pool.query('SELECT asesor_id FROM actividad_asesores WHERE id = $1', [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: 'Registro no encontrado' }); return false; }
  if (rows[0].asesor_id !== req.user.asesorId) { res.status(403).json({ error: 'No autorizado' }); return false; }
  return true;
}

router.patch('/:id', requireAuth, async (req, res) => {
  if (!(await puedeOperar(req, res))) return;
  const { fecha, tipo, cantidad, notas } = req.body;
  const { rows } = await pool.query(
    `UPDATE actividad_asesores SET
       fecha = COALESCE($1, fecha),
       tipo = COALESCE($2, tipo),
       cantidad = COALESCE($3, cantidad),
       notas = COALESCE($4, notas)
     WHERE id = $5 RETURNING *`,
    [fecha, tipo, cantidad, notas, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!(await puedeOperar(req, res))) return;
  await pool.query('DELETE FROM actividad_asesores WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
