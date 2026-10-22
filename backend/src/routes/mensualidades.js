const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const anio = Number(req.query.anio) || new Date().getFullYear();
  const { rows } = await pool.query(
    `SELECT m.*, a.nombre AS asesor_nombre FROM mensualidades m
     JOIN asesores a ON a.id = m.asesor_id
     WHERE m.anio = $1
     ORDER BY a.nombre, m.mes`,
    [anio]
  );
  res.json(rows);
});

// Crea las filas pendientes (si no existen) para todos los asesores activos en un mes dado.
router.post('/generar', requireAuth, requireAdmin, async (req, res) => {
  const { anio, mes, monto } = req.body;
  if (!anio || !mes) return res.status(400).json({ error: 'Faltan anio o mes' });
  const { rows: asesores } = await pool.query(`SELECT id FROM asesores WHERE estado = 'Activo'`);
  for (const a of asesores) {
    await pool.query(
      `INSERT INTO mensualidades (asesor_id, anio, mes, monto)
       VALUES ($1,$2,$3,$4) ON CONFLICT (asesor_id, anio, mes) DO NOTHING`,
      [a.id, anio, mes, monto || 200]
    );
  }
  const { rows } = await pool.query(
    `SELECT m.*, a.nombre AS asesor_nombre FROM mensualidades m
     JOIN asesores a ON a.id = m.asesor_id
     WHERE m.anio = $1 AND m.mes = $2 ORDER BY a.nombre`,
    [anio, mes]
  );
  res.status(201).json(rows);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { pagado, fechaPago, monto } = req.body;
  const { rows } = await pool.query(
    `UPDATE mensualidades SET
       pagado = COALESCE($1, pagado),
       fecha_pago = COALESCE($2, fecha_pago),
       monto = COALESCE($3, monto)
     WHERE id = $4 RETURNING *`,
    [pagado, fechaPago || null, monto, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Mensualidad no encontrada' });
  res.json(rows[0]);
});

module.exports = router;
